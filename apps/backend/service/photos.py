"""Case-photo service — upload + quality gate, listing, FR-004 escalation.

Implements the Sprint 03 contract (`apps/web/docs/api-spec-photo.md`):
- Upload is idempotent by CONTENT: the sha256 fingerprint of the original
  bytes is unique per case, so re-sending the same photo (retry, replay)
  returns the SAME record (`replayed: true`), never a duplicate.
- EXIF (GPS included) is stripped and the size normalized BEFORE the object
  is written to storage; raw quality scores are logged server-side only.
- ≥2 accepted photos advance the case DRAFT→CAPTURED through the legal
  transition table (event recorded, linimasa-visible).
- 3 failed attempts on a slot unlock "Kirim ke Penyuluh Saja": the case is
  FLAGGED needs_human_review (no auto label) — Sprint 06 consumes the flag.

The repository is an injectable seam (`PhotoService(repo=...)`) so unit tests
run against an in-memory fake instead of Supabase.
"""
import hashlib
from typing import Optional, Protocol

from loguru import logger

from config.base import settings
from dto.siaga_photo import (
    CasePhotoListOut,
    EscalateOut,
    PhotoUploadOut,
    case_photo_from_row,
)
from exceptions.siaga_exceptions import (
    SiagaForbiddenError,
    SiagaNotFoundError,
    SiagaValidationError,
)
from models.siaga_case import (
    STATUS_CAPTURED,
    STATUS_DRAFT,
    STATUS_QUALITY_REJECTED,
    STATUS_REVISION_REQUIRED,
    display_stage_for,
    is_legal_transition,
)
from models.siaga_photo import (
    ACCEPTED_QUALITY_STATUSES,
    MAX_PHOTO_SLOTS,
    MAX_RETAKE_FAILURES,
    MIN_ACCEPTED_PHOTOS,
    QUALITY_DITOLAK,
    QUALITY_TIDAK_PASTI,
)
from service.quality_gate import (
    QUALITY_CONFIG_VERSION,
    assess_quality,
    strip_and_normalize,
)
from service.siaga_case_support import (
    SiagaCaseBaseRepository,
    is_case_visible,
    new_id,
    now_iso,
    resolve_caller_profile,
)

ALLOWED_CONTENT_TYPES = ("image/jpeg", "image/png", "image/webp")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # mirrors the bucket's file_size_limit
SIGNED_URL_EXPIRES_SECONDS = 10 * 60

# Case statuses in which photo work is legal (capture, retake, extra photo).
PHOTO_UPLOAD_STATUSES = (
    STATUS_DRAFT,
    STATUS_CAPTURED,
    STATUS_QUALITY_REJECTED,
    STATUS_REVISION_REQUIRED,
)
# Statuses that advance to CAPTURED once enough accepted photos exist.
ADVANCE_FROM_STATUSES = (
    STATUS_DRAFT,
    STATUS_QUALITY_REJECTED,
    STATUS_REVISION_REQUIRED,
)
FAILED_QUALITY_STATUSES = (QUALITY_DITOLAK, QUALITY_TIDAK_PASTI)

CASE_NOT_FOUND_MESSAGE = "Kasus tidak ditemukan."
UPLOAD_ROLE_DENIED_MESSAGE = (
    "Hanya pemilik kasus atau pendampingnya yang dapat mengunggah foto."
)
CASE_NOT_IN_PHOTO_STAGE_MESSAGE = "Kasus tidak dalam tahap pengambilan foto."
INVALID_SLOT_MESSAGE = f"Nomor slot foto harus 1 sampai {MAX_PHOTO_SLOTS}."
INVALID_CONTENT_TYPE_MESSAGE = "Format berkas harus JPEG, PNG, atau WebP."
FILE_TOO_LARGE_MESSAGE = "Ukuran berkas maksimal 10 MB."
EMPTY_FILE_MESSAGE = "Berkas foto kosong."
ESCALATE_NOT_ELIGIBLE_MESSAGE = (
    "Opsi kirim ke penyuluh tersedia setelah 3 kali foto gagal."
)
ALREADY_ESCALATED_MESSAGE = "Kasus sudah ditandai untuk review penyuluh."
REVIEW_REASON_LOW_QUALITY = "kualitas_foto_rendah"
CAPTURED_EVENT_NOTE = "Foto layak terpenuhi — kasus siap dianalisis"
ESCALATION_EVENT_NOTE = (
    "Dikirim ke penyuluh tanpa analisis otomatis (kualitas foto rendah)"
)


