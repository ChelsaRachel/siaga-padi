"""Row-shape models and the SINGLE-SOURCE case state machine (FRD §6.5–6.6).

Mirrors `supabase/migrations/0010_siaga_case.sql` (snake_case columns).
FE-facing camelCase DTOs live in `dto/siaga_case.py`.

The DB stores CANONICAL FRD statuses (English, uppercase). The petani-facing
Indonesian stages are a display mapping (`DISPLAY_STAGE_MAP`) applied in the
DTO layer, never stored. The SQL trigger `enforce_case_transition()` in
migration 0010 mirrors `LEGAL_TRANSITIONS` — keep both in sync on any change.
"""
from typing import Optional

from pydantic import BaseModel

# ---- statuses (FRD §6.5) ---------------------------------------------------

STATUS_DRAFT = "DRAFT"
STATUS_CAPTURED = "CAPTURED"
STATUS_QUALITY_REJECTED = "QUALITY_REJECTED"
STATUS_QUEUED = "QUEUED"
STATUS_PROCESSING_CV = "PROCESSING_CV"
STATUS_NEEDS_CONTEXT = "NEEDS_CONTEXT"
STATUS_GENERATING_RECOMMENDATION = "GENERATING_RECOMMENDATION"
STATUS_AUTO_TRIAGE_READY = "AUTO_TRIAGE_READY"
STATUS_NEEDS_REVIEW = "NEEDS_REVIEW"
STATUS_REVISION_REQUIRED = "REVISION_REQUIRED"
STATUS_REVIEWED = "REVIEWED"
STATUS_CLOSED = "CLOSED"
STATUS_FAILED = "FAILED"
STATUS_ARCHIVED = "ARCHIVED"
STATUS_CANCELLED = "CANCELLED"

CASE_STATUSES = (
    STATUS_DRAFT,
    STATUS_CAPTURED,
    STATUS_QUALITY_REJECTED,
    STATUS_QUEUED,
    STATUS_PROCESSING_CV,
    STATUS_NEEDS_CONTEXT,
    STATUS_GENERATING_RECOMMENDATION,
    STATUS_AUTO_TRIAGE_READY,
    STATUS_NEEDS_REVIEW,
    STATUS_REVISION_REQUIRED,
    STATUS_REVIEWED,
    STATUS_CLOSED,
    STATUS_FAILED,
    STATUS_ARCHIVED,
    STATUS_CANCELLED,
)

TERMINAL_STATUSES = (STATUS_ARCHIVED, STATUS_CANCELLED)
# STR-010: any ACTIVE state may be cancelled with a reason. CLOSED is not
# active (its only legal exit is ARCHIVED, per the §6.5 table).
ACTIVE_STATUSES = tuple(
    status
    for status in CASE_STATUSES
    if status not in (STATUS_CLOSED, *TERMINAL_STATUSES)
)

# FRD §6.5 "Transisi Berikutnya" column + STR-010 (any active → CANCELLED).
LEGAL_TRANSITIONS: dict[str, tuple[str, ...]] = {
    STATUS_DRAFT: (STATUS_CAPTURED, STATUS_CANCELLED),
    STATUS_CAPTURED: (STATUS_QUALITY_REJECTED, STATUS_QUEUED, STATUS_CANCELLED),
    STATUS_QUALITY_REJECTED: (STATUS_CAPTURED, STATUS_CANCELLED),
    STATUS_QUEUED: (STATUS_PROCESSING_CV, STATUS_FAILED, STATUS_CANCELLED),
    STATUS_PROCESSING_CV: (STATUS_NEEDS_CONTEXT, STATUS_FAILED, STATUS_CANCELLED),
    STATUS_NEEDS_CONTEXT: (STATUS_GENERATING_RECOMMENDATION, STATUS_CANCELLED),
    STATUS_GENERATING_RECOMMENDATION: (
        STATUS_AUTO_TRIAGE_READY,
        STATUS_NEEDS_REVIEW,
        STATUS_FAILED,
        STATUS_CANCELLED,
    ),
    STATUS_AUTO_TRIAGE_READY: (
        STATUS_NEEDS_REVIEW,
        STATUS_REVIEWED,
        STATUS_CLOSED,
        STATUS_CANCELLED,
    ),
    STATUS_NEEDS_REVIEW: (
        STATUS_REVIEWED,
        STATUS_REVISION_REQUIRED,
        STATUS_CANCELLED,
    ),
    STATUS_REVISION_REQUIRED: (
        STATUS_CAPTURED,
        STATUS_NEEDS_CONTEXT,
        STATUS_CANCELLED,
    ),
    STATUS_REVIEWED: (STATUS_CLOSED, STATUS_CANCELLED),
    STATUS_CLOSED: (STATUS_ARCHIVED,),
    STATUS_FAILED: (STATUS_QUEUED, STATUS_CANCELLED),
    STATUS_ARCHIVED: (),
    STATUS_CANCELLED: (),
}


