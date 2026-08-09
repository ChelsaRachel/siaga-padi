"""Recommendation engine — references in, safety-checked two-view card out.

The pipeline of FR-007, in order:

    retrieve approved references
      → too few?  -> `insufficient_evidence`, AI never called
      → enough?   -> ONE bounded provider call
                     -> safety checker
                        -> pass -> `ai_engine`
                        -> fail (after limited retries) -> rule fallback seam

Three properties this module exists to guarantee:

- **The AI is never the source of knowledge.** It only rephrases chunks a
  domain reviewer already approved. Below `MIN_REFERENCES_FOR_AI` the provider
  is not called at all — the card says "bukti tidak cukup" and the case goes to
  a human.
- **Nothing identifying leaves the process.** `_build_user_prompt` assembles the
  analysis summary, the answers and the reference text. The case owner's name,
  phone, coordinates and photos are not in scope of that function and cannot be
  added to the request by accident.
- **Every stored card is safety-checked**, the fallback one included. A card
  that cannot pass the checker degrades to `insufficient_evidence` rather than
  reaching a farmer unchecked.

The rule-fallback branch is the SEAM for Sprint 07, which replaces the minimal
template with the full offline rule set.
"""
import json
from typing import Optional

from loguru import logger

from dto.kb import KbRetrievalQueryDTO
from dto.siaga_triage import recommendation_from_row
from exceptions.siaga_exceptions import SiagaNotFoundError, SiagaValidationError
from models.siaga_case import (
    STATUS_AUTO_TRIAGE_READY,
    STATUS_GENERATING_RECOMMENDATION,
    STATUS_NEEDS_REVIEW,
    display_stage_for,
)
from models.siaga_triage import (
    ABSTAIN_KONFLIK,
    ABSTAIN_TIDAK_YAKIN,
    BAND_RENDAH,
    LABEL_DISPLAY,
    MIN_REFERENCES_FOR_AI,
    ORIGIN_AI_ENGINE,
    ORIGIN_INSUFFICIENT_EVIDENCE,
    ORIGIN_RULE_FALLBACK,
    QUESTION_BANK_VERSION,
    disease_tags_for,
)
from service.kb_retrieval import CHANNEL_RUNTIME, KbRetrievalService
from service.llm_provider import (
    LlmProviderError,
    LlmProviderNotConfigured,
    resolve_llm_client,
)
from service.safety_checker import check_recommendation, collect_ref_codes
from service.siaga_case_support import new_id, now_iso, resolve_caller_profile
from service.triage_support import (
    ANALYSIS_NOT_FOUND_MESSAGE,
    RECOMMENDATION_NOT_FOUND_MESSAGE,
    TriageRepository,
    TriageRepositoryProtocol,
    advance_case,
    get_actionable_case,
    get_visible_case,
    mark_needs_review,
)

RETRIEVAL_LIMIT = 8
MAX_PROVIDER_ATTEMPTS = 2
MAX_FALLBACK_ACTIONS = 3
SNIPPET_MAX_CHARS = 220

REVIEW_REASON_NO_EVIDENCE = "bukti_rujukan_kurang"
REVIEW_REASON_FALLBACK = "mode_terbatas"
REVIEW_REASON_LOW_BAND = "keyakinan_rendah"

NOT_READY_MESSAGE = "Jawab pertanyaan lanjutan terlebih dahulu."
READY_EVENT_NOTE = "Rekomendasi siap"
REVIEW_EVENT_NOTE = "Rekomendasi siap — menunggu tinjauan penyuluh"

# `cases.growth_stage` (FRD, English) -> KB `phase_tags` (Indonesian, 0012).
GROWTH_STAGE_TO_PHASE: dict[str, Optional[str]] = {
    "SEEDLING": "persemaian",
    "VEGETATIVE": "vegetatif",
    "REPRODUCTIVE": "generatif",
    "RIPENING": "pemasakan",
    "UNKNOWN": None,
}