class PhotoRepositoryProtocol(Protocol):
    """Data-access seam consumed by `PhotoService` (fakeable in tests)."""

    def get_profile_by_user_id(self, user_id: str) -> Optional[dict]: ...

    def get_assignment_areas(self, user_id: str) -> list[str]: ...

    def get_field_by_id(self, field_id: str) -> Optional[dict]: ...

    def get_case_by_id(self, case_id: str) -> Optional[dict]: ...

    def update_case(self, case_id: str, fields: dict) -> dict: ...

    def insert_event(self, row: dict) -> dict: ...

    def list_photos(self, case_id: str) -> list[dict]: ...

    def get_photo_by_fingerprint(
        self, case_id: str, fingerprint: str
    ) -> Optional[dict]: ...

    def insert_photo(self, row: dict) -> dict: ...

    def upload_object(self, path: str, data: bytes, content_type: str) -> None: ...

    def create_signed_url(self, path: str, expires_in: int) -> Optional[str]: ...


class PhotoRepository(SiagaCaseBaseRepository):
    """Supabase-backed implementation of the photo data seam."""

    def __init__(self) -> None:
        super().__init__()
        self.photo_table = settings.SUPABASE_TABLE_CASE_PHOTO
        self.event_table = settings.SUPABASE_TABLE_CASE_EVENT
        self.bucket = settings.SUPABASE_BUCKET_CASE_PHOTOS

    def get_case_by_id(self, case_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.case_table).select("*").eq("id", case_id)
        )

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

    def get_photo_by_fingerprint(
        self, case_id: str, fingerprint: str
    ) -> Optional[dict]:
        return self._first(
            self.table(self.photo_table)
            .select("*")
            .eq("case_id", case_id)
            .eq("fingerprint", fingerprint)
        )

    def insert_photo(self, row: dict) -> dict:
        self.table(self.photo_table).insert(row).execute()
        return row

    def upload_object(self, path: str, data: bytes, content_type: str) -> None:
        self.supabase.storage.from_(self.bucket).upload(
            path, data, {"content-type": content_type, "upsert": "true"}
        )

    def create_signed_url(self, path: str, expires_in: int) -> Optional[str]:
        """Signed URL or None — a signing hiccup must never break listing."""
        try:
            response = self.supabase.storage.from_(self.bucket).create_signed_url(
                path, expires_in
            )
            return response.get("signedURL") or response.get("signedUrl")
        except Exception as error:
            logger.warning(f"signed url failed for {path}: {error}")
            return None


