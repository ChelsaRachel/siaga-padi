"""Case service — idempotent create, scoped list, detail, timeline.

Implements the pinned Sprint 02 contract (`apps/web/docs/api-spec-case.md`):
- `POST /cases` is idempotent via the required `Idempotency-Key` header —
  replaying a key returns the SAME case (`replayed: true`), never a duplicate.
- List scoping is SERVER-SIDE by role: petani → own cases only, penyuluh →
  binaan-kecamatan cases (case area or its field's), admin/reviewer → all.
- Detail/timeline return an IDENTICAL 404 body whether the case is missing or
  merely invisible to the caller (no enumeration).

The repository is an injectable seam (`CaseService(repo=...)`) so unit tests
run against an in-memory fake instead of Supabase.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Protocol

from loguru import logger

from config.base import settings
from dto.cases import CaseFiltersDTO, CreateCaseDTO, FindCasesDTO
from dto.siaga_case import case_event_from_row, case_from_row
from exceptions.siaga_exceptions import (
    SiagaForbiddenError,
    SiagaNotFoundError,
    SiagaValidationError,
)
from models.siaga_case import (
    CASE_STATUSES,
    DISPLAY_STAGE_MAP,
    GROWTH_STAGES,
    LOCATION_MODE_AREA_ONLY,
    LOCATION_MODE_EXACT_GPS,
    LOCATION_MODE_NONE,
    LOCATION_MODES,
    NOTES_MAX_LENGTH,
    STATUS_DRAFT,
)
from models.siaga_profile import (
    ROLE_ADMIN,
    ROLE_DOMAIN_REVIEWER,
    ROLE_PENYULUH,
    ROLE_PETANI,
)
from service.siaga_case_support import (
    FIELD_NOT_FOUND_MESSAGE,
    SiagaCaseBaseRepository,
    build_field_row,
    new_id,
    now_iso,
    parse_timestamp,
    resolve_actor_context,
    resolve_caller_profile,
    validate_coords,
    validate_field_name,
)

OBSERVED_AT_MAX_FUTURE_SECONDS = 10 * 60  # contract: <= now + 10 min skew
DATE_ONLY_LENGTH = 10  # 'YYYY-MM-DD'
END_OF_DAY_SUFFIX = "T23:59:59.999999+00:00"
CREATION_EVENT_NOTE = "Kasus dibuat"

MISSING_IDEMPOTENCY_KEY_MESSAGE = "Header Idempotency-Key wajib diisi."
FIELD_XOR_MESSAGE = "Isi salah satu saja: fieldId atau newField."
FIELD_OR_AREA_REQUIRED_MESSAGE = (
    "Pilih lahan, isi wilayah, atau gunakan mode lokasi NONE."
)
AREA_REQUIRED_MESSAGE = "Mode AREA_ONLY membutuhkan areaKabupaten dan areaKecamatan."
COORDS_ONLY_EXACT_GPS_MESSAGE = "Koordinat hanya boleh dikirim dengan mode EXACT_GPS."
INVALID_GROWTH_STAGE_MESSAGE = "Fase pertumbuhan tidak valid."
INVALID_LOCATION_MODE_MESSAGE = "Mode lokasi tidak valid."
INVALID_OBSERVED_AT_MESSAGE = "Waktu pengamatan tidak valid."
OBSERVED_AT_TOO_FAR_MESSAGE = "Waktu pengamatan tidak boleh melebihi waktu saat ini."
NOTES_TOO_LONG_MESSAGE = f"Catatan maksimal {NOTES_MAX_LENGTH} karakter."
INVALID_DISPLAY_STAGE_FILTER_MESSAGE = "Filter displayStage tidak valid."
INVALID_STATUS_FILTER_MESSAGE = "Filter status tidak valid."
INVALID_DATE_FILTER_MESSAGE = "Format tanggal filter tidak valid."
CASE_NOT_FOUND_MESSAGE = "Kasus tidak ditemukan."
CREATE_ROLE_DENIED_MESSAGE = (
    "Kasus hanya dapat dibuat oleh petani, atau oleh penyuluh dalam mode pendampingan."
)
# Generic on purpose: never confirms whether (or whose) a foreign key exists.
IDEMPOTENCY_KEY_INVALID_MESSAGE = "Kunci idempotensi tidak valid."


class CaseRepositoryProtocol(Protocol):
    """Data-access seam consumed by `CaseService` (fakeable in tests)."""

    def get_profile_by_user_id(self, user_id: str) -> Optional[dict]: ...

    def get_profile_by_id(self, profile_id: str) -> Optional[dict]: ...

    def get_profiles_by_ids(self, profile_ids: list[str]) -> dict[str, dict]: ...

    def get_session(self, session_id: str) -> Optional[dict]: ...

    def get_assignment_areas(self, user_id: str) -> list[str]: ...

    def get_field_by_id(self, field_id: str) -> Optional[dict]: ...

    def get_fields_by_ids(self, field_ids: list[str]) -> dict[str, dict]: ...

    def insert_field(self, row: dict) -> dict: ...

    def next_case_code(self) -> str: ...

    def get_case_by_idempotency_key(self, key: str) -> Optional[dict]: ...

    def get_case_by_id(self, case_id: str) -> Optional[dict]: ...

    def insert_case(self, row: dict) -> dict: ...

    def insert_event(self, row: dict) -> dict: ...

    def list_events(self, case_id: str) -> list[dict]: ...

    def find_cases(
        self,
        filters: dict,
        page: int,
        limit: int,
        owner_profile_id: Optional[str] = None,
        areas: Optional[list[str]] = None,
    ) -> tuple[list[dict], int]: ...


class CaseRepository(SiagaCaseBaseRepository):
    """Supabase-backed implementation of the case data seam."""

    def __init__(self) -> None:
        super().__init__()
        self.event_table = settings.SUPABASE_TABLE_CASE_EVENT

    def get_fields_by_ids(self, field_ids: list[str]) -> dict[str, dict]:
        if not field_ids:
            return {}
        rows = (
            self.table(self.field_table)
            .select("id, name, area_kecamatan")
            .in_("id", list(set(field_ids)))
            .execute()
            .data
            or []
        )
        return {row["id"]: row for row in rows}

    def next_case_code(self) -> str:
        """Reserve the next 'KS-YYYY-NNNNNN' code via the Postgres function."""
        response = (
            self.supabase.schema(settings.SUPABASE_SCHEMA)
            .rpc("next_case_code", {})
            .execute()
        )
        return str(response.data)

    def get_case_by_idempotency_key(self, key: str) -> Optional[dict]:
        return self._first(
            self.table(self.case_table).select("*").eq("idempotency_key", key)
        )

    def get_case_by_id(self, case_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.case_table).select("*").eq("id", case_id)
        )

    def insert_case(self, row: dict) -> dict:
        self.table(self.case_table).insert(row).execute()
        return row

    def insert_event(self, row: dict) -> dict:
        self.table(self.event_table).insert(row).execute()
        return row

    def list_events(self, case_id: str) -> list[dict]:
        response = (
            self.table(self.event_table)
            .select("*")
            .eq("case_id", case_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data or []

    def find_cases(
        self,
        filters: dict,
        page: int,
        limit: int,
        owner_profile_id: Optional[str] = None,
        areas: Optional[list[str]] = None,
    ) -> tuple[list[dict], int]:
        if areas is not None and not areas:
            return [], 0  # penyuluh without assignments sees nothing
        query = self.table(self.case_table).select("*", count="exact")
        if owner_profile_id is not None:
            query = query.eq("owner_profile_id", owner_profile_id)
        elif areas is not None:
            query = query.or_(self._area_scope_clause(areas))
        query = self._apply_filters(query, filters)
        start = (page - 1) * limit
        response = (
            query.order("created_at", desc=True)
            .range(start, start + limit - 1)
            .execute()
        )
        return response.data or [], (response.count or 0)

    def _area_scope_clause(self, areas: list[str]) -> str:
        """PostgREST OR: case area in binaan, or its field's area in binaan."""
        area_list = ",".join(f'"{area}"' for area in areas)
        clauses = [f"area_kecamatan.in.({area_list})"]
        field_ids = self._field_ids_in_areas(areas)
        if field_ids:
            id_list = ",".join(f'"{field_id}"' for field_id in field_ids)
            clauses = [*clauses, f"field_id.in.({id_list})"]
        return ",".join(clauses)

    def _field_ids_in_areas(self, areas: list[str]) -> list[str]:
        rows = (
            self.table(self.field_table)
            .select("id")
            .in_("area_kecamatan", areas)
            .execute()
            .data
            or []
        )
        return [row["id"] for row in rows]

    @staticmethod
    def _apply_filters(query, filters: dict):
        if filters.get("field_id"):
            query = query.eq("field_id", filters["field_id"])
        if filters.get("statuses") is not None:
            query = query.in_("status", filters["statuses"])
        if filters.get("date_from"):
            query = query.gte("created_at", filters["date_from"])
        if filters.get("date_to"):
            query = query.lte("created_at", filters["date_to"])
        return query


