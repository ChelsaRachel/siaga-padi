"""Triage pipeline — photos-ready → CV analysis → frozen result → next stage.

Implements the Sprint 05 contract (`apps/web/docs/api-spec-triage.md`) for the
analysis step:

- Running the analysis is IDEMPOTENT. A case that already has a result returns
  that result; the row is immutable, so a double-tap, a retry or a resumed flow
  can never produce a second verdict.
- The case walks the FRD transitions CAPTURED → QUEUED → PROCESSING_CV →
  NEEDS_CONTEXT. The questionnaire runs even when the model abstained: the
  reviewer needs that context precisely when the photos were inconclusive.
- Abstain, conflict, and any band below `tinggi` flag the case for human
  review. The label is never forced to make the flag go away.

An escalated low-quality case (FR-004 "Kirim ke Penyuluh Saja") is deliberately
NOT analysed — it was sent to a penyuluh instead of the model on purpose.
"""
from typing import Optional

from loguru import logger

from dto.siaga_triage import analysis_result_from_row
from exceptions.siaga_exceptions import SiagaNotFoundError, SiagaValidationError
from models.siaga_case import (
    STATUS_CAPTURED,
    STATUS_NEEDS_CONTEXT,
    STATUS_PROCESSING_CV,
    STATUS_QUEUED,
)
from models.siaga_photo import MIN_ACCEPTED_PHOTOS
from models.siaga_triage import ABSTAIN_KONFLIK, ABSTAIN_TIDAK_YAKIN, requires_review
from service.cv_inference import CvModelClient, analysable_photos, analyse_photos
from service.siaga_case_support import new_id, now_iso, resolve_caller_profile
from service.triage_support import (
    ANALYSIS_NOT_FOUND_MESSAGE,
    TriageRepository,
    TriageRepositoryProtocol,
    advance_case,
    get_actionable_case,
    get_visible_case,
    mark_needs_review,
)

# Statuses from which an analysis may start. QUEUED/PROCESSING_CV are included
# so an interrupted run (worker restart, timeout) can be re-entered safely.
ANALYSABLE_STATUSES = (
    STATUS_CAPTURED,
    STATUS_QUEUED,
    STATUS_PROCESSING_CV,
    STATUS_NEEDS_CONTEXT,
)

NOT_READY_MESSAGE = (
    "Kasus belum siap dianalisis. Lengkapi foto yang layak terlebih dahulu."
)
ESCALATED_MESSAGE = "Kasus ini sudah dikirim ke penyuluh tanpa analisis otomatis."

REVIEW_REASON_ABSTAIN = "analisis_tidak_yakin"
REVIEW_REASON_CONFLICT = "analisis_konflik"
REVIEW_REASON_LOW_CONFIDENCE = "keyakinan_rendah"

QUEUED_EVENT_NOTE = "Kasus masuk antrean analisis"
PROCESSING_EVENT_NOTE = "Analisis gambar dimulai"
NEEDS_CONTEXT_EVENT_NOTE = "Analisis selesai — menunggu jawaban kuesioner"


def review_reason_for(abstain_status: str, band: str) -> Optional[str]:
    """Why this result needs a human, or None when it does not."""
    if abstain_status == ABSTAIN_KONFLIK:
        return REVIEW_REASON_CONFLICT
    if abstain_status == ABSTAIN_TIDAK_YAKIN:
        return REVIEW_REASON_ABSTAIN
    if requires_review(abstain_status, band):
        return REVIEW_REASON_LOW_CONFIDENCE
    return None


class TriagePipelineService:
    """Runs and reads the CV analysis stage of a case."""

    def __init__(
        self,
        repo: Optional[TriageRepositoryProtocol] = None,
        cv_client: Optional[CvModelClient] = None,
    ) -> None:
        self._repo = repo
        self._cv_client = cv_client

    @property
    def repo(self) -> TriageRepositoryProtocol:
        if self._repo is None:
            self._repo = TriageRepository()
        return self._repo

    # ---- run -----------------------------------------------------------------

    def run_analysis(self, user_id: str, case_id: str) -> dict:
        """Analyse the case's photos, or return the result it already has."""
        caller = resolve_caller_profile(self.repo, user_id)
        case = get_actionable_case(self.repo, caller, case_id)

        existing = self.repo.get_analysis_by_case(case_id)
        if existing is not None:
            logger.info(f"analysis replayed: case={case_id}")
            return analysis_result_from_row(existing, caller["role"]).model_dump()

        self._assert_ready(case)

        case = advance_case(
            self.repo, case, STATUS_QUEUED, caller["id"], QUEUED_EVENT_NOTE
        )
        case = advance_case(
            self.repo, case, STATUS_PROCESSING_CV, caller["id"], PROCESSING_EVENT_NOTE
        )

        outcome = analyse_photos(self.repo.list_photos(case_id), self._cv_client)
        row = self._persist(case_id, outcome)

        reason = review_reason_for(outcome.abstain_status, outcome.confidence_band)
        if reason:
            case = mark_needs_review(self.repo, case, reason)

        # The questionnaire runs regardless — an abstain case needs MORE
        # context, not less (brief 03 §4.2).
        advance_case(
            self.repo,
            case,
            STATUS_NEEDS_CONTEXT,
            caller["id"],
            NEEDS_CONTEXT_EVENT_NOTE,
        )

        return analysis_result_from_row(row, caller["role"]).model_dump()

    def _assert_ready(self, case: dict) -> None:
        """Refuse to analyse a case that is not in the photos-done state."""
        accepted = analysable_photos(self.repo.list_photos(case["id"]))
        # Escalated WITHOUT enough good photos = deliberately no auto label.
        if case.get("needs_human_review") and len(accepted) < MIN_ACCEPTED_PHOTOS:
            raise SiagaValidationError(ESCALATED_MESSAGE)
        if case["status"] not in ANALYSABLE_STATUSES:
            raise SiagaValidationError(NOT_READY_MESSAGE)
        if len(accepted) < MIN_ACCEPTED_PHOTOS:
            raise SiagaValidationError(NOT_READY_MESSAGE)

    def _persist(self, case_id: str, outcome) -> dict:
        """Write the frozen result; a concurrent run re-reads instead of racing."""
        row = {
            "id": new_id(),
            "case_id": case_id,
            "candidates": outcome.candidates,
            "confidence_band": outcome.confidence_band,
            "abstain_status": outcome.abstain_status,
            "quality_penalty": outcome.quality_penalty,
            "model_version": outcome.model_version,
            "threshold_version": outcome.threshold_version,
            "evidence_maps": outcome.evidence_maps,
            "created_at": now_iso(),
        }
        try:
            return self.repo.insert_analysis(row)
        except Exception:
            existing = self.repo.get_analysis_by_case(case_id)
            if existing is not None:
                logger.info(f"analysis replayed after race: case={case_id}")
                return existing
            raise

    # ---- read ----------------------------------------------------------------

    def get_analysis(self, user_id: str, case_id: str) -> dict:
        """The stored result, role-shaped. 404 while none exists yet."""
        caller = resolve_caller_profile(self.repo, user_id)
        get_visible_case(self.repo, caller, case_id)
        row = self.repo.get_analysis_by_case(case_id)
        if row is None:
            raise SiagaNotFoundError(ANALYSIS_NOT_FOUND_MESSAGE)
        return analysis_result_from_row(row, caller["role"]).model_dump()
