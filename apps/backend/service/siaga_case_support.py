"""Shared plumbing for the Sprint 02 case & farmer-profile services.

Holds the pieces both `service/cases.py` and `service/farmer_profile.py`
need: the Supabase repository base with the common lookups, the assisted-mode
actor resolution (owner = subject petani, creator = penyuluh), and the small
validators shared by both modules. Keeping them here avoids copy-paste drift
between the two services.
"""
import math
import uuid
from datetime import datetime, timezone
from typing import Optional

from config.base import settings
from exceptions.siaga_exceptions import (
    SiagaForbiddenError,
    SiagaValidationError,
    UnauthorizedError,
)
from service import BaseSupabaseRepository

FIELD_NAME_MIN_LENGTH = 2
FIELD_NAME_MAX_LENGTH = 100

ASSISTED_SESSION_INVALID_MESSAGE = "Sesi pendampingan tidak valid."
FIELD_NAME_INVALID_MESSAGE = (
    f"Nama lahan harus {FIELD_NAME_MIN_LENGTH}-{FIELD_NAME_MAX_LENGTH} karakter."
)
FIELD_NOT_FOUND_MESSAGE = "Lahan tidak ditemukan."

# Opt-in GPS points must be real Earth coordinates. Without this, JSON
# `Infinity`/`NaN` and absurd magnitudes reach the jsonb column and poison the
# geo/map consumers planned for later sprints.
LATITUDE_BOUND = 90.0
LONGITUDE_BOUND = 180.0
COORDS_OUT_OF_RANGE_MESSAGE = "Koordinat di luar rentang yang valid."


def validate_coords(lat: float, lng: float) -> None:
    """Reject non-finite or out-of-range coordinates (400)."""
    is_finite = math.isfinite(lat) and math.isfinite(lng)
    if not is_finite or abs(lat) > LATITUDE_BOUND or abs(lng) > LONGITUDE_BOUND:
        raise SiagaValidationError(COORDS_OUT_OF_RANGE_MESSAGE)


def new_id() -> str:
    """Row id — same scheme Sprint 01 services use (`uuid4().hex`)."""
    return uuid.uuid4().hex


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_timestamp(value: Optional[str]) -> Optional[datetime]:
    """ISO-8601 parse; naive values are treated as UTC; None on failure."""
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def resolve_caller_profile(repo, user_id: str) -> dict:
    """Load the caller's siaga profile; 401 when the identity has none."""
    profile = repo.get_profile_by_user_id(user_id)
    if profile is None:
        raise UnauthorizedError()
    return profile


def resolve_actor_context(
    repo, caller_profile: dict, assisted_session_id: Optional[str]
) -> tuple[dict, dict]:
    """Resolve `(owner_profile, created_by_profile)` for a write operation.

    Without a session the caller acts for themselves. With one, the session
    must exist, be OPEN, and belong to the calling penyuluh — then the owner
    is the session's subject petani. Unknown, foreign, and ended sessions all
    raise the SAME 403 so session ids cannot be probed.
    """
    if assisted_session_id is None:
        return caller_profile, caller_profile
    session = repo.get_session(assisted_session_id)
    is_usable = (
        session is not None
        and session.get("actor_user_id") == caller_profile.get("user_id")
        and not session.get("ended_at")
    )
    if not is_usable:
        raise SiagaForbiddenError(ASSISTED_SESSION_INVALID_MESSAGE)
    subject = repo.get_profile_by_id(session["subject_profile_id"])
    if subject is None:
        raise SiagaForbiddenError(ASSISTED_SESSION_INVALID_MESSAGE)
    return subject, caller_profile


def validate_field_name(name: Optional[str]) -> str:
    """Lahan name must be 2-100 chars (contract + DB check constraint)."""
    cleaned = (name or "").strip()
    if not FIELD_NAME_MIN_LENGTH <= len(cleaned) <= FIELD_NAME_MAX_LENGTH:
        raise SiagaValidationError(FIELD_NAME_INVALID_MESSAGE)
    return cleaned


def build_field_row(
    owner_profile_id: str,
    name: str,
    area_kabupaten: Optional[str],
    area_kecamatan: Optional[str],
    coords: Optional[dict],
) -> dict:
    """New `fields` row (snake_case) with generated id and timestamps."""
    now = now_iso()
    return {
        "id": new_id(),
        "owner_profile_id": owner_profile_id,
        "name": name,
        "area_kabupaten": area_kabupaten,
        "area_kecamatan": area_kecamatan,
        "coords": coords,
        "created_at": now,
        "updated_at": now,
    }


class SiagaCaseBaseRepository(BaseSupabaseRepository):
    """Supabase lookups shared by the case and farmer-profile repositories."""

    def __init__(self) -> None:
        super().__init__()
        self.profile_table = settings.SUPABASE_TABLE_SIAGA_PROFILE
        self.assignment_table = settings.SUPABASE_TABLE_PENYULUH_ASSIGNMENT
        self.session_table = settings.SUPABASE_TABLE_ASSISTED_SESSION
        self.field_table = settings.SUPABASE_TABLE_FIELD
        self.case_table = settings.SUPABASE_TABLE_CASE

    def _first(self, query) -> Optional[dict]:
        rows = query.limit(1).execute().data or []
        return rows[0] if rows else None

    def get_profile_by_user_id(self, user_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.profile_table).select("*").eq("user_id", user_id)
        )

    def get_profile_by_id(self, profile_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.profile_table).select("*").eq("id", profile_id)
        )

    def get_profiles_by_ids(self, profile_ids: list[str]) -> dict[str, dict]:
        if not profile_ids:
            return {}
        rows = (
            self.table(self.profile_table)
            .select("id, display_name")
            .in_("id", list(set(profile_ids)))
            .execute()
            .data
            or []
        )
        return {row["id"]: row for row in rows}

    def get_session(self, session_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.session_table).select("*").eq("id", session_id)
        )

    def get_assignment_areas(self, user_id: str) -> list[str]:
        row = self._first(
            self.table(self.assignment_table)
            .select("area_kecamatan")
            .eq("user_id", user_id)
        )
        return list(row.get("area_kecamatan") or []) if row else []

    def get_field_by_id(self, field_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.field_table).select("*").eq("id", field_id)
        )

    def insert_field(self, row: dict) -> dict:
        self.table(self.field_table).insert(row).execute()
        return row
