"""Assisted-mode (mode pendampingan) service.

Every operation is scoped to the acting penyuluh's assignment areas — search
is NEVER global, and a subject outside binaan scope is rejected with 403. The
`assisted_sessions` row is the audit stamp (actor + subject + consent + time);
loguru mirrors each event.

The repository is an injectable seam (`AssistedService(repo=...)`) so unit
tests run against an in-memory fake instead of Supabase.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Protocol

from loguru import logger

from config.base import settings
from dto.assisted import (
    AssistedEndDTO,
    AssistedSearchDTO,
    AssistedStartDTO,
    NewAssistedProfileDTO,
)
from dto.siaga_profile import assisted_session_from_row
from exceptions.siaga_exceptions import SiagaForbiddenError, SiagaValidationError
from models.siaga_profile import ACCOUNT_STATUS_DIDAMPINGI, ROLE_PETANI
from service import BaseSupabaseRepository

SEARCH_RESULT_LIMIT = 20

OUT_OF_SCOPE_MESSAGE = "Petani berada di luar wilayah binaan Anda."
XOR_MESSAGE = "Isi salah satu saja: subjectProfileId atau newProfile."
SESSION_NOT_FOUND_MESSAGE = "Sesi pendampingan tidak ditemukan."
SESSION_ALREADY_ENDED_MESSAGE = "Sesi pendampingan sudah berakhir."
SESSION_NOT_OWNED_MESSAGE = "Sesi pendampingan bukan milik Anda."


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class AssistedRepositoryProtocol(Protocol):
    """Data-access seam consumed by `AssistedService` (fakeable in tests)."""

    def get_assignment_areas(self, user_id: str) -> list[str]: ...

    def search_profiles(self, query: str, areas: list[str]) -> list[dict]: ...

    def get_profile_by_id(self, profile_id: str) -> Optional[dict]: ...

    def insert_profile(self, row: dict) -> dict: ...

    def insert_session(self, row: dict) -> dict: ...

    def get_session(self, session_id: str) -> Optional[dict]: ...

    def end_session(self, session_id: str, fields: dict) -> None: ...


class AssistedRepository(BaseSupabaseRepository):
    """Supabase-backed implementation of the assisted-mode data seam."""

    def __init__(self) -> None:
        super().__init__()
        self.profile_table = settings.SUPABASE_TABLE_SIAGA_PROFILE
        self.assignment_table = settings.SUPABASE_TABLE_PENYULUH_ASSIGNMENT
        self.session_table = settings.SUPABASE_TABLE_ASSISTED_SESSION

    def _first(self, query) -> Optional[dict]:
        rows = query.limit(1).execute().data or []
        return rows[0] if rows else None

    def get_assignment_areas(self, user_id: str) -> list[str]:
        row = self._first(
            self.table(self.assignment_table)
            .select("area_kecamatan")
            .eq("user_id", user_id)
        )
        return list(row.get("area_kecamatan") or []) if row else []

    def search_profiles(self, query: str, areas: list[str]) -> list[dict]:
        response = (
            self.table(self.profile_table)
            .select("id, display_name, area_kabupaten, area_kecamatan, account_status")
            .eq("role", ROLE_PETANI)
            .in_("area_kecamatan", areas)
            .ilike("display_name", f"%{query}%")
            .limit(SEARCH_RESULT_LIMIT)
            .execute()
        )
        return response.data or []

    def get_profile_by_id(self, profile_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.profile_table).select("*").eq("id", profile_id)
        )

    def insert_profile(self, row: dict) -> dict:
        self.table(self.profile_table).insert(row).execute()
        return row

    def insert_session(self, row: dict) -> dict:
        self.table(self.session_table).insert(row).execute()
        return row

    def get_session(self, session_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.session_table).select("*").eq("id", session_id)
        )

    def end_session(self, session_id: str, fields: dict) -> None:
        self.table(self.session_table).update(fields).eq("id", session_id).execute()


class AssistedService:
    """Search / start / end assisted sessions inside binaan scope only."""

    def __init__(self, repo: Optional[AssistedRepositoryProtocol] = None) -> None:
        self._repo = repo

    @property
    def repo(self) -> AssistedRepositoryProtocol:
        if self._repo is None:
            self._repo = AssistedRepository()
        return self._repo

    # ---- search ------------------------------------------------------------

    def search(self, actor_user_id: str, dto: AssistedSearchDTO) -> list[dict]:
        areas = self.repo.get_assignment_areas(actor_user_id)
        if not areas:
            return []
        rows = self.repo.search_profiles(dto.query, areas)
        return [self._search_summary(row) for row in rows]

    @staticmethod
    def _search_summary(row: dict) -> dict:
        return {
            "profileId": row["id"],
            "displayName": row["display_name"],
            "areaKabupaten": row.get("area_kabupaten"),
            "areaKecamatan": row.get("area_kecamatan"),
            "accountStatus": row["account_status"],
        }

    # ---- start ---------------------------------------------------------------

    def start(self, actor_user_id: str, dto: AssistedStartDTO) -> dict:
        self._validate_start_choice(dto)
        areas = self.repo.get_assignment_areas(actor_user_id)
        subject = self._resolve_subject(dto, areas)
        started_at = _now_iso()
        row = {
            "id": uuid.uuid4().hex,
            "actor_user_id": actor_user_id,
            "subject_profile_id": subject["id"],
            "consent_method": dto.consentMethod,
            "started_at": started_at,
            "ended_at": None,
            "created_at": started_at,
            "updated_at": started_at,
        }
        self.repo.insert_session(row)
        logger.info(
            f"assisted session started: actor={actor_user_id} "
            f"subject={subject['id']} consent={dto.consentMethod} at={started_at}"
        )
        return assisted_session_from_row(row, subject["display_name"]).model_dump()

    @staticmethod
    def _validate_start_choice(dto: AssistedStartDTO) -> None:
        has_subject = dto.subjectProfileId is not None
        has_new_profile = dto.newProfile is not None
        if has_subject == has_new_profile:
            raise SiagaValidationError(XOR_MESSAGE)

    def _resolve_subject(self, dto: AssistedStartDTO, areas: list[str]) -> dict:
        if dto.subjectProfileId is not None:
            profile = self.repo.get_profile_by_id(dto.subjectProfileId)
            if profile is None or profile.get("area_kecamatan") not in areas:
                raise SiagaForbiddenError(OUT_OF_SCOPE_MESSAGE)
            return profile
        if dto.newProfile.areaKecamatan not in areas:
            raise SiagaForbiddenError(OUT_OF_SCOPE_MESSAGE)
        return self._create_minimal_profile(dto.newProfile)

    def _create_minimal_profile(self, new_profile: NewAssistedProfileDTO) -> dict:
        """Minimal 'didampingi' profile — no credentials, no national-ID field."""
        now = _now_iso()
        row = {
            "id": uuid.uuid4().hex,
            "user_id": None,
            "display_name": new_profile.displayName,
            "role": ROLE_PETANI,
            "area_kabupaten": new_profile.areaKabupaten,
            "area_kecamatan": new_profile.areaKecamatan,
            "account_status": ACCOUNT_STATUS_DIDAMPINGI,
            "research_consent": False,
            "location_consent": False,
            "created_at": now,
            "updated_at": now,
        }
        return self.repo.insert_profile(row)

    # ---- end -------------------------------------------------------------------

    def end(self, actor_user_id: str, dto: AssistedEndDTO) -> dict:
        session = self.repo.get_session(dto.sessionId)
        if session is None:
            raise SiagaValidationError(SESSION_NOT_FOUND_MESSAGE)
        if session["actor_user_id"] != actor_user_id:
            raise SiagaForbiddenError(SESSION_NOT_OWNED_MESSAGE)
        if session.get("ended_at"):
            raise SiagaValidationError(SESSION_ALREADY_ENDED_MESSAGE)
        ended_at = _now_iso()
        self.repo.end_session(dto.sessionId, {"ended_at": ended_at, "updated_at": ended_at})
        logger.info(
            f"assisted session ended: actor={actor_user_id} "
            f"session={dto.sessionId} at={ended_at}"
        )
        return {"sessionId": dto.sessionId, "endedAt": ended_at}
