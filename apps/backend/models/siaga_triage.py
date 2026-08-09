"""Row-shape models and the FR-005/006/007 triage vocabulary.

Mirrors `supabase/migrations/0013_triage.sql` (snake_case columns).
FE-facing camelCase DTOs live in `dto/siaga_triage.py`.

Everything here is PURE: calibration, band mapping, the abstain and conflict
rules, question matching, urgency scoring and the forbidden-term scan take
values and return values with no I/O. The pipeline, the questionnaire engine
and the safety checker share ONE implementation (and one set of unit tests)
instead of drifting apart — the same discipline `models/siaga_kb.py` applies to
the knowledge base.

Domain values are the Indonesian vocabulary from brief 03 §5.1, stored as-is.
Case STATUS stays the canonical FRD English vocabulary (`models/siaga_case.py`).
"""
import re
from typing import Optional

from pydantic import BaseModel

# ---- CV labels (brief 03 §1 — the 4 MVP classes) -----------------------------

LABEL_SEHAT = "sehat"
LABEL_BLAS_DAUN = "blas_daun"
LABEL_HAWAR_DAUN_BAKTERI = "hawar_daun_bakteri"
LABEL_BERCAK_COKLAT = "bercak_coklat"

CV_LABELS = (
    LABEL_SEHAT,
    LABEL_BLAS_DAUN,
    LABEL_HAWAR_DAUN_BAKTERI,
    LABEL_BERCAK_COKLAT,
)

# Petani-facing wording. `sehat` is deliberately hedged: the model saying
# "healthy" is still only an indication, never a clean bill of health.
LABEL_DISPLAY: dict[str, str] = {
    LABEL_SEHAT: "Tidak terlihat gejala penyakit",
    LABEL_BLAS_DAUN: "Blas Daun",
    LABEL_HAWAR_DAUN_BAKTERI: "Hawar Daun Bakteri",
    LABEL_BERCAK_COKLAT: "Bercak Cokelat",
}

# CV label -> KB disease tag. Identical strings today (0012 uses the same
# vocabulary), but the mapping is explicit so a model retrained with different
# class names does not silently break retrieval.
LABEL_TO_DISEASE_TAG: dict[str, Optional[str]] = {
    LABEL_SEHAT: None,
    LABEL_BLAS_DAUN: "blas_daun",
    LABEL_HAWAR_DAUN_BAKTERI: "hawar_daun_bakteri",
    LABEL_BERCAK_COKLAT: "bercak_coklat",
}

MAX_CANDIDATES = 3

# ---- confidence bands & abstain (brief 03 §8.1) ------------------------------

BAND_TINGGI = "tinggi"
BAND_SEDANG = "sedang"
BAND_RENDAH = "rendah"
CONFIDENCE_BANDS = (BAND_TINGGI, BAND_SEDANG, BAND_RENDAH)

ABSTAIN_YAKIN = "yakin"
ABSTAIN_TIDAK_YAKIN = "tidak_yakin"
ABSTAIN_KONFLIK = "konflik"
ABSTAIN_STATUSES = (ABSTAIN_YAKIN, ABSTAIN_TIDAK_YAKIN, ABSTAIN_KONFLIK)

# Thresholds come from the seeded config version; Sprint 08 makes them
# admin-editable. The version string is stamped on every stored result so an
# old case can always be explained with the thresholds it actually ran under.
THRESHOLD_VERSION = "ambang-2026-07-v1"

BAND_TINGGI_MIN_SCORE = 0.75
BAND_SEDANG_MIN_SCORE = 0.50
# Below this the model is out of its competence — no forced label.
ABSTAIN_MIN_SCORE = 0.45
# Two photos disagreeing on the top label, both above this, is a real conflict
# rather than one weak photo dragging the other.
CONFLICT_MIN_SCORE = 0.45
# An `ambang` (borderline) photo costs this much calibrated confidence.
QUALITY_PENALTY_FACTOR = 0.90
# Temperature > 1 softens the model's over-confident softmax (Guo et al. 2017).
CALIBRATION_TEMPERATURE = 1.30

# ---- questionnaire (brief 03 §2.2) -------------------------------------------

