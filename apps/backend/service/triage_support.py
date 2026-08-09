"""Shared plumbing for the Sprint 05 triage services.

Holds what `triage_pipeline`, `questionnaire` and `recommendation` all need: the
data seam (`TriageRepositoryProtocol`) with its Supabase implementation, the
case-transition writer, and the validators used on more than one side. Keeping
them here avoids copy-paste drift between the three modules — the same role
`kb_support.py` plays for Sprint 04 and `siaga_case_support.py` for Sprint 02.

Two rules encoded here rather than in each service:

- A triage write is tighter than a triage read. Reading a case follows the
  normal visibility rule (owner / binaan penyuluh / admin / reviewer); running
  the pipeline or answering questions is limited to the owner and the assisted
  creator, exactly like a photo upload.
- Every status change goes through `advance_case()`, which refuses an illegal
  transition instead of writing it. The FRD table stays the single authority.
"""
from typing import Optional, Protocol

from loguru import logger

from config.base import settings
from exceptions.siaga_exceptions import (
    SiagaForbiddenError,
    SiagaNotFoundError,
    SiagaValidationError,
)
from models.siaga_case import is_legal_transition
from models.siaga_triage import ANSWERS
from service.siaga_case_support import (
    SiagaCaseBaseRepository,
    is_case_visible,
    new_id,
    now_iso,
)

CASE_NOT_FOUND_MESSAGE = "Kasus tidak ditemukan."
TRIAGE_ROLE_DENIED_MESSAGE = (
    "Hanya pemilik kasus atau pendampingnya yang dapat melanjutkan pemeriksaan."
)
INVALID_ANSWER_MESSAGE = "Jawaban harus 'ya', 'tidak', atau 'tidak_tahu'."
UNKNOWN_QUESTION_MESSAGE = "Pertanyaan tidak dikenal untuk kasus ini."
ANALYSIS_NOT_FOUND_MESSAGE = "Hasil analisis belum tersedia untuk kasus ini."
RECOMMENDATION_NOT_FOUND_MESSAGE = "Rekomendasi belum tersedia untuk kasus ini."


class TriageRepositoryProtocol(Protocol):
    """Data-access seam consumed by the triage services (fakeable in tests)."""

    def get_profile_by_user_id(self, user_id: str) -> Optional[dict]: ...

    def get_assignment_areas(self, user_id: str) -> list[str]: ...

    def get_field_by_id(self, field_id: str) -> Optional[dict]: ...

    def get_case_by_id(self, case_id: str) -> Optional[dict]: ...

    def update_case(self, case_id: str, fields: dict) -> dict: ...

    def insert_event(self, row: dict) -> dict: ...

    def list_photos(self, case_id: str) -> list[dict]: ...

    def get_analysis_by_case(self, case_id: str) -> Optional[dict]: ...

    def insert_analysis(self, row: dict) -> dict: ...

    def list_approved_questions(self) -> list[dict]: ...

    def list_answers(self, case_id: str) -> list[dict]: ...

    def upsert_answer(self, row: dict) -> dict: ...

    def get_recommendation_by_case(self, case_id: str) -> Optional[dict]: ...

    def upsert_recommendation(self, row: dict) -> dict: ...