def is_legal_transition(from_status: str, to_status: str) -> bool:
    """True when FRD §6.5–6.6 allows `from_status` → `to_status`."""
    return to_status in LEGAL_TRANSITIONS.get(from_status, ())


# ---- petani-facing display stages (brief §5.1) ------------------------------

DISPLAY_STAGE_MAP: dict[str, str] = {
    STATUS_DRAFT: "draf",
    STATUS_CAPTURED: "difoto",
    STATUS_QUALITY_REJECTED: "difoto",
    STATUS_QUEUED: "diproses",
    STATUS_PROCESSING_CV: "diproses",
    STATUS_NEEDS_CONTEXT: "diproses",
    STATUS_GENERATING_RECOMMENDATION: "diproses",
    STATUS_FAILED: "diproses",
    STATUS_AUTO_TRIAGE_READY: "hasil_siap",
    STATUS_NEEDS_REVIEW: "direview",
    STATUS_REVIEWED: "direview",
    STATUS_REVISION_REQUIRED: "revisi",
    STATUS_CLOSED: "selesai",
    STATUS_ARCHIVED: "selesai",
    STATUS_CANCELLED: "dibatalkan",
}


def display_stage_for(status: str) -> str:
    """Map a canonical FRD status onto the petani-facing Indonesian stage."""
    return DISPLAY_STAGE_MAP.get(status, "diproses")


# ---- FR-002 enums ------------------------------------------------------------

GROWTH_STAGES = ("SEEDLING", "VEGETATIVE", "REPRODUCTIVE", "RIPENING", "UNKNOWN")
GROWTH_STAGE_DEFAULT = "UNKNOWN"

LOCATION_MODE_EXACT_GPS = "EXACT_GPS"
LOCATION_MODE_AREA_ONLY = "AREA_ONLY"
LOCATION_MODE_NONE = "NONE"
LOCATION_MODES = (
    LOCATION_MODE_EXACT_GPS,
    LOCATION_MODE_AREA_ONLY,
    LOCATION_MODE_NONE,
)

NOTES_MAX_LENGTH = 500

DELETION_REQUEST_STATUSES = ("tercatat", "diproses", "selesai", "ditolak")


# ---- row models --------------------------------------------------------------


class FieldModel(BaseModel):
    """One row of `fields` (lahan)."""

    id: str
    owner_profile_id: str
    name: str
    area_kabupaten: Optional[str] = None
    area_kecamatan: Optional[str] = None
    coords: Optional[dict] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CaseModel(BaseModel):
    """One row of `cases`."""

    id: str
    case_code: str
    owner_profile_id: str
    created_by_profile_id: str
    assisted_session_id: Optional[str] = None
    field_id: Optional[str] = None
    growth_stage: str = GROWTH_STAGE_DEFAULT
    location_mode: str = LOCATION_MODE_AREA_ONLY
    coords: Optional[dict] = None
    area_kabupaten: Optional[str] = None
    area_kecamatan: Optional[str] = None
    status: str = STATUS_DRAFT
    notes: Optional[str] = None
    observed_at: str
    idempotency_key: str
    config_version_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CaseEventModel(BaseModel):
    """One row of `case_events` — append-only; `from_status is None` = creation."""

    id: str
    case_id: str
    from_status: Optional[str] = None
    to_status: str
    actor_profile_id: Optional[str] = None
    note: Optional[str] = None
    created_at: Optional[str] = None


class DataDeletionRequestModel(BaseModel):
    """One row of `data_deletion_requests` (BR-002-05)."""

    id: str
    profile_id: str
    reason: Optional[str] = None
    status: str = "tercatat"
    requested_at: Optional[str] = None
    processed_at: Optional[str] = None