ESCALATION_DEFAULT = (
    "Hubungi penyuluh wilayah Anda bila gejala meluas atau tanaman memburuk "
    "dalam beberapa hari ke depan."
)
INSUFFICIENT_INDICATION = (
    "Bukti rujukan yang tersedia belum cukup untuk menyusun saran yang aman."
)
INSUFFICIENT_ESCALATION = (
    "Kasus Anda diteruskan ke penyuluh. Sementara menunggu, amati tanaman dan "
    "jangan melakukan tindakan berisiko."
)
UNCERTAIN_SUMMARY = (
    "Sistem belum yakin dengan hasil foto. Perlakukan saran ini sebagai "
    "tindakan aman umum, bukan penanganan penyakit tertentu."
)

SYSTEM_PROMPT = """Anda menyusun kartu saran untuk petani padi di Indonesia.

ATURAN MUTLAK:
1. Gunakan HANYA isi rujukan yang diberikan. Dilarang menambah pengetahuan lain.
2. Setiap butir saran WAJIB mencantumkan minimal satu refCode dari daftar rujukan.
3. DILARANG menyebut dosis, takaran, konsentrasi, atau merek/nama dagang produk.
4. DILARANG menyatakan diagnosis final. Ini indikasi awal.
5. Bahasa Indonesia sederhana, kalimat pendek, tanpa jargon, untuk bagian petani.
6. Bila keyakinan rendah atau sistem tidak yakin, tekankan ketidakpastian dan
   anjuran menghubungi penyuluh — bukan saran yang terdengar pasti.

Jawab HANYA dengan objek JSON berbentuk:
{
  "farmerView": {
    "indikasi": "kalimat singkat",
    "lakukan":  [{"text": "...", "refCodes": ["RUJ-..."]}],
    "pantau":   [{"text": "...", "refCodes": ["RUJ-..."]}],
    "hindari":  [{"text": "...", "refCodes": ["RUJ-..."]}],
    "eskalasi": "kapan menghubungi penyuluh"
  },
  "technicalView": {
    "ringkasan": "ringkasan teknis untuk penyuluh",
    "ketidakpastian": "apa yang belum pasti dan mengapa",
    "kutipan": [{"text": "...", "refCodes": ["RUJ-..."]}],
    "penanda": ["catatan aturan bila ada"]
  }
}"""