class CaseService:
    """Create / list / detail / timeline per the pinned contract."""

    def __init__(self, repo: Optional[CaseRepositoryProtocol] = None) -> None:
        self._repo = repo

    @property
    def repo(self) -> CaseRepositoryProtocol:
        if self._repo is None:
            self._repo = CaseRepository()
        return self._repo

    # ---- create -------------------------------------------------------------

    def create_case(
        self, user_id: str, idempotency_key: Optional[str], dto: CreateCaseDTO
    ) -> dict:
        key = (idempotency_key or "").strip()
        if not key:
            raise SiagaValidationError(MISSING_IDEMPOTENCY_KEY_MESSAGE)
        caller = resolve_caller_profile(self.repo, user_id)
        existing = self.repo.get_case_by_idempotency_key(key)
        if existing is not None:
            self._assert_replay_belongs_to(existing, caller)
            logger.info(f"case create replayed: case={existing['id']}")
            return {"case": self._case_out(existing), "replayed": True}
        observed_at = self._validate_create(dto)
        self._assert_may_create(caller, dto.assistedSessionId)
        owner, created_by = resolve_actor_context(
            self.repo, caller, dto.assistedSessionId
        )
        field_row = self._resolve_field(dto, owner)
        case_row = self._build_case_row(
            dto, key, observed_at, owner, created_by, field_row
        )
        case_row, replayed = self._insert_case_idempotent(case_row, key, caller)
        if not replayed:
            self._record_creation_event(case_row, created_by)
            self._log_created(case_row, dto)
        return {"case": self._case_out(case_row), "replayed": replayed}

    def _validate_create(self, dto: CreateCaseDTO) -> str:
        """Contract FR-002 rules; returns the normalized observedAt ISO."""
        if dto.growthStage not in GROWTH_STAGES:
            raise SiagaValidationError(INVALID_GROWTH_STAGE_MESSAGE)
        if dto.locationMode not in LOCATION_MODES:
            raise SiagaValidationError(INVALID_LOCATION_MODE_MESSAGE)
        if dto.fieldId is not None and dto.newField is not None:
            raise SiagaValidationError(FIELD_XOR_MESSAGE)
        if dto.coords is not None and dto.locationMode != LOCATION_MODE_EXACT_GPS:
            raise SiagaValidationError(COORDS_ONLY_EXACT_GPS_MESSAGE)
        if dto.coords is not None:
            validate_coords(dto.coords.lat, dto.coords.lng)
        if dto.notes is not None and len(dto.notes) > NOTES_MAX_LENGTH:
            raise SiagaValidationError(NOTES_TOO_LONG_MESSAGE)
        self._validate_location_minimum(dto)
        return self._validate_observed_at(dto.observedAt)

    @staticmethod
    def _validate_location_minimum(dto: CreateCaseDTO) -> None:
        """No lahan at all is only legal for NONE or AREA_ONLY-with-area."""
        if dto.fieldId is not None or dto.newField is not None:
            return
        if dto.locationMode == LOCATION_MODE_NONE:
            return
        has_area = bool(dto.areaKabupaten) and bool(dto.areaKecamatan)
        if dto.locationMode == LOCATION_MODE_AREA_ONLY and has_area:
            return
        if dto.locationMode == LOCATION_MODE_AREA_ONLY:
            raise SiagaValidationError(AREA_REQUIRED_MESSAGE)
        raise SiagaValidationError(FIELD_OR_AREA_REQUIRED_MESSAGE)

    @staticmethod
    def _validate_observed_at(observed_at: Optional[str]) -> str:
        parsed = parse_timestamp(observed_at)
        if parsed is None:
            raise SiagaValidationError(INVALID_OBSERVED_AT_MESSAGE)
        max_allowed = datetime.now(timezone.utc) + timedelta(
            seconds=OBSERVED_AT_MAX_FUTURE_SECONDS
        )
        if parsed > max_allowed:
            raise SiagaValidationError(OBSERVED_AT_TOO_FAR_MESSAGE)
        return parsed.isoformat()

    def _resolve_field(self, dto: CreateCaseDTO, owner: dict) -> Optional[dict]:
        """Load the chosen lahan (must be the owner's) or create the new one."""
        if dto.fieldId is not None:
            field = self.repo.get_field_by_id(dto.fieldId)
            if field is None or field["owner_profile_id"] != owner["id"]:
                raise SiagaValidationError(FIELD_NOT_FOUND_MESSAGE)
            return field
        if dto.newField is None:
            return None
        row = build_field_row(
            owner_profile_id=owner["id"],
            name=validate_field_name(dto.newField.name),
            area_kabupaten=dto.newField.areaKabupaten,
            area_kecamatan=dto.newField.areaKecamatan,
            coords=None,
        )
        return self.repo.insert_field(row)

    def _build_case_row(
        self,
        dto: CreateCaseDTO,
        key: str,
        observed_at: str,
        owner: dict,
        created_by: dict,
        field_row: Optional[dict],
    ) -> dict:
        now = now_iso()
        field = field_row or {}
        return {
            "id": new_id(),
            "case_code": self.repo.next_case_code(),
            "owner_profile_id": owner["id"],
            "created_by_profile_id": created_by["id"],
            "assisted_session_id": dto.assistedSessionId,
            "field_id": field.get("id"),
            "growth_stage": dto.growthStage,
            "location_mode": dto.locationMode,
            "coords": dto.coords.model_dump() if dto.coords else None,
            "area_kabupaten": dto.areaKabupaten or field.get("area_kabupaten"),
            "area_kecamatan": dto.areaKecamatan or field.get("area_kecamatan"),
            "status": STATUS_DRAFT,
            "notes": dto.notes,
            "observed_at": observed_at,
            "idempotency_key": key,
            "config_version_id": None,
            "created_at": now,
            "updated_at": now,
        }

    def _insert_case_idempotent(
        self, row: dict, key: str, caller: dict
    ) -> tuple[dict, bool]:
        """Insert; on a concurrent-replay unique violation re-read by key."""
        try:
            return self.repo.insert_case(row), False
        except Exception:
            existing = self.repo.get_case_by_idempotency_key(key)
            if existing is not None:
                self._assert_replay_belongs_to(existing, caller)
                logger.info(f"case create replayed after race: case={existing['id']}")
                return existing, True
            raise

    @staticmethod
    def _assert_may_create(caller: dict, assisted_session_id: Optional[str]) -> None:
        """Contract: cases belong to farmers.

        Only a petani may create their own case; a penyuluh may create one only
        on behalf of a farmer (assisted session). Without this an unattended
        penyuluh submit would silently own the case instead of the farmer, and
        admin/reviewer accounts could pollute oversight data.
        """
        role = caller["role"]
        if role == ROLE_PETANI:
            return
        if role == ROLE_PENYULUH and assisted_session_id is not None:
            return
        logger.warning(
            f"case create denied: profile={caller['id']} role={role} "
            f"assisted={assisted_session_id or '-'}"
        )
        raise SiagaForbiddenError(CREATE_ROLE_DENIED_MESSAGE)

    @staticmethod
    def _assert_replay_belongs_to(existing: dict, caller: dict) -> None:
        """A key only replays for its own creator — a foreign key must never
        leak another user's case (400, message confirms nothing)."""
        if existing["created_by_profile_id"] != caller["id"]:
            logger.warning(
                f"idempotency key replay denied: caller={caller['id']} "
                f"case={existing['id']}"
            )
            raise SiagaValidationError(IDEMPOTENCY_KEY_INVALID_MESSAGE)

    def _record_creation_event(self, case_row: dict, created_by: dict) -> None:
        self.repo.insert_event(
            {
                "id": new_id(),
                "case_id": case_row["id"],
                "from_status": None,
                "to_status": STATUS_DRAFT,
                "actor_profile_id": created_by["id"],
                "note": CREATION_EVENT_NOTE,
                "created_at": now_iso(),
            }
        )

    @staticmethod
    def _log_created(case_row: dict, dto: CreateCaseDTO) -> None:
        """Audit trail — profile ids only, never coords or notes."""
        logger.info(
            f"case created: case={case_row['id']} code={case_row['case_code']} "
            f"owner={case_row['owner_profile_id']} "
            f"created_by={case_row['created_by_profile_id']} "
            f"assisted={dto.assistedSessionId or '-'} "
            f"mode={case_row['location_mode']}"
        )

    # ---- list -----------------------------------------------------------------

    def list_cases(self, user_id: str, dto: FindCasesDTO) -> tuple[list[dict], int]:
        caller = resolve_caller_profile(self.repo, user_id)
        filters = self._normalize_filters(dto.filters)
        scope = self._scope_for(caller)
        rows, count = self.repo.find_cases(filters, dto.page, dto.limit, **scope)
        return self._cases_out(rows), count

    def _scope_for(self, caller: dict) -> dict:
        """Server-side visibility scope by role — never trusted from the client."""
        role = caller["role"]
        if role in (ROLE_ADMIN, ROLE_DOMAIN_REVIEWER):
            return {}
        if role == ROLE_PENYULUH:
            return {"areas": self.repo.get_assignment_areas(caller["user_id"])}
        return {"owner_profile_id": caller["id"]}

    def _normalize_filters(self, filters: Optional[CaseFiltersDTO]) -> dict:
        if filters is None:
            return {}
        statuses = self._statuses_filter(filters)
        return {
            "field_id": filters.fieldId,
            "statuses": statuses,
            "date_from": self._normalize_date(filters.dateFrom, is_end=False),
            "date_to": self._normalize_date(filters.dateTo, is_end=True),
        }

    @staticmethod
    def _statuses_filter(filters: CaseFiltersDTO) -> Optional[list[str]]:
        """Expand displayStage to its canonical set; intersect with status."""
        statuses: Optional[list[str]] = None
        if filters.displayStage is not None:
            if filters.displayStage not in DISPLAY_STAGE_MAP.values():
                raise SiagaValidationError(INVALID_DISPLAY_STAGE_FILTER_MESSAGE)
            statuses = [
                status
                for status, stage in DISPLAY_STAGE_MAP.items()
                if stage == filters.displayStage
            ]
        if filters.status is not None:
            if filters.status not in CASE_STATUSES:
                raise SiagaValidationError(INVALID_STATUS_FILTER_MESSAGE)
            in_stage = statuses is None or filters.status in statuses
            statuses = [filters.status] if in_stage else []
        return statuses

    @staticmethod
    def _normalize_date(value: Optional[str], is_end: bool) -> Optional[str]:
        if value is None:
            return None
        if parse_timestamp(value) is None:
            raise SiagaValidationError(INVALID_DATE_FILTER_MESSAGE)
        if len(value) == DATE_ONLY_LENGTH and is_end:
            return f"{value}{END_OF_DAY_SUFFIX}"  # inclusive end of day
        return value

    # ---- detail + timeline -------------------------------------------------

    def get_case(self, user_id: str, case_id: str) -> dict:
        row = self._get_visible_case(user_id, case_id)
        return self._case_out(row)

    def get_timeline(self, user_id: str, case_id: str) -> list[dict]:
        row = self._get_visible_case(user_id, case_id)
        events = self.repo.list_events(row["id"])
        actor_ids = [e["actor_profile_id"] for e in events if e.get("actor_profile_id")]
        profiles = self.repo.get_profiles_by_ids(actor_ids)
        return [
            case_event_from_row(
                event,
                actor_display_name=(
                    profiles.get(event.get("actor_profile_id")) or {}
                ).get("display_name"),
            ).model_dump()
            for event in events
        ]

    def _get_visible_case(self, user_id: str, case_id: str) -> dict:
        """Missing and invisible cases raise the IDENTICAL 404 (no enumeration)."""
        caller = resolve_caller_profile(self.repo, user_id)
        row = self.repo.get_case_by_id(case_id)
        if row is None or not self._is_visible(row, caller):
            raise SiagaNotFoundError(CASE_NOT_FOUND_MESSAGE)
        return row

    def _is_visible(self, row: dict, caller: dict) -> bool:
        role = caller["role"]
        if row["owner_profile_id"] == caller["id"]:
            return True
        if role in (ROLE_ADMIN, ROLE_DOMAIN_REVIEWER):
            return True
        if role != ROLE_PENYULUH:
            return False
        areas = self.repo.get_assignment_areas(caller["user_id"])
        if row.get("area_kecamatan") in areas:
            return True
        if not row.get("field_id"):
            return False
        field = self.repo.get_field_by_id(row["field_id"]) or {}
        return field.get("area_kecamatan") in areas

    # ---- DTO building ----------------------------------------------------------

    def _case_out(self, row: dict) -> dict:
        return self._cases_out([row])[0]

    def _cases_out(self, rows: list[dict]) -> list[dict]:
        """Batch-join display names and lahan names (no N+1)."""
        profile_ids = [row["owner_profile_id"] for row in rows] + [
            row["created_by_profile_id"] for row in rows
        ]
        field_ids = [row["field_id"] for row in rows if row.get("field_id")]
        profiles = self.repo.get_profiles_by_ids(profile_ids)
        fields = self.repo.get_fields_by_ids(field_ids)
        return [
            case_from_row(
                row,
                owner_display_name=(
                    profiles.get(row["owner_profile_id"]) or {}
                ).get("display_name"),
                created_by_display_name=(
                    profiles.get(row["created_by_profile_id"]) or {}
                ).get("display_name"),
                field_name=(fields.get(row.get("field_id")) or {}).get("name"),
            ).model_dump()
            for row in rows
        ]
