"""Farmer profile service — own profile, lahan CRUD, deletion requests.

Implements the pinned Sprint 02 contract (`apps/web/docs/api-spec-case.md`):
- `PUT /farmer/profile` updates OWN profile fields only. Role/account-status
  are not accepted (the DTO has no such fields — extras are ignored), so this
  route can never escalate privileges.
- Lahan create/update honor assisted mode (owner = session subject petani).
  Updating a lahan the caller does not own returns the IDENTICAL 404 body as
  a nonexistent id (no enumeration).
- Deletion requests are RECORDED (status 'tercatat') per retention policy —
  never an instant wipe.

The repository is an injectable seam (`FarmerProfileService(repo=...)`) so
unit tests run against an in-memory fake instead of Supabase.
"""
from typing import Optional, Protocol

from loguru import logger

from config.base import settings
from dto.farmer_profile import (
    CreateFarmerFieldDTO,
    DeletionRequestDTO,
    FindFarmerFieldsDTO,
    UpdateFarmerFieldDTO,
    UpdateFarmerProfileDTO,
)
from dto.siaga_case import deletion_request_from_row, field_from_row
from dto.siaga_profile import profile_from_row
from exceptions.siaga_exceptions import SiagaNotFoundError, SiagaValidationError
from models.siaga_case import NOTES_MAX_LENGTH
from models.siaga_profile import ROLE_PENYULUH
from service.siaga_case_support import (
    FIELD_NOT_FOUND_MESSAGE,
    SiagaCaseBaseRepository,
    build_field_row,
    new_id,
    now_iso,
    resolve_actor_context,
    resolve_caller_profile,
    validate_coords,
    validate_field_name,
)

DELETION_STATUS_RECORDED = "tercatat"

DISPLAY_NAME_INVALID_MESSAGE = "Nama tampilan tidak boleh kosong."
REASON_TOO_LONG_MESSAGE = f"Alasan maksimal {NOTES_MAX_LENGTH} karakter."

_PROFILE_COLUMN_MAP = {
    "displayName": "display_name",
    "areaKabupaten": "area_kabupaten",
    "areaKecamatan": "area_kecamatan",
    "researchConsent": "research_consent",
    "locationConsent": "location_consent",
}


class FarmerProfileRepositoryProtocol(Protocol):
    """Data-access seam consumed by `FarmerProfileService` (fakeable in tests)."""

    def get_profile_by_user_id(self, user_id: str) -> Optional[dict]: ...

    def get_profile_by_id(self, profile_id: str) -> Optional[dict]: ...

    def get_session(self, session_id: str) -> Optional[dict]: ...

    def get_assignment_areas(self, user_id: str) -> list[str]: ...

    def update_profile(self, profile_id: str, fields: dict) -> dict: ...

    def get_field_by_id(self, field_id: str) -> Optional[dict]: ...

    def insert_field(self, row: dict) -> dict: ...

    def update_field(self, field_id: str, fields: dict) -> dict: ...

    def find_fields(
        self, owner_profile_id: str, page: int, limit: int
    ) -> tuple[list[dict], int]: ...

    def get_field_case_stats(
        self, owner_profile_id: str, field_ids: list[str]
    ) -> dict[str, dict]: ...

    def insert_deletion_request(self, row: dict) -> dict: ...

    def get_latest_deletion_request(self, profile_id: str) -> Optional[dict]: ...