class RecommendationService:
    """Composes and reads the final triage card of a case."""

    def __init__(
        self,
        repo: Optional[TriageRepositoryProtocol] = None,
        retrieval: Optional[KbRetrievalService] = None,
        llm_client=None,
    ) -> None:
        self._repo = repo
        self._retrieval = retrieval
        self._llm_client = llm_client

    @property
    def repo(self) -> TriageRepositoryProtocol:
        if self._repo is None:
            self._repo = TriageRepository()
        return self._repo

    @property
    def retrieval(self) -> KbRetrievalService:
        if self._retrieval is None:
            self._retrieval = KbRetrievalService()
        return self._retrieval

    @property
    def llm_client(self):
        if self._llm_client is None:
            self._llm_client = resolve_llm_client()
        return self._llm_client

    # ---- compose ---------------------------------------------------------------

    def compose(self, user_id: str, case_id: str) -> dict:
        """Build the card, or return the one this case already has."""
        caller = resolve_caller_profile(self.repo, user_id)
        case = get_actionable_case(self.repo, caller, case_id)

        existing = self.repo.get_recommendation_by_case(case_id)
        if existing is not None:
            logger.info(f"recommendation replayed: case={case_id}")
            return self._out(existing, case, caller["role"])

        analysis = self.repo.get_analysis_by_case(case_id)
        if analysis is None:
            raise SiagaNotFoundError(ANALYSIS_NOT_FOUND_MESSAGE)
        if case["status"] != STATUS_GENERATING_RECOMMENDATION:
            raise SiagaValidationError(NOT_READY_MESSAGE)

        hits = self._retrieve(case, analysis)
        payload, origin, review_reason = self._build_card(case, analysis, hits)

        row = self._persist(case["id"], analysis, payload, origin)
        case = self._finalize_case(case, caller, review_reason)
        return self._out(row, case, caller["role"])

    def _retrieve(self, case: dict, analysis: dict) -> list[dict]:
        """Approved chunks for the top candidate + phase. Audience unfiltered.

        Both audiences are retrieved on purpose: the farmer card needs the
        narratable ones and the penyuluh panel needs the technical ones. The
        `narratable` flag on each hit — not the query — decides which text may
        be spoken to a farmer.
        """
        tags = disease_tags_for(list(analysis.get("candidates") or []))
        query = KbRetrievalQueryDTO(
            disease=tags[0] if tags else None,
            phase=GROWTH_STAGE_TO_PHASE.get(case.get("growth_stage") or "UNKNOWN"),
            audience=None,
            actionType=None,
            limit=RETRIEVAL_LIMIT,
        )
        result = self.retrieval.retrieve(query, CHANNEL_RUNTIME, None)
        return list(result.get("hits") or [])

    def _build_card(
        self, case: dict, analysis: dict, hits: list[dict]
    ) -> tuple[dict, str, Optional[str]]:
        """Return `(payload, origin, review_reason)` for the case."""
        if len(hits) < MIN_REFERENCES_FOR_AI:
            logger.info(f"insufficient evidence: case={case['id']} refs={len(hits)}")
            return (
                self._insufficient_payload(),
                ORIGIN_INSUFFICIENT_EVIDENCE,
                REVIEW_REASON_NO_EVIDENCE,
            )

        allowed = {hit["refCode"] for hit in hits}
        narratable = {hit["refCode"] for hit in hits if hit.get("narratable")}

        payload = self._call_provider(analysis, case, hits, allowed, narratable)
        if payload is not None:
            return payload, ORIGIN_AI_ENGINE, self._band_review_reason(analysis)

        # Sprint 07 replaces this minimal template with the full rule set.
        fallback = self._fallback_payload(analysis, hits)
        verdict = check_recommendation(fallback, allowed, narratable)
        if verdict.is_safe:
            logger.warning(f"recommendation fell back to rules: case={case['id']}")
            return fallback, ORIGIN_RULE_FALLBACK, REVIEW_REASON_FALLBACK
        logger.error(
            f"fallback card unsafe, degrading to insufficient evidence: "
            f"case={case['id']} violations={verdict.violations}"
        )
        return (
            self._insufficient_payload(),
            ORIGIN_INSUFFICIENT_EVIDENCE,
            REVIEW_REASON_NO_EVIDENCE,
        )

    def _call_provider(
        self,
        analysis: dict,
        case: dict,
        hits: list[dict],
        allowed: set,
        narratable: set,
    ) -> Optional[dict]:
        """One bounded call, retried only on malformed or unsafe output."""
        user_prompt = self._build_user_prompt(case, analysis, hits)
        for attempt in range(1, MAX_PROVIDER_ATTEMPTS + 1):
            try:
                payload = self.llm_client.complete_json(SYSTEM_PROMPT, user_prompt)
            except LlmProviderNotConfigured:
                # A missing key is a DEPLOYMENT error, not a runtime outage.
                # Degrading to the rule template here would hide a broken
                # install behind permanently "limited mode" cards, so it
                # propagates instead of being retried or swallowed.
                logger.error("recommendation aborted: language provider unconfigured")
                raise
            except LlmProviderError as error:
                logger.warning(f"provider attempt {attempt} failed: {error}")
                continue
            verdict = check_recommendation(payload, allowed, narratable)
            if verdict.is_safe:
                return payload
            logger.warning(
                f"provider attempt {attempt} rejected by safety checker: "
                f"{verdict.violations}"
            )
        return None

    def _build_user_prompt(self, case: dict, analysis: dict, hits: list[dict]) -> str:
        """Analysis summary + answers + references. Nothing identifying.

        Deliberately built from three explicit blocks rather than serialising a
        case row: there is no field here that could carry a name, a phone
        number or a coordinate into the provider request.
        """
        candidates = list(analysis.get("candidates") or [])
        summary = {
            "indikasiTeratas": [
                {
                    "label": LABEL_DISPLAY.get(item["label"], item["label"]),
                    "skor": item.get("calibrated_score"),
                }
                for item in candidates
            ],
            "bandKeyakinan": analysis.get("confidence_band"),
            "statusAbstain": analysis.get("abstain_status"),
            "fasePertumbuhan": case.get("growth_stage"),
            "fotoKualitasAmbang": bool(analysis.get("quality_penalty")),
        }
        answers = self._answer_context(case["id"])
        references = [
            {
                "refCode": hit["refCode"],
                "isi": hit.get("content") or "",
                "bolehDinarasikanKePetani": bool(hit.get("narratable")),
                "audiens": hit.get("audience"),
            }
            for hit in hits
        ]
        return (
            "HASIL ANALISIS:\n"
            f"{json.dumps(summary, ensure_ascii=False)}\n\n"
            "JAWABAN KUESIONER:\n"
            f"{json.dumps(answers, ensure_ascii=False)}\n\n"
            "RUJUKAN TERVALIDASI (satu-satunya sumber yang boleh dipakai):\n"
            f"{json.dumps(references, ensure_ascii=False)}\n\n"
            "Rujukan dengan bolehDinarasikanKePetani=false TIDAK boleh dikutip "
            "di farmerView; gunakan hanya di technicalView."
        )

    def _answer_context(self, case_id: str) -> list[dict]:
        """Question text + answer, without who filled it (not the AI's business)."""
        questions = {row["id"]: row for row in self.repo.list_approved_questions()}
        context = []
        for row in self.repo.list_answers(case_id):
            question = questions.get(row["question_id"])
            if question is None:
                continue
            context.append({"pertanyaan": question["text"], "jawaban": row["answer"]})
        return context

    # ---- deterministic payloads --------------------------------------------------

    @staticmethod
    def _insufficient_payload() -> dict:
        """Honest "bukti tidak cukup" card — no invented advice."""
        return {
            "farmerView": {
                "indikasi": INSUFFICIENT_INDICATION,
                "lakukan": [],
                "pantau": [],
                "hindari": [],
                "eskalasi": INSUFFICIENT_ESCALATION,
            },
            "technicalView": {
                "ringkasan": (
                    "Rujukan tervalidasi yang relevan kurang dari batas minimum; "
                    "mesin AI tidak dipanggil."
                ),
                "ketidakpastian": (
                    "Tidak ada dasar rujukan yang cukup untuk menyusun saran."
                ),
                "kutipan": [],
                "penanda": [REVIEW_REASON_NO_EVIDENCE],
            },
        }

    def _fallback_payload(self, analysis: dict, hits: list[dict]) -> dict:
        """Minimal rule card built straight from approved chunks (Sprint 07 seam).

        Each line IS an approved reference snippet, so citation coverage is true
        by construction rather than by asking a model to behave.
        """
        narratable = [hit for hit in hits if hit.get("narratable")][
            :MAX_FALLBACK_ACTIONS
        ]
        candidates = list(analysis.get("candidates") or [])
        is_uncertain = analysis.get("abstain_status") in (
            ABSTAIN_TIDAK_YAKIN,
            ABSTAIN_KONFLIK,
        )
        if is_uncertain or not candidates:
            indication = UNCERTAIN_SUMMARY
        else:
            top = candidates[0]["label"]
            indication = (
                f"Dugaan awal: {LABEL_DISPLAY.get(top, top)}. "
                "Ini indikasi awal, bukan diagnosis final."
            )
        return {
            "farmerView": {
                "indikasi": indication,
                "lakukan": [
                    {
                        "text": _snippet(hit.get("content") or ""),
                        "refCodes": [hit["refCode"]],
                    }
                    for hit in narratable
                ],
                "pantau": [],
                "hindari": [],
                "eskalasi": ESCALATION_DEFAULT,
            },
            "technicalView": {
                "ringkasan": "Mode terbatas: kartu disusun dari templat aturan.",
                "ketidakpastian": (
                    "Layanan AI bahasa tidak menghasilkan keluaran yang lolos "
                    "pemeriksaan keamanan; saran diambil langsung dari rujukan."
                ),
                "kutipan": [
                    {
                        "text": _snippet(hit.get("content") or ""),
                        "refCodes": [hit["refCode"]],
                    }
                    for hit in hits[:MAX_FALLBACK_ACTIONS]
                ],
                "penanda": [REVIEW_REASON_FALLBACK],
            },
        }

    @staticmethod
    def _band_review_reason(analysis: dict) -> Optional[str]:
        """Low confidence still needs a human even when the card is complete."""
        if analysis.get("abstain_status") in (ABSTAIN_TIDAK_YAKIN, ABSTAIN_KONFLIK):
            return REVIEW_REASON_LOW_BAND
        if analysis.get("confidence_band") == BAND_RENDAH:
            return REVIEW_REASON_LOW_BAND
        return None

    # ---- persistence & transitions -----------------------------------------------

    def _persist(
        self, case_id: str, analysis: dict, payload: dict, origin: str
    ) -> dict:
        row = {
            "id": new_id(),
            "case_id": case_id,
            "analysis_result_id": analysis["id"],
            "farmer_view": payload["farmerView"],
            "technical_view": payload["technicalView"],
            "ref_codes": collect_ref_codes(payload),
            "origin": origin,
            "model_version": analysis.get("model_version"),
            "threshold_version": analysis.get("threshold_version"),
            "question_bank_version": QUESTION_BANK_VERSION,
            "provider_version": (
                self.llm_client.provider_version
                if origin == ORIGIN_AI_ENGINE
                else origin
            ),
            "created_at": now_iso(),
        }
        return self.repo.upsert_recommendation(row)

    def _finalize_case(
        self, case: dict, caller: dict, review_reason: Optional[str]
    ) -> dict:
        """Flag review where required, then land on the right terminal stage."""
        needs_review = bool(review_reason) or bool(case.get("needs_human_review"))
        if review_reason:
            case = mark_needs_review(self.repo, case, review_reason)
        target = STATUS_NEEDS_REVIEW if needs_review else STATUS_AUTO_TRIAGE_READY
        note = REVIEW_EVENT_NOTE if needs_review else READY_EVENT_NOTE
        return advance_case(self.repo, case, target, caller["id"], note)

    # ---- read ---------------------------------------------------------------------

    def get_recommendation(self, user_id: str, case_id: str) -> dict:
        """The stored card, role-shaped. 404 while none exists yet."""
        caller = resolve_caller_profile(self.repo, user_id)
        case = get_visible_case(self.repo, caller, case_id)
        row = self.repo.get_recommendation_by_case(case_id)
        if row is None:
            raise SiagaNotFoundError(RECOMMENDATION_NOT_FOUND_MESSAGE)
        return self._out(row, case, caller["role"])

    @staticmethod
    def _out(row: dict, case: dict, role: Optional[str]) -> dict:
        case_view = {**case, "display_stage": display_stage_for(case["status"])}
        return recommendation_from_row(row, case_view, role).model_dump()


def _snippet(content: str) -> str:
    """First sentence of a chunk, trimmed — a card line, not a wall of text."""
    cleaned = " ".join((content or "").split())
    if len(cleaned) <= SNIPPET_MAX_CHARS:
        return cleaned
    cut = cleaned[:SNIPPET_MAX_CHARS]
    boundary = max(cut.rfind(". "), cut.rfind("; "))
    return (cut[: boundary + 1] if boundary > 60 else cut).strip() + "…"
