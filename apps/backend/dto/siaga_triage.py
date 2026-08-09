"""FE-facing camelCase DTOs for triage (Sprint 05 contract
`apps/web/docs/api-spec-triage.md`).

DB rows are snake_case — use the builders below to convert. The rule these
shapes exist to enforce:

**The role split happens HERE, once.** A petani DTO is built without the exact
scores, without the model version and without the evidence maps — they are not
"hidden in the UI", they never leave the process. Every technical field is
`Optional` and stays `None` for a farmer, so a component that forgets to check
the role renders nothing rather than leaking a score.

`technicalView` follows the same rule: the reviewer-facing narrative is only
attached for a technical viewer.
"""
from typing import Optional

from pydantic import BaseModel

from models.siaga_profile import ROLE_ADMIN, ROLE_DOMAIN_REVIEWER, ROLE_PENYULUH
from models.siaga_triage import (
    ABSTAIN_KONFLIK,
    ABSTAIN_TIDAK_YAKIN,
    ABSTAIN_YAKIN,
    BAND_RENDAH,
    LABEL_DISPLAY,
    requires_review,
)

# Roles allowed to see candidates, exact scores, model versions, evidence maps.
TECHNICAL_ROLES = (ROLE_PENYULUH, ROLE_ADMIN, ROLE_DOMAIN_REVIEWER)

DISCLAIMER = "Ini indikasi awal, bukan diagnosis final."
ABSTAIN_COPY = {
    ABSTAIN_TIDAK_YAKIN: (
        "Sistem belum yakin dengan foto ini. Kasus Anda otomatis diteruskan ke "
        "penyuluh untuk diperiksa."
    ),
    ABSTAIN_KONFLIK: (
        "Foto-foto Anda mengarah ke dugaan yang berbeda. Sistem tidak memilih "
        "satu jawaban; penyuluh akan memeriksanya."
    ),
}


def is_technical_viewer(role: Optional[str]) -> bool:
    """Whether this role may receive scores, versions and evidence maps."""
    return role in TECHNICAL_ROLES


class AnalysisCandidateOut(BaseModel):
    """One predicted label. `calibratedScore` is technical-viewer only."""

    label: str
    displayLabel: str
    calibratedScore: Optional[float] = None


class AnalysisResultOut(BaseModel):
    """Contract type `AnalysisResultOut` — the frozen CV verdict of one case."""

    analysisId: str
    caseId: str
    """Petani-facing headline; None while the system abstains."""
    indication: Optional[str] = None
    confidenceBand: str
    abstainStatus: str
    """Honest explanation shown when abstainStatus is not `yakin`."""
    abstainMessage: Optional[str] = None
    requiresReview: bool = False
    disclaimer: str = DISCLAIMER
    """Technical viewers get all candidates; petani gets the headline only."""
    candidates: list[AnalysisCandidateOut] = []
    qualityPenalty: Optional[bool] = None
    modelVersion: Optional[str] = None
    thresholdVersion: Optional[str] = None
    """Reviewer-only per-photo highlight refs (Sprint 06 renders them)."""
    evidenceMaps: Optional[list[dict]] = None
    createdAt: Optional[str] = None


class QuestionOut(BaseModel):
    """Contract type `QuestionOut` — one bank question, one screen."""

    questionId: str
    code: str
    text: str
    illustration: Optional[str] = None
    whyAsked: str
    """The answer already recorded for this case, when there is one."""
    answer: Optional[str] = None


class QuestionSetOut(BaseModel):
    """Contract type `QuestionSetOut` — the ≤5 questions selected for a case."""

    caseId: str
    questions: list[QuestionOut] = []
    totalCount: int = 0
    answeredCount: int = 0
    questionBankVersion: str
    caseStatus: str
    caseDisplayStage: str


class SuggestionOut(BaseModel):
    """One actionable line plus the references that justify it."""

    text: str
    refCodes: list[str] = []


class FarmerViewOut(BaseModel):
    """Contract type `FarmerViewOut` — plain-language card, zero jargon."""

    indikasi: str
    lakukan: list[SuggestionOut] = []
    pantau: list[SuggestionOut] = []
    hindari: list[SuggestionOut] = []
    eskalasi: str


class TechnicalViewOut(BaseModel):
    """Contract type `TechnicalViewOut` — penyuluh panel, technical depth."""

    ringkasan: str
    ketidakpastian: str
    kutipan: list[SuggestionOut] = []
    penanda: list[str] = []


class RecommendationOut(BaseModel):
    """Contract type `RecommendationOut` — the final triage output."""

    recommendationId: str
    caseId: str
    analysisId: str
    origin: str
    farmerView: FarmerViewOut
    """Technical viewers only — None for petani."""
    technicalView: Optional[TechnicalViewOut] = None
    refCodes: list[str] = []
    """Case state the card is rendered against (review-status indicator)."""
    caseStatus: str
    caseDisplayStage: str
    needsHumanReview: bool = False
    urgencyFlag: bool = False
    modelVersion: Optional[str] = None
    thresholdVersion: Optional[str] = None
    questionBankVersion: Optional[str] = None
    providerVersion: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