ANSWER_YA = "ya"
ANSWER_TIDAK = "tidak"
ANSWER_TIDAK_TAHU = "tidak_tahu"
ANSWERS = (ANSWER_YA, ANSWER_TIDAK, ANSWER_TIDAK_TAHU)

MAX_QUESTIONS = 5
QUESTION_BANK_VERSION = "bank-pertanyaan-2026-07-v1"
# Keep in sync with the seed comment in 0013_triage.sql.
URGENCY_FLAG_THRESHOLD = 3

# ---- recommendation origin (brief 03 §5.1 "Asal keluaran") -------------------

ORIGIN_AI_ENGINE = "ai_engine"
ORIGIN_RULE_FALLBACK = "rule_fallback"
ORIGIN_INSUFFICIENT_EVIDENCE = "insufficient_evidence"
ORIGINS = (ORIGIN_AI_ENGINE, ORIGIN_RULE_FALLBACK, ORIGIN_INSUFFICIENT_EVIDENCE)

# Fewer approved references than this and the AI is NOT called at all — the
# engine never invents advice to fill the card (brief 03 §4.3).
MIN_REFERENCES_FOR_AI = 2


# ---- calibration & banding ----------------------------------------------------


def calibrate_score(
    raw_score: float, temperature: float = CALIBRATION_TEMPERATURE
) -> float:
    """Temperature-scale one raw score into a calibrated 0..1 confidence.

    Raw CV softmax is systematically over-confident. Flattening the score with
    a temperature > 1 pulls it toward the middle, which is what makes the band
    boundaries mean what they claim. A perfect 1.0 stays 1.0 and a 0.0 stays
    0.0, so the ordering of candidates is never changed by calibration.
    """
    bounded = min(max(float(raw_score), 0.0), 1.0)
    if temperature <= 0:
        return bounded
    return round(bounded ** temperature, 4)


def band_for_score(score: float) -> str:
    """Map a calibrated score onto the petani-facing confidence band."""
    if score >= BAND_TINGGI_MIN_SCORE:
        return BAND_TINGGI
    if score >= BAND_SEDANG_MIN_SCORE:
        return BAND_SEDANG
    return BAND_RENDAH


def apply_quality_penalty(score: float, has_borderline_photo: bool) -> float:
    """Borderline photos cost confidence — a weak photo is weak evidence."""
    if not has_borderline_photo:
        return score
    return round(score * QUALITY_PENALTY_FACTOR, 4)


def top_candidates(
    scores: dict[str, float], limit: int = MAX_CANDIDATES
) -> list[dict]:
    """Best `limit` labels as `[{label, calibrated_score}]`, strongest first.

    Ties break on label name so the same distribution always produces the same
    stored order — two reviewers reading the same case see the same list.
    """
    ranked = sorted(scores.items(), key=lambda pair: (-pair[1], pair[0]))
    return [
        {"label": label, "calibrated_score": round(score, 4)}
        for label, score in ranked[:limit]
    ]


def resolve_abstain_status(
    candidates: list[dict], per_photo_tops: list[tuple[str, float]]
) -> str:
    """Decide `yakin` / `tidak_yakin` / `konflik` — never force a single label.

    `per_photo_tops` is one `(label, calibrated_score)` per analysed photo.
    Conflict outranks low confidence: two photos confidently disagreeing is a
    different problem from one uncertain photo, and the reviewer must be able
    to tell which one happened.
    """
    confident_labels = {
        label for label, score in per_photo_tops if score >= CONFLICT_MIN_SCORE
    }
    if len(confident_labels) > 1:
        return ABSTAIN_KONFLIK
    if not candidates:
        return ABSTAIN_TIDAK_YAKIN
    if candidates[0]["calibrated_score"] < ABSTAIN_MIN_SCORE:
        return ABSTAIN_TIDAK_YAKIN
    return ABSTAIN_YAKIN


def requires_review(abstain_status: str, band: str) -> bool:
    """Abstain, conflict and anything below `tinggi` need a human (§8.1)."""
    if abstain_status in (ABSTAIN_TIDAK_YAKIN, ABSTAIN_KONFLIK):
        return True
    return band != BAND_TINGGI