class TriageRepository(SiagaCaseBaseRepository):
    """Supabase-backed implementation of the triage data seam."""

    def __init__(self) -> None:
        super().__init__()
        self.event_table = settings.SUPABASE_TABLE_CASE_EVENT
        self.photo_table = settings.SUPABASE_TABLE_CASE_PHOTO
        self.analysis_table = settings.SUPABASE_TABLE_ANALYSIS_RESULT
        self.question_table = settings.SUPABASE_TABLE_QUESTION_BANK
        self.answer_table = settings.SUPABASE_TABLE_CASE_ANSWER
        self.recommendation_table = settings.SUPABASE_TABLE_RECOMMENDATION

    # ---- case ----------------------------------------------------------------

    def get_case_by_id(self, case_id: str) -> Optional[dict]:
        return self._first(self.table(self.case_table).select("*").eq("id", case_id))

    def update_case(self, case_id: str, fields: dict) -> dict:
        self.table(self.case_table).update(fields).eq("id", case_id).execute()
        return {**(self.get_case_by_id(case_id) or {}), "id": case_id}

    def insert_event(self, row: dict) -> dict:
        self.table(self.event_table).insert(row).execute()
        return row

    def list_photos(self, case_id: str) -> list[dict]:
        response = (
            self.table(self.photo_table)
            .select("*")
            .eq("case_id", case_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data or []

    # ---- analysis -------------------------------------------------------------

    def get_analysis_by_case(self, case_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.analysis_table).select("*").eq("case_id", case_id)
        )

    def insert_analysis(self, row: dict) -> dict:
        self.table(self.analysis_table).insert(row).execute()
        return row

    # ---- questionnaire ---------------------------------------------------------

    def list_approved_questions(self) -> list[dict]:
        """Only approved rows leave the database — never a draft question."""
        response = (
            self.table(self.question_table)
            .select("*")
            .eq("approved", True)
            .order("ordinal", desc=False)
            .execute()
        )
        return response.data or []

    def list_answers(self, case_id: str) -> list[dict]:
        response = (
            self.table(self.answer_table)
            .select("*")
            .eq("case_id", case_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data or []

    def upsert_answer(self, row: dict) -> dict:
        """Insert-or-update on the `(case_id, question_id)` unique key."""
        self.table(self.answer_table).upsert(
            row, on_conflict="case_id,question_id"
        ).execute()
        return row

    # ---- recommendation ---------------------------------------------------------

    def get_recommendation_by_case(self, case_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.recommendation_table).select("*").eq("case_id", case_id)
        )

    def upsert_recommendation(self, row: dict) -> dict:
        """Insert-or-update on the `case_id` unique key.

        Unlike `analysis_results`, a recommendation is NOT frozen: re-running
        the composer after a retrieval fix must replace the card rather than
        collide. What is frozen is the analysis it was built from.
        """
        self.table(self.recommendation_table).upsert(
            row, on_conflict="case_id"
        ).execute()
        return row


# ---- shared helpers ---------------------------------------------------------------


def get_visible_case(repo, caller: dict, case_id: str) -> dict:
    """Missing and invisible cases raise the IDENTICAL 404 (no probing)."""
    row = repo.get_case_by_id(case_id)
    if row is None or not is_case_visible(repo, row, caller):
        raise SiagaNotFoundError(CASE_NOT_FOUND_MESSAGE)
    return row


def get_actionable_case(repo, caller: dict, case_id: str) -> dict:
    """Writes are tighter than reads: owner or the assisted creator only."""
    case = get_visible_case(repo, caller, case_id)
    is_actor = caller["id"] in (
        case["owner_profile_id"],
        case["created_by_profile_id"],
    )
    if not is_actor:
        raise SiagaForbiddenError(TRIAGE_ROLE_DENIED_MESSAGE)
    return case


def advance_case(
    repo, case: dict, to_status: str, actor_profile_id: Optional[str], note: str
) -> dict:
    """Move the case to `to_status`, recording the linimasa event.

    An illegal transition is a no-op rather than an exception: the pipeline is
    idempotent and may be re-entered on a case that already moved on (a retry,
    a double-tap, a resumed flow). Refusing to write the wrong edge is the
    protection; failing the whole request would be the wrong cure.
    """
    from_status = case["status"]
    if from_status == to_status:
        return case
    if not is_legal_transition(from_status, to_status):
        logger.warning(
            f"triage skipped illegal transition: case={case['id']} "
            f"{from_status}->{to_status}"
        )
        return case
    updated = repo.update_case(
        case["id"], {"status": to_status, "updated_at": now_iso()}
    )
    repo.insert_event(
        {
            "id": new_id(),
            "case_id": case["id"],
            "from_status": from_status,
            "to_status": to_status,
            "actor_profile_id": actor_profile_id,
            "note": note,
            "created_at": now_iso(),
        }
    )
    logger.info(f"case advanced: case={case['id']} {from_status}->{to_status}")
    return {**case, **updated, "status": to_status}


def mark_needs_review(repo, case: dict, reason: str) -> dict:
    """Flag the case for human review, keeping the first reason recorded."""
    if case.get("needs_human_review"):
        return case
    updated = repo.update_case(
        case["id"],
        {
            "needs_human_review": True,
            "review_reason": reason,
            "updated_at": now_iso(),
        },
    )
    logger.info(f"case flagged for review: case={case['id']} reason={reason}")
    return {**case, **updated, "needs_human_review": True, "review_reason": reason}


def validate_answer(value: Optional[str]) -> str:
    """Answers are ya / tidak / tidak_tahu — nothing else reaches the table."""
    if value not in ANSWERS:
        raise SiagaValidationError(INVALID_ANSWER_MESSAGE)
    return value