class FarmerProfileRepository(SiagaCaseBaseRepository):
    """Supabase-backed implementation of the farmer-profile data seam."""

    def __init__(self) -> None:
        super().__init__()
        self.deletion_table = settings.SUPABASE_TABLE_DELETION_REQUEST

    def update_profile(self, profile_id: str, fields: dict) -> dict:
        self.table(self.profile_table).update(fields).eq("id", profile_id).execute()
        return self.get_profile_by_id(profile_id) or {}

    def update_field(self, field_id: str, fields: dict) -> dict:
        self.table(self.field_table).update(fields).eq("id", field_id).execute()
        return self.get_field_by_id(field_id) or {}

    def find_fields(
        self, owner_profile_id: str, page: int, limit: int
    ) -> tuple[list[dict], int]:
        start = (page - 1) * limit
        response = (
            self.table(self.field_table)
            .select("*", count="exact")
            .eq("owner_profile_id", owner_profile_id)
            .order("created_at", desc=True)
            .range(start, start + limit - 1)
            .execute()
        )
        return response.data or [], (response.count or 0)

    def get_field_case_stats(
        self, owner_profile_id: str, field_ids: list[str]
    ) -> dict[str, dict]:
        """caseCount + lastGrowthStage per lahan across the owner's cases."""
        if not field_ids:
            return {}
        rows = (
            self.table(self.case_table)
            .select("field_id, growth_stage, created_at")
            .eq("owner_profile_id", owner_profile_id)
            .in_("field_id", field_ids)
            .order("created_at", desc=False)
            .execute()
            .data
            or []
        )
        return aggregate_field_case_stats(rows)

    def insert_deletion_request(self, row: dict) -> dict:
        self.table(self.deletion_table).insert(row).execute()
        return row

    def get_latest_deletion_request(self, profile_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.deletion_table)
            .select("*")
            .eq("profile_id", profile_id)
            .order("requested_at", desc=True)
        )


def aggregate_field_case_stats(case_rows: list[dict]) -> dict[str, dict]:
    """Fold `(field_id, growth_stage, created_at)` case rows into per-field
    stats. Rows must be sorted ascending by created_at so the last write wins
    as `last_growth_stage`.
    """
    stats: dict[str, dict] = {}
    for row in case_rows:
        field_id = row.get("field_id")
        if not field_id:
            continue
        current = stats.get(field_id, {"case_count": 0, "last_growth_stage": None})
        stats = {
            **stats,
            field_id: {
                "case_count": current["case_count"] + 1,
                "last_growth_stage": row.get("growth_stage"),
            },
        }
    return stats