def disease_tags_for(candidates: list[dict]) -> list[str]:
    """KB disease tags of the candidate labels, strongest first, `sehat` aside.

    `sehat` maps to no disease, so a healthy-looking case retrieves the general
    (`RUJ-UMUM-*`) guidance instead of nothing at all.
    """
    tags: list[str] = []
    for candidate in candidates:
        tag = LABEL_TO_DISEASE_TAG.get(candidate.get("label"))
        if tag and tag not in tags:
            tags.append(tag)
    return tags


# ---- question selection & urgency ---------------------------------------------


def question_matches(
    trigger_rules: Optional[dict],
    disease_tags: list[str],
    growth_stage: Optional[str],
) -> bool:
    """True when a bank question applies to this case's candidates + phase.

    An absent or empty list means "any" — a question with no disease rule is a
    general one and stays eligible for every case, abstain cases included
    (their context is exactly what the reviewer will need).
    """
    rules = trigger_rules or {}
    diseases = [tag for tag in (rules.get("diseases") or []) if tag]
    if diseases and not any(tag in diseases for tag in disease_tags):
        return False
    phases = [phase for phase in (rules.get("phases") or []) if phase]
    if phases and (growth_stage or "") not in phases:
        return False
    return True


def select_questions(
    questions: list[dict],
    disease_tags: list[str],
    growth_stage: Optional[str],
    limit: int = MAX_QUESTIONS,
) -> list[dict]:
    """The ≤5 approved questions this case should be asked.

    Disease-specific questions come FIRST: with a hard cap of 5, a general
    "does it spread?" must never crowd out the one question that separates
    Blas from Bercak Cokelat. Ordering inside each group is `ordinal`, so the
    selection is reproducible for a given case.
    """
    eligible = [
        row
        for row in questions
        if row.get("approved")
        and question_matches(row.get("trigger_rules"), disease_tags, growth_stage)
    ]

    def sort_key(row: dict) -> tuple:
        rules = row.get("trigger_rules") or {}
        is_general = 1 if not (rules.get("diseases") or []) else 0
        return (is_general, row.get("ordinal") or 0, row.get("code") or "")

    return sorted(eligible, key=sort_key)[:limit]


def urgency_score(answers: list[dict], questions_by_id: dict[str, dict]) -> int:
    """Total urgency weight of the given answers (0 when nothing risky).

    "tidak_tahu" scores nothing by design: not knowing is not a risk signal,
    it only adds an uncertainty note (brief 03 §2.2).
    """
    total = 0
    for row in answers:
        question = questions_by_id.get(row.get("question_id"))
        if question is None:
            continue
        rules = question.get("urgency_rules") or {}
        total += int(rules.get(row.get("answer")) or 0)
    return total


def is_urgent(answers: list[dict], questions_by_id: dict[str, dict]) -> bool:
    """Whether the answer COMBINATION raises review priority (§8.1).

    This never touches the analysis label — it only sets `cases.urgency_flag`.
    """
    return urgency_score(answers, questions_by_id) >= URGENCY_FLAG_THRESHOLD


# ---- safety scan (FR-007) ------------------------------------------------------

# A number followed by a dosing unit — "2 ml/l", "300 g/ha", "1,5 kg per hektar".
# Deliberately the same shape as `models/siaga_kb._DOSAGE_PATTERN`: what the KB
# refuses to narrate is exactly what a recommendation must not contain.
_DOSAGE_PATTERN = re.compile(
    r"\b\d+([.,]\d+)?\s*"
    r"(ml|cc|liter|gram|kg|mg|g|l)\b\s*"
    r"(/|per\s+)?\s*"
    r"(liter|hektar|tangki|petak|ha|m2|l)?",
    re.IGNORECASE,
)
_DOSAGE_KEYWORDS = ("dosis", "takaran", "konsentrasi", "aplikasi per hektar")
_BRAND_MARKERS = ("®", "™", "merek dagang", "nama dagang", "merk dagang")
_BRAND_TOKENS = (
    "score",
    "nativo",
    "filia",
    "amistartop",
    "regent",
    "furadan",
    "virtako",
    "plenum",
)
# Wording that would turn an indication into a verdict. The farmer card is an
# early indication; only a penyuluh diagnoses.
_VERDICT_TOKENS = ("dipastikan", "pasti terkena", "diagnosis final", "sudah pasti")
# ...but the REQUIRED disclaimer is "ini indikasi awal, bukan diagnosis final",
# which contains a verdict token while asserting the opposite. A negated
# occurrence is the safe phrasing, so only unnegated ones count.
_VERDICT_NEGATORS = ("bukan", "belum", "tidak", "tanpa")
# Longest negator + a separator; enough context to see the word before a match.
_NEGATION_LOOKBEHIND = 12