class PhotoService:
    """Upload / list / escalate per the Sprint 03 contract."""

    def __init__(self, repo: Optional[PhotoRepositoryProtocol] = None) -> None:
        self._repo = repo

    @property
    def repo(self) -> PhotoRepositoryProtocol:
        if self._repo is None:
            self._repo = PhotoRepository()
        return self._repo

    # ---- upload -------------------------------------------------------------

    def upload_photo(
        self,
        user_id: str,
        case_id: str,
        slot_no: int,
        content_type: Optional[str],
        data: bytes,
    ) -> dict:
        caller = resolve_caller_profile(self.repo, user_id)
        case = self._get_uploadable_case(caller, case_id)
        self._validate_upload(slot_no, content_type, data)
        fingerprint = hashlib.sha256(data).hexdigest()
        existing = self.repo.get_photo_by_fingerprint(case_id, fingerprint)
        if existing is not None:
            logger.info(f"photo upload replayed: photo={existing['id']}")
            return self._upload_out(case, existing, replayed=True)
        row = self._process_and_store(case, slot_no, fingerprint, data)
        row, replayed = self._insert_photo_idempotent(row, case_id, fingerprint)
        if not replayed:
            case = self._maybe_advance_case(case, caller)
        return self._upload_out(case, row, replayed=replayed)

    def _validate_upload(
        self, slot_no: int, content_type: Optional[str], data: bytes
    ) -> None:
        if not 1 <= slot_no <= MAX_PHOTO_SLOTS:
            raise SiagaValidationError(INVALID_SLOT_MESSAGE)
        if (content_type or "").lower() not in ALLOWED_CONTENT_TYPES:
            raise SiagaValidationError(INVALID_CONTENT_TYPE_MESSAGE)
        if not data:
            raise SiagaValidationError(EMPTY_FILE_MESSAGE)
        if len(data) > MAX_UPLOAD_BYTES:
            raise SiagaValidationError(FILE_TOO_LARGE_MESSAGE)

    def _process_and_store(
        self, case: dict, slot_no: int, fingerprint: str, data: bytes
    ) -> dict:
        """Normalize (EXIF gone), assess, write the object, build the row."""
        normalized = strip_and_normalize(data)
        assessment = assess_quality(normalized)
        photo_id = new_id()
        storage_path = f"cases/{case['id']}/slot-{slot_no}/{photo_id}.jpg"
        self.repo.upload_object(storage_path, normalized.data, "image/jpeg")
        # Raw scores are log-only by contract — never in the DTO.
        logger.info(
            f"photo assessed: case={case['id']} slot={slot_no} "
            f"status={assessment.status} reasons={assessment.reasons} "
            f"scores={assessment.scores} config={QUALITY_CONFIG_VERSION}"
        )
        now = now_iso()
        is_failed = assessment.status in FAILED_QUALITY_STATUSES
        return {
            "id": photo_id,
            "case_id": case["id"],
            "slot_no": slot_no,
            "storage_path": storage_path,
            "quality_status": assessment.status,
            "reject_reasons": assessment.reasons,
            "retake_count": self._failures_for_slot(case["id"], slot_no),
            "fingerprint": fingerprint,
            "quality_config_version": QUALITY_CONFIG_VERSION,
            "exif_stripped": True,
            # Rejected photos are kept for UX evaluation but must never be
            # used to train models (brief §4.2).
            "never_for_training": is_failed,
            "created_at": now,
            "updated_at": now,
        }

    def _insert_photo_idempotent(
        self, row: dict, case_id: str, fingerprint: str
    ) -> tuple[dict, bool]:
        """Insert; on a concurrent-replay unique violation re-read by print."""
        try:
            return self.repo.insert_photo(row), False
        except Exception:
            existing = self.repo.get_photo_by_fingerprint(case_id, fingerprint)
            if existing is not None:
                logger.info(f"photo replayed after race: photo={existing['id']}")
                return existing, True
            raise

    def _maybe_advance_case(self, case: dict, caller: dict) -> dict:
        """≥2 accepted photos → CAPTURED via the legal transition table."""
        if case["status"] not in ADVANCE_FROM_STATUSES:
            return case
        photos = self.repo.list_photos(case["id"])
        if self._accepted_count(photos) < MIN_ACCEPTED_PHOTOS:
            return case
        if not is_legal_transition(case["status"], STATUS_CAPTURED):
            return case
        updated = self.repo.update_case(
            case["id"], {"status": STATUS_CAPTURED, "updated_at": now_iso()}
        )
        self.repo.insert_event(
            {
                "id": new_id(),
                "case_id": case["id"],
                "from_status": case["status"],
                "to_status": STATUS_CAPTURED,
                "actor_profile_id": caller["id"],
                "note": CAPTURED_EVENT_NOTE,
                "created_at": now_iso(),
            }
        )
        logger.info(f"case advanced to CAPTURED: case={case['id']}")
        return {**case, **updated, "status": STATUS_CAPTURED}

    # ---- list ---------------------------------------------------------------

    def list_photos(self, user_id: str, case_id: str) -> dict:
        caller = resolve_caller_profile(self.repo, user_id)
        case = self._get_visible_case(caller, case_id)
        photos = self.repo.list_photos(case_id)
        return CasePhotoListOut(
            photos=[self._photo_out(row) for row in photos],
            acceptedCount=self._accepted_count(photos),
            canEscalate=self._can_escalate(case, photos),
            needsHumanReview=bool(case.get("needs_human_review")),
            caseStatus=case["status"],
            caseDisplayStage=display_stage_for(case["status"]),
        ).model_dump()

    # ---- escalation (FR-004: "Kirim ke Penyuluh Saja") -----------------------

    def escalate(self, user_id: str, case_id: str) -> dict:
        caller = resolve_caller_profile(self.repo, user_id)
        case = self._get_uploadable_case(caller, case_id)
        if case.get("needs_human_review"):
            raise SiagaValidationError(ALREADY_ESCALATED_MESSAGE)
        photos = self.repo.list_photos(case_id)
        if not self._can_escalate(case, photos):
            raise SiagaValidationError(ESCALATE_NOT_ELIGIBLE_MESSAGE)
        updated = self.repo.update_case(
            case_id,
            {
                "needs_human_review": True,
                "review_reason": REVIEW_REASON_LOW_QUALITY,
                "updated_at": now_iso(),
            },
        )
        case = {**case, **updated, "needs_human_review": True}
        case = self._advance_after_escalation(case, caller)
        logger.info(f"case escalated to human review: case={case_id}")
        return EscalateOut(
            caseId=case_id,
            needsHumanReview=True,
            caseStatus=case["status"],
            caseDisplayStage=display_stage_for(case["status"]),
        ).model_dump()

    def _advance_after_escalation(self, case: dict, caller: dict) -> dict:
        """Escalated cases move DRAFT→CAPTURED (photos as-is, no auto label)."""
        if not is_legal_transition(case["status"], STATUS_CAPTURED):
            return case
        self.repo.update_case(
            case["id"], {"status": STATUS_CAPTURED, "updated_at": now_iso()}
        )
        self.repo.insert_event(
            {
                "id": new_id(),
                "case_id": case["id"],
                "from_status": case["status"],
                "to_status": STATUS_CAPTURED,
                "actor_profile_id": caller["id"],
                "note": ESCALATION_EVENT_NOTE,
                "created_at": now_iso(),
            }
        )
        return {**case, "status": STATUS_CAPTURED}

    # ---- shared helpers ------------------------------------------------------

    def _get_visible_case(self, caller: dict, case_id: str) -> dict:
        """Missing and invisible cases raise the IDENTICAL 404."""
        row = self.repo.get_case_by_id(case_id)
        if row is None or not is_case_visible(self.repo, row, caller):
            raise SiagaNotFoundError(CASE_NOT_FOUND_MESSAGE)
        return row

    def _get_uploadable_case(self, caller: dict, case_id: str) -> dict:
        """Writes are tighter than reads: owner or the assisted creator only."""
        case = self._get_visible_case(caller, case_id)
        is_actor = caller["id"] in (
            case["owner_profile_id"],
            case["created_by_profile_id"],
        )
        if not is_actor:
            raise SiagaForbiddenError(UPLOAD_ROLE_DENIED_MESSAGE)
        if case["status"] not in PHOTO_UPLOAD_STATUSES:
            raise SiagaValidationError(CASE_NOT_IN_PHOTO_STAGE_MESSAGE)
        return case

    def _failures_for_slot(self, case_id: str, slot_no: int) -> int:
        photos = self.repo.list_photos(case_id)
        return sum(
            1
            for row in photos
            if row["slot_no"] == slot_no
            and row["quality_status"] in FAILED_QUALITY_STATUSES
        )

    @staticmethod
    def _accepted_count(photos: list[dict]) -> int:
        """Distinct slots holding an accepted (layak/ambang) photo."""
        slots = {
            row["slot_no"]
            for row in photos
            if row["quality_status"] in ACCEPTED_QUALITY_STATUSES
        }
        return len(slots)

    def _can_escalate(self, case: dict, photos: list[dict]) -> bool:
        """3 failures on any slot, while the minimum is still unmet."""
        if case.get("needs_human_review"):
            return False
        if self._accepted_count(photos) >= MIN_ACCEPTED_PHOTOS:
            return False
        failures: dict[int, int] = {}
        for row in photos:
            if row["quality_status"] in FAILED_QUALITY_STATUSES:
                failures[row["slot_no"]] = failures.get(row["slot_no"], 0) + 1
        return any(count >= MAX_RETAKE_FAILURES for count in failures.values())

    def _upload_out(self, case: dict, row: dict, replayed: bool) -> dict:
        photos = self.repo.list_photos(case["id"])
        # The fresh case row: an upload may just have advanced the status.
        current = self.repo.get_case_by_id(case["id"]) or case
        return PhotoUploadOut(
            photo=self._photo_out(row),
            replayed=replayed,
            acceptedCount=self._accepted_count(photos),
            canEscalate=self._can_escalate(current, photos),
            caseStatus=current["status"],
            caseDisplayStage=display_stage_for(current["status"]),
        ).model_dump()

    def _photo_out(self, row: dict) -> dict:
        signed_url = self.repo.create_signed_url(
            row["storage_path"], SIGNED_URL_EXPIRES_SECONDS
        )
        return case_photo_from_row(row, signed_url=signed_url).model_dump()