class FarmerProfileService:
    """Profile + lahan + deletion-request operations, always caller-scoped."""

    def __init__(
        self, repo: Optional[FarmerProfileRepositoryProtocol] = None
    ) -> None:
        self._repo = repo

    @property
    def repo(self) -> FarmerProfileRepositoryProtocol:
        if self._repo is None:
            self._repo = FarmerProfileRepository()
        return self._repo

    # ---- profile -------------------------------------------------------------

    def update_profile(self, user_id: str, dto: UpdateFarmerProfileDTO) -> dict:
        caller = resolve_caller_profile(self.repo, user_id)
        updates = self._profile_updates(dto)
        row = caller
        if updates:
            row = self.repo.update_profile(
                caller["id"], {**updates, "updated_at": now_iso()}
            )
            logger.info(
                f"profile updated: profile={caller['id']} "
                f"fields={sorted(updates.keys())}"
            )
        return self._profile_out(row)

    @staticmethod
    def _profile_updates(dto: UpdateFarmerProfileDTO) -> dict:
        provided = dto.model_dump(exclude_unset=True)
        if "displayName" in provided and not (provided["displayName"] or "").strip():
            raise SiagaValidationError(DISPLAY_NAME_INVALID_MESSAGE)
        return {
            _PROFILE_COLUMN_MAP[key]: value
            for key, value in provided.items()
            if key in _PROFILE_COLUMN_MAP
        }

    def _profile_out(self, row: dict) -> dict:
        areas = None
        if row.get("role") == ROLE_PENYULUH and row.get("user_id"):
            areas = self.repo.get_assignment_areas(row["user_id"])
        return profile_from_row(row, areas).model_dump()

    # ---- lahan ------------------------------------------------------------------

    def create_field(self, user_id: str, dto: CreateFarmerFieldDTO) -> dict:
        caller = resolve_caller_profile(self.repo, user_id)
        owner, _ = resolve_actor_context(self.repo, caller, dto.assistedSessionId)
        if dto.coords is not None:
            validate_coords(dto.coords.lat, dto.coords.lng)
        row = build_field_row(
            owner_profile_id=owner["id"],
            name=validate_field_name(dto.name),
            area_kabupaten=dto.areaKabupaten,
            area_kecamatan=dto.areaKecamatan,
            coords=dto.coords.model_dump() if dto.coords else None,
        )
        self.repo.insert_field(row)
        logger.info(
            f"field created: field={row['id']} owner={owner['id']} "
            f"assisted={dto.assistedSessionId or '-'}"
        )
        return field_from_row(row).model_dump()

    def update_field(self, user_id: str, dto: UpdateFarmerFieldDTO) -> dict:
        caller = resolve_caller_profile(self.repo, user_id)
        owner, _ = resolve_actor_context(self.repo, caller, dto.assistedSessionId)
        field = self.repo.get_field_by_id(dto.fieldId)
        if field is None or field["owner_profile_id"] != owner["id"]:
            # Identical body whether the lahan is missing or not the caller's.
            raise SiagaNotFoundError(FIELD_NOT_FOUND_MESSAGE)
        updates = self._field_updates(dto)
        updated = self.repo.update_field(
            dto.fieldId, {**updates, "updated_at": now_iso()}
        )
        logger.info(f"field updated: field={dto.fieldId} owner={owner['id']}")
        return field_from_row(updated).model_dump()

    @staticmethod
    def _field_updates(dto: UpdateFarmerFieldDTO) -> dict:
        provided = dto.model_dump(exclude_unset=True)
        updates = {}
        if "name" in provided:
            updates = {**updates, "name": validate_field_name(provided["name"])}
        if "areaKabupaten" in provided:
            updates = {**updates, "area_kabupaten": provided["areaKabupaten"]}
        if "areaKecamatan" in provided:
            updates = {**updates, "area_kecamatan": provided["areaKecamatan"]}
        if "coords" in provided:
            coords = provided["coords"]
            if coords is not None:
                validate_coords(coords["lat"], coords["lng"])
            updates = {**updates, "coords": coords}
        return updates

    def list_fields(
        self, user_id: str, dto: FindFarmerFieldsDTO
    ) -> tuple[list[dict], int]:
        caller = resolve_caller_profile(self.repo, user_id)
        rows, count = self.repo.find_fields(caller["id"], dto.page, dto.limit)
        stats = self.repo.get_field_case_stats(
            caller["id"], [row["id"] for row in rows]
        )
        cards = [
            field_from_row(
                row,
                last_growth_stage=(stats.get(row["id"]) or {}).get(
                    "last_growth_stage"
                ),
                case_count=(stats.get(row["id"]) or {}).get("case_count", 0),
            ).model_dump()
            for row in rows
        ]
        return cards, count

    # ---- deletion request -----------------------------------------------------

    def create_deletion_request(
        self, user_id: str, dto: DeletionRequestDTO
    ) -> dict:
        caller = resolve_caller_profile(self.repo, user_id)
        if dto.reason is not None and len(dto.reason) > NOTES_MAX_LENGTH:
            raise SiagaValidationError(REASON_TOO_LONG_MESSAGE)
        row = {
            "id": new_id(),
            "profile_id": caller["id"],
            "reason": dto.reason,
            "status": DELETION_STATUS_RECORDED,
            "requested_at": now_iso(),
            "processed_at": None,
        }
        self.repo.insert_deletion_request(row)
        logger.info(
            f"deletion request recorded: request={row['id']} profile={caller['id']}"
        )
        return deletion_request_from_row(row).model_dump()

    def get_latest_deletion_request(self, user_id: str) -> Optional[dict]:
        caller = resolve_caller_profile(self.repo, user_id)
        row = self.repo.get_latest_deletion_request(caller["id"])
        if row is None:
            return None
        return deletion_request_from_row(row).model_dump()