FORBIDDEN_DOSIS = "dosis"
FORBIDDEN_MEREK = "merek"
FORBIDDEN_DIAGNOSIS = "diagnosis_final"


def _normalize(text: str) -> str:
    return (text or "").casefold()


def _contains_word(haystack: str, needle: str) -> bool:
    return re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", haystack) is not None


def find_forbidden_terms(text: str) -> list[str]:
    """Forbidden-content categories present in the text (empty list = clean).

    Returns categories rather than a bool so the safety checker can log WHY it
    blocked an output — a bare rejection is impossible to diagnose later.
    """
    lowered = _normalize(text)
    found: list[str] = []
    has_dosage = any(keyword in lowered for keyword in _DOSAGE_KEYWORDS) or bool(
        _DOSAGE_PATTERN.search(lowered)
    )
    if has_dosage:
        found.append(FORBIDDEN_DOSIS)
    has_brand = any(marker in lowered for marker in _BRAND_MARKERS) or any(
        _contains_word(lowered, token) for token in _BRAND_TOKENS
    )
    if has_brand:
        found.append(FORBIDDEN_MEREK)
    if _asserts_final_diagnosis(lowered):
        found.append(FORBIDDEN_DIAGNOSIS)
    return found


def _asserts_final_diagnosis(lowered: str) -> bool:
    """True only when a verdict phrase is used as a CLAIM, not as a denial.

    "bukan diagnosis final" is the disclaimer the cards are required to carry,
    so a plain substring match would block the very wording FR-007 mandates.
    An occurrence counts only when no negator precedes it.
    """
    for token in _VERDICT_TOKENS:
        start = lowered.find(token)
        while start != -1:
            prefix = lowered[max(0, start - _NEGATION_LOOKBEHIND) : start]
            if not any(negator in prefix for negator in _VERDICT_NEGATORS):
                return True
            start = lowered.find(token, start + 1)
    return False


# ---- row models ----------------------------------------------------------------


class AnalysisResultModel(BaseModel):
    """One row of `analysis_results` — frozen once written."""

    id: str
    case_id: str
    candidates: list[dict] = []
    confidence_band: str = BAND_RENDAH
    abstain_status: str = ABSTAIN_YAKIN
    quality_penalty: bool = False
    model_version: str
    threshold_version: str = THRESHOLD_VERSION
    evidence_maps: list[dict] = []
    created_at: Optional[str] = None


class QuestionBankModel(BaseModel):
    """One row of `question_bank` — ONE version of one approved question."""

    id: str
    code: str
    text: str
    illustration: Optional[str] = None
    why_asked: str
    trigger_rules: dict = {}
    urgency_rules: dict = {}
    ordinal: int = 0
    version: int = 1
    approved: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CaseAnswerModel(BaseModel):
    """One row of `case_answers`."""

    id: str
    case_id: str
    question_id: str
    answer: str
    answered_by_profile_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class RecommendationModel(BaseModel):
    """One row of `recommendations` — the two-view output for one analysis."""

    id: str
    case_id: str
    analysis_result_id: str
    farmer_view: dict = {}
    technical_view: dict = {}
    ref_codes: list[str] = []
    origin: str = ORIGIN_INSUFFICIENT_EVIDENCE
    model_version: Optional[str] = None
    threshold_version: Optional[str] = None
    question_bank_version: Optional[str] = None
    provider_version: Optional[str] = None
    created_at: Optional[str] = None