def analysis_result_from_row(row: dict, role: Optional[str]) -> AnalysisResultOut:
    """Build the role-appropriate analysis DTO from an `analysis_results` row.

    A petani gets the headline, the band and — when the system abstained — an
    honest explanation. Scores, versions and evidence maps are simply not
    constructed for them.
    """
    candidates = list(row.get("candidates") or [])
    abstain_status = row.get("abstain_status") or ABSTAIN_YAKIN
    band = row.get("confidence_band") or BAND_RENDAH
    is_technical = is_technical_viewer(role)
    has_label = abstain_status == ABSTAIN_YAKIN and bool(candidates)

    return AnalysisResultOut(
        analysisId=row["id"],
        caseId=row["case_id"],
        indication=(
            LABEL_DISPLAY.get(candidates[0]["label"], candidates[0]["label"])
            if has_label
            else None
        ),
        confidenceBand=band,
        abstainStatus=abstain_status,
        abstainMessage=ABSTAIN_COPY.get(abstain_status),
        requiresReview=requires_review(abstain_status, band),
        candidates=[
            AnalysisCandidateOut(
                label=candidate["label"],
                displayLabel=LABEL_DISPLAY.get(
                    candidate["label"], candidate["label"]
                ),
                calibratedScore=(
                    candidate.get("calibrated_score") if is_technical else None
                ),
            )
            # A petani never receives the alternative candidates: the card says
            # one thing, and "three maybes" is not a farmer's tool.
            for candidate in (candidates if is_technical else candidates[:1])
        ],
        qualityPenalty=bool(row.get("quality_penalty")) if is_technical else None,
        modelVersion=row.get("model_version") if is_technical else None,
        thresholdVersion=row.get("threshold_version") if is_technical else None,
        evidenceMaps=list(row.get("evidence_maps") or []) if is_technical else None,
        createdAt=row.get("created_at"),
    )


def question_from_row(row: dict, answer: Optional[str] = None) -> QuestionOut:
    """Build the camelCase question DTO from a `question_bank` row."""
    return QuestionOut(
        questionId=row["id"],
        code=row["code"],
        text=row["text"],
        illustration=row.get("illustration"),
        whyAsked=row["why_asked"],
        answer=answer,
    )


def _suggestions_from(raw: Optional[list]) -> list[SuggestionOut]:
    """Coerce a stored jsonb list into typed suggestions, dropping empties."""
    items: list[SuggestionOut] = []
    for entry in raw or []:
        if not isinstance(entry, dict):
            continue
        text = entry.get("text")
        if not text:
            continue
        items.append(
            SuggestionOut(text=text, refCodes=list(entry.get("refCodes") or []))
        )
    return items


def recommendation_from_row(
    row: dict, case_row: dict, role: Optional[str]
) -> RecommendationOut:
    """Build the role-appropriate recommendation DTO.

    `technicalView` is only attached for a technical viewer — a farmer's
    response literally does not carry the reviewer narrative.
    """
    farmer = row.get("farmer_view") or {}
    technical = row.get("technical_view") or {}
    is_technical = is_technical_viewer(role)

    return RecommendationOut(
        recommendationId=row["id"],
        caseId=row["case_id"],
        analysisId=row["analysis_result_id"],
        origin=row["origin"],
        farmerView=FarmerViewOut(
            indikasi=farmer.get("indikasi") or "",
            lakukan=_suggestions_from(farmer.get("lakukan")),
            pantau=_suggestions_from(farmer.get("pantau")),
            hindari=_suggestions_from(farmer.get("hindari")),
            eskalasi=farmer.get("eskalasi") or "",
        ),
        technicalView=(
            TechnicalViewOut(
                ringkasan=technical.get("ringkasan") or "",
                ketidakpastian=technical.get("ketidakpastian") or "",
                kutipan=_suggestions_from(technical.get("kutipan")),
                penanda=list(technical.get("penanda") or []),
            )
            if is_technical
            else None
        ),
        refCodes=list(row.get("ref_codes") or []),
        caseStatus=case_row["status"],
        caseDisplayStage=case_row.get("display_stage") or "",
        needsHumanReview=bool(case_row.get("needs_human_review")),
        urgencyFlag=bool(case_row.get("urgency_flag")),
        modelVersion=row.get("model_version") if is_technical else None,
        thresholdVersion=row.get("threshold_version") if is_technical else None,
        questionBankVersion=(
            row.get("question_bank_version") if is_technical else None
        ),
        providerVersion=row.get("provider_version") if is_technical else None,
        createdAt=row.get("created_at"),
        updatedAt=case_row.get("updated_at"),
    )
