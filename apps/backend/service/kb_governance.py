"""KB governance — source catalog, chunk approval, versioning, retirement.

Implements the Sprint 04 contract (`apps/web/docs/api-spec-kb.md`). The rules
that make this module worth its own layer:

- **The policy gate.** A chunk whose CONTENT carries dosage or brand material
  cannot be approved without a policy flag. The check re-reads the content at
  approval time (`detect_policy_flag`) — never the ingest-time suggestion — so
  a wrong or cleared suggestion can't open the narration gate.
- **Versions, not overwrites.** A revision writes a NEW row under the same
  `ref_code`, marks the previous one superseded, and lands `menunggu` again.
  Old citations keep resolving to the exact text that was approved back then.
- **Retirement keeps history.** A retired source drops out of the active index
  (the view joins on `kb_sources.status`), while its chunks stay readable so a
  Sprint 05 reference drawer can still show "versi lama — sudah dipensiunkan".
- **Every decision is audited.** `kb_audit_events` is append-only by trigger.

The repository is an injectable seam (`KbGovernanceService(repo=...)`) so unit
tests run against an in-memory fake instead of Supabase.
"""
import difflib
from typing import Optional

from loguru import logger

from dto.siaga_kb import (
    KbChunkDiffOut,
    kb_chunk_from_row,
    kb_chunk_version_from_row,
    kb_source_from_row,
)
from exceptions.siaga_exceptions import SiagaNotFoundError, SiagaValidationError
from models.siaga_kb import (
    ACTION_TYPES,
    APPROVAL_DISETUJUI,
    APPROVAL_DITOLAK,
    APPROVAL_MENUNGGU,
    AVAILABILITY_TERSEDIA,
    DISEASE_VOCABULARY,
    PHASE_VOCABULARY,
    SOURCE_STATUS_DIPENSIUNKAN,
    SOURCE_STATUS_DISETUJUI,
    SOURCE_STATUS_DRAF,
    detect_policy_flag,
    risk_for_policy_flag,
)
from service.kb_ingest import KbIngestService
from service.kb_support import (
    AUDIT_CHUNK_APPROVED,
    AUDIT_CHUNK_REJECTED,
    AUDIT_CHUNK_REVISED,
    AUDIT_SOURCE_REGISTERED,
    AUDIT_SOURCE_RETIRED,
    AUDIT_SOURCE_UPDATED,
    CHUNK_NOT_FOUND_MESSAGE,
    SOURCE_NOT_FOUND_MESSAGE,
    KbRepositoryProtocol,
    record_audit,
    validate_audience,
    validate_availability,
    validate_policy_flag,
    validate_risk,
)
from service.siaga_case_support import new_id, now_iso

TITLE_REQUIRED_MESSAGE = "Judul sumber wajib diisi (3-300 karakter)."
PUBLISHER_REQUIRED_MESSAGE = "Penerbit wajib diisi (2-200 karakter)."
LICENSE_REQUIRED_MESSAGE = (
    "Catatan lisensi/izin pakai wajib diisi untuk setiap sumber."
)
CONTENT_REQUIRED_MESSAGE = "Isi dokumen wajib diisi untuk proses pemecahan."
REJECT_REASON_REQUIRED_MESSAGE = "Alasan penolakan wajib diisi."
POLICY_FLAG_REQUIRED_MESSAGE = (
    "Potongan memuat dosis/merek — wajib diberi penanda kebijakan sebelum "
    "disetujui."
)
SOURCE_ALREADY_RETIRED_MESSAGE = "Sumber sudah dipensiunkan."
SUPERSEDED_CHUNK_MESSAGE = (
    "Versi ini sudah digantikan versi baru — putuskan pada versi terkini."
)
UNKNOWN_DISEASE_TAG_MESSAGE = "Penanda penyakit tidak dikenal: {tag}."
UNKNOWN_PHASE_TAG_MESSAGE = "Penanda fase tidak dikenal: {tag}."
UNKNOWN_ACTION_TYPE_MESSAGE = "Jenis tindakan tidak dikenal."
DIFF_VERSION_NOT_FOUND_MESSAGE = "Versi pembanding tidak ditemukan."

TITLE_MIN_LENGTH = 3
TITLE_MAX_LENGTH = 300
PUBLISHER_MIN_LENGTH = 2
PUBLISHER_MAX_LENGTH = 200
LICENSE_MIN_LENGTH = 3
LICENSE_MAX_LENGTH = 500

# Sprint 08 seam: activating a KB version is a critical change that will need a
# second person's approval (brief 06 §3.3). Until that module exists, activation
# is admin/reviewer-only and every decision is written to kb_audit_events — the
# trail Sprint 08 will attach the second signature to. Flip this on there.
SECOND_PERSON_APPROVAL_ENABLED = False


class KbGovernanceService:
    """Catalog + approval + versioning per the Sprint 04 contract."""

    def __init__(
        self,
        repo: Optional[KbRepositoryProtocol] = None,
        ingest: Optional[KbIngestService] = None,
    ) -> None:
        self._repo = repo
        self._ingest = ingest

    @property
    def repo(self) -> KbRepositoryProtocol:
        if self._repo is None:
            from service.kb_support import KbRepository

            self._repo = KbRepository()
        return self._repo

    @property
    def ingest(self) -> KbIngestService:
        if self._ingest is None:
            self._ingest = KbIngestService(repo=self.repo)
        return self._ingest

    # ---- sources --------------------------------------------------------------

    def register_source(self, actor_profile: dict, dto) -> dict:
        """Register a document; ingest immediately when text came along."""
        row = self._build_source_row(actor_profile, dto)
        self.repo.insert_source(row)
        record_audit(
            self.repo,
            entity_type="source",
            entity_id=row["id"],
            action=AUDIT_SOURCE_REGISTERED,
            actor_profile_id=actor_profile.get("id"),
            detail={"title": row["title"], "publisher": row["publisher"]},
        )
        logger.info(f"kb source registered: source={row['id']}")
        ingest_result = None
        if (dto.content or "").strip():
            ingest_result = self.ingest.ingest_document(
                actor_profile, row, dto.content.encode("utf-8"), "text/plain"
            )
        return {"source": self._source_out(row), "ingest": ingest_result}

    def _build_source_row(self, actor_profile: dict, dto) -> dict:
        now = now_iso()
        return {
            "id": new_id(),
            "title": _require_text(
                dto.title,
                TITLE_MIN_LENGTH,
                TITLE_MAX_LENGTH,
                TITLE_REQUIRED_MESSAGE,
            ),
            "publisher": _require_text(
                dto.publisher,
                PUBLISHER_MIN_LENGTH,
                PUBLISHER_MAX_LENGTH,
                PUBLISHER_REQUIRED_MESSAGE,
            ),
            "published_date": _clean(dto.publishedDate),
            "edition_version": _clean(dto.editionVersion),
            "license_note": _require_text(
                dto.licenseNote,
                LICENSE_MIN_LENGTH,
                LICENSE_MAX_LENGTH,
                LICENSE_REQUIRED_MESSAGE,
            ),
            "category": _clean(dto.category),
            "source_url": _clean(dto.sourceUrl),
            "status": SOURCE_STATUS_DRAF,
            "availability_status": validate_availability(dto.availabilityStatus)
            or AVAILABILITY_TERSEDIA,
            "registered_by_profile_id": actor_profile.get("id"),
            "created_at": now,
            "updated_at": now,
        }

    def update_source(self, actor_profile: dict, source_id: str, dto) -> dict:
        """Edit metadata (never the lifecycle status — retire does that)."""
        source = self._get_source(source_id)
        fields = self._build_source_updates(dto)
        if not fields:
            return self._source_out(source)
        fields["updated_at"] = now_iso()
        updated = self.repo.update_source(source_id, fields)
        record_audit(
            self.repo,
            entity_type="source",
            entity_id=source_id,
            action=AUDIT_SOURCE_UPDATED,
            actor_profile_id=actor_profile.get("id"),
            detail={"changedFields": sorted(fields.keys())},
        )
        return self._source_out({**source, **updated})

    @staticmethod
    def _build_source_updates(dto) -> dict:
        """Only the fields the caller actually sent (partial update)."""
        fields: dict = {}
        if dto.title is not None:
            fields["title"] = _require_text(
                dto.title,
                TITLE_MIN_LENGTH,
                TITLE_MAX_LENGTH,
                TITLE_REQUIRED_MESSAGE,
            )
        if dto.publisher is not None:
            fields["publisher"] = _require_text(
                dto.publisher,
                PUBLISHER_MIN_LENGTH,
                PUBLISHER_MAX_LENGTH,
                PUBLISHER_REQUIRED_MESSAGE,
            )
        if dto.licenseNote is not None:
            fields["license_note"] = _require_text(
                dto.licenseNote,
                LICENSE_MIN_LENGTH,
                LICENSE_MAX_LENGTH,
                LICENSE_REQUIRED_MESSAGE,
            )
        for dto_field, column in (
            ("publishedDate", "published_date"),
            ("editionVersion", "edition_version"),
            ("category", "category"),
            ("sourceUrl", "source_url"),
        ):
            value = getattr(dto, dto_field)
            if value is not None:
                fields[column] = _clean(value)
        if dto.availabilityStatus is not None:
            fields["availability_status"] = validate_availability(
                dto.availabilityStatus
            )
        if dto.markReviewed:
            fields["last_reviewed_at"] = now_iso()
        return fields

    def list_sources(self, dto) -> tuple[list[dict], int]:
        """Filtered catalog page with per-source chunk tallies."""
        filters = dto.filters
        rows, count = self.repo.find_sources(
            {
                "status": getattr(filters, "status", None),
                "publisher": getattr(filters, "publisher", None),
                "availability_status": getattr(filters, "availabilityStatus", None),
                "query": getattr(filters, "query", None),
            }
            if filters
            else {},
            dto.page,
            dto.limit,
        )
        counts = self.repo.count_chunks_by_source([row["id"] for row in rows])
        return [
            kb_source_from_row(row, counts.get(row["id"])).model_dump()
            for row in rows
        ], count

    def get_source(self, source_id: str) -> dict:
        return self._source_out(self._get_source(source_id))

    def retire_source(self, actor_profile: dict, source_id: str, dto) -> dict:
        """Retire: out of the active index, history intact (brief 06 §4.2)."""
        source = self._get_source(source_id)
        if source["status"] == SOURCE_STATUS_DIPENSIUNKAN:
            raise SiagaValidationError(SOURCE_ALREADY_RETIRED_MESSAGE)
        now = now_iso()
        updated = self.repo.update_source(
            source_id,
            {
                "status": SOURCE_STATUS_DIPENSIUNKAN,
                "retired_at": now,
                "updated_at": now,
            },
        )
        record_audit(
            self.repo,
            entity_type="source",
            entity_id=source_id,
            action=AUDIT_SOURCE_RETIRED,
            actor_profile_id=actor_profile.get("id"),
            reason=_clean(dto.reason),
        )
        logger.info(f"kb source retired: source={source_id}")
        return self._source_out({**source, **updated})

    def ingest_source(
        self,
        actor_profile: dict,
        source_id: str,
        data: bytes,
        content_type: Optional[str] = None,
    ) -> dict:
        """Extract + chunk a document into the source's review queue."""
        source = self._get_source(source_id)
        if source["status"] == SOURCE_STATUS_DIPENSIUNKAN:
            raise SiagaValidationError(SOURCE_ALREADY_RETIRED_MESSAGE)
        return self.ingest.ingest_document(actor_profile, source, data, content_type)

    # ---- chunks ----------------------------------------------------------------

    def list_chunks(self, dto) -> tuple[list[dict], int]:
        """Review queue / per-source chunk list (current versions by default)."""
        filters = dto.filters
        is_current = getattr(filters, "isCurrent", None) if filters else None
        rows, count = self.repo.find_chunks(
            {
                "source_id": getattr(filters, "sourceId", None),
                "approval_status": getattr(filters, "approvalStatus", None),
                "disease": getattr(filters, "disease", None),
                "phase": getattr(filters, "phase", None),
                "audience": getattr(filters, "audience", None),
                "ref_code": getattr(filters, "refCode", None),
                "policy_flagged": getattr(filters, "policyFlagged", None),
                "is_current": True if is_current is None else is_current,
            }
            if filters
            else {"is_current": True},
            dto.page,
            dto.limit,
        )
        return [self._chunk_out(row) for row in rows], count

    def get_chunk(self, chunk_id: str) -> dict:
        return self._chunk_out(self._get_chunk(chunk_id))

    def get_chunk_by_ref(self, ref_code: str, version: Optional[int] = None) -> dict:
        """Read-only preview by stable ref code (Sprint 05 reference drawer).

        Without a version the CURRENT one is returned; with one, the exact
        historical row — `isCurrent: false` tells the UI to show the
        "versi lama — sudah diperbarui/dipensiunkan" label.
        """
        rows = self.repo.get_chunks_by_ref(ref_code)
        if not rows:
            raise SiagaNotFoundError(CHUNK_NOT_FOUND_MESSAGE)
        if version is not None:
            row = next((r for r in rows if r.get("version") == version), None)
            if row is None:
                raise SiagaNotFoundError(CHUNK_NOT_FOUND_MESSAGE)
            return self._chunk_out(row)
        current = next((r for r in rows if r.get("is_current")), rows[-1])
        return self._chunk_out(current)

    def approve_chunk(self, actor_profile: dict, chunk_id: str, dto) -> dict:
        """Approve with tag corrections — refused when the policy flag is due."""
        chunk = self._get_decidable_chunk(chunk_id)
        policy_flag = validate_policy_flag(dto.policyFlag) or chunk.get("policy_flag")
        # Re-read the CONTENT: the ingest-time suggestion is never trusted here.
        if detect_policy_flag(chunk["content"]) and not policy_flag:
            raise SiagaValidationError(POLICY_FLAG_REQUIRED_MESSAGE)
        now = now_iso()
        fields = {
            "approval_status": APPROVAL_DISETUJUI,
            "policy_flag": policy_flag,
            "risk": validate_risk(dto.risk) or risk_for_policy_flag(policy_flag),
            "reject_reason": None,
            "decided_by_profile_id": actor_profile.get("id"),
            "decided_at": now,
            "updated_at": now,
        }
        if dto.diseaseTags is not None:
            fields["disease_tags"] = _validate_disease_tags(dto.diseaseTags)
        if dto.phaseTags is not None:
            fields["phase_tags"] = _validate_phase_tags(dto.phaseTags)
        if dto.actionType is not None:
            fields["action_type"] = _validate_action_type(dto.actionType)
        if dto.audience is not None:
            fields["audience"] = validate_audience(dto.audience)
        if dto.validUntil is not None:
            fields["valid_until"] = _clean(dto.validUntil)
        updated = self.repo.update_chunk(chunk_id, fields)
        self._promote_source(chunk["source_id"])
        record_audit(
            self.repo,
            entity_type="chunk",
            entity_id=chunk_id,
            action=AUDIT_CHUNK_APPROVED,
            actor_profile_id=actor_profile.get("id"),
            ref_code=chunk["ref_code"],
            reason=_clean(dto.note),
            detail={
                "version": chunk.get("version"),
                "policyFlag": policy_flag,
                "secondPersonApproval": SECOND_PERSON_APPROVAL_ENABLED,
            },
        )
        logger.info(
            f"kb chunk approved: ref={chunk['ref_code']} "
            f"version={chunk.get('version')} flag={policy_flag}"
        )
        return self._chunk_out({**chunk, **updated})

    def reject_chunk(self, actor_profile: dict, chunk_id: str, dto) -> dict:
        """Reject with a MANDATORY reason — never enters the active index."""
        chunk = self._get_decidable_chunk(chunk_id)
        reason = _clean(dto.reason)
        if not reason:
            raise SiagaValidationError(REJECT_REASON_REQUIRED_MESSAGE)
        now = now_iso()
        updated = self.repo.update_chunk(
            chunk_id,
            {
                "approval_status": APPROVAL_DITOLAK,
                "reject_reason": reason,
                "decided_by_profile_id": actor_profile.get("id"),
                "decided_at": now,
                "updated_at": now,
            },
        )
        record_audit(
            self.repo,
            entity_type="chunk",
            entity_id=chunk_id,
            action=AUDIT_CHUNK_REJECTED,
            actor_profile_id=actor_profile.get("id"),
            ref_code=chunk["ref_code"],
            reason=reason,
            detail={"version": chunk.get("version")},
        )
        logger.info(f"kb chunk rejected: ref={chunk['ref_code']}")
        return self._chunk_out({**chunk, **updated})

    def revise_chunk(self, actor_profile: dict, chunk_id: str, dto) -> dict:
        """Write a NEW version row under the same ref code (never overwrite)."""
        chunk = self._get_decidable_chunk(chunk_id)
        content = (
            dto.content if dto.content is not None else chunk["content"]
        ).strip()
        if not content:
            raise SiagaValidationError(CONTENT_REQUIRED_MESSAGE)
        new_row = self._build_revision_row(chunk, dto, content)
        self.repo.update_chunk(
            chunk["id"], {"is_current": False, "updated_at": now_iso()}
        )
        self.repo.insert_chunks([new_row])
        record_audit(
            self.repo,
            entity_type="chunk",
            entity_id=new_row["id"],
            action=AUDIT_CHUNK_REVISED,
            actor_profile_id=actor_profile.get("id"),
            ref_code=chunk["ref_code"],
            reason=_clean(dto.note),
            detail={
                "fromVersion": chunk.get("version"),
                "toVersion": new_row["version"],
            },
        )
        logger.info(
            f"kb chunk revised: ref={chunk['ref_code']} "
            f"version={chunk.get('version')}->{new_row['version']}"
        )
        return self._chunk_out(new_row)

    @staticmethod
    def _build_revision_row(chunk: dict, dto, content: str) -> dict:
        """New version row — content changed ⇒ back to the review queue."""
        policy_flag = validate_policy_flag(dto.policyFlag)
        if policy_flag is None:
            policy_flag = detect_policy_flag(content)
        now = now_iso()
        return {
            "id": new_id(),
            "ref_code": chunk["ref_code"],
            "source_id": chunk["source_id"],
            "source_version": chunk.get("source_version"),
            "location": chunk.get("location"),
            "content": content,
            "disease_tags": (
                _validate_disease_tags(dto.diseaseTags)
                if dto.diseaseTags is not None
                else list(chunk.get("disease_tags") or [])
            ),
            "phase_tags": (
                _validate_phase_tags(dto.phaseTags)
                if dto.phaseTags is not None
                else list(chunk.get("phase_tags") or [])
            ),
            "action_type": (
                _validate_action_type(dto.actionType)
                if dto.actionType is not None
                else chunk.get("action_type")
            ),
            "audience": validate_audience(dto.audience) or chunk.get("audience"),
            "risk": risk_for_policy_flag(policy_flag),
            "policy_flag": policy_flag,
            "approval_status": APPROVAL_MENUNGGU,
            "version": (chunk.get("version") or 1) + 1,
            "is_current": True,
            "ordinal": chunk.get("ordinal") or 0,
            "created_at": now,
            "updated_at": now,
        }

    def diff_chunk(
        self,
        ref_code: str,
        base_version: Optional[int] = None,
        compare_version: Optional[int] = None,
    ) -> dict:
        """Draf vs aktif comparison for the reviewer's diff view."""
        rows = self.repo.get_chunks_by_ref(ref_code)
        if not rows:
            raise SiagaNotFoundError(CHUNK_NOT_FOUND_MESSAGE)
        ordered = sorted(rows, key=lambda row: row.get("version") or 1)
        base = _pick_version(ordered, base_version, default_index=-2)
        compare = _pick_version(ordered, compare_version, default_index=-1)
        return KbChunkDiffOut(
            refCode=ref_code,
            base=kb_chunk_version_from_row(base),
            compare=kb_chunk_version_from_row(compare),
            changedFields=_changed_fields(base, compare),
            contentDiff=_content_diff(base["content"], compare["content"]),
        ).model_dump()

    # ---- shared helpers ---------------------------------------------------------

    def _get_source(self, source_id: str) -> dict:
        row = self.repo.get_source(source_id)
        if row is None:
            raise SiagaNotFoundError(SOURCE_NOT_FOUND_MESSAGE)
        return row

    def _get_chunk(self, chunk_id: str) -> dict:
        row = self.repo.get_chunk(chunk_id)
        if row is None:
            raise SiagaNotFoundError(CHUNK_NOT_FOUND_MESSAGE)
        return row

    def _get_decidable_chunk(self, chunk_id: str) -> dict:
        """A decision may only land on the CURRENT version of a chunk."""
        chunk = self._get_chunk(chunk_id)
        if not chunk.get("is_current", True):
            raise SiagaValidationError(SUPERSEDED_CHUNK_MESSAGE)
        return chunk

    def _promote_source(self, source_id: str) -> None:
        """First approved chunk lifts the source out of 'draf'."""
        source = self.repo.get_source(source_id)
        if source is None or source["status"] != SOURCE_STATUS_DRAF:
            return
        now = now_iso()
        self.repo.update_source(
            source_id,
            {
                "status": SOURCE_STATUS_DISETUJUI,
                "last_reviewed_at": now,
                "updated_at": now,
            },
        )

    def _source_out(self, row: dict) -> dict:
        counts = self.repo.count_chunks_by_source([row["id"]])
        return kb_source_from_row(row, counts.get(row["id"])).model_dump()

    def _chunk_out(self, row: dict) -> dict:
        source = self.repo.get_source(row["source_id"]) or {}
        return kb_chunk_from_row(row, source.get("title")).model_dump()


# ---- module-level helpers ---------------------------------------------------------


def _clean(value: Optional[str]) -> Optional[str]:
    cleaned = (value or "").strip()
    return cleaned or None


def _require_text(
    value: Optional[str], minimum: int, maximum: int, message: str
) -> str:
    cleaned = (value or "").strip()
    if not minimum <= len(cleaned) <= maximum:
        raise SiagaValidationError(message)
    return cleaned


def _validate_disease_tags(tags: list[str]) -> list[str]:
    for tag in tags:
        if tag not in DISEASE_VOCABULARY:
            raise SiagaValidationError(UNKNOWN_DISEASE_TAG_MESSAGE.format(tag=tag))
    return list(tags)


def _validate_phase_tags(tags: list[str]) -> list[str]:
    for tag in tags:
        if tag not in PHASE_VOCABULARY:
            raise SiagaValidationError(UNKNOWN_PHASE_TAG_MESSAGE.format(tag=tag))
    return list(tags)


def _validate_action_type(action_type: str) -> str:
    if action_type not in ACTION_TYPES:
        raise SiagaValidationError(UNKNOWN_ACTION_TYPE_MESSAGE)
    return action_type


def _pick_version(
    ordered: list[dict], version: Optional[int], default_index: int
) -> dict:
    """Row for an explicit version, else the positional default."""
    if version is not None:
        row = next((r for r in ordered if r.get("version") == version), None)
        if row is None:
            raise SiagaNotFoundError(DIFF_VERSION_NOT_FOUND_MESSAGE)
        return row
    if len(ordered) < abs(default_index):
        return ordered[0]
    return ordered[default_index]


_DIFFABLE_FIELDS = (
    "disease_tags",
    "phase_tags",
    "action_type",
    "audience",
    "risk",
    "policy_flag",
    "approval_status",
)


def _changed_fields(base: dict, compare: dict) -> list[str]:
    """Metadata fields that differ between two versions, content included."""
    changed = [
        field for field in _DIFFABLE_FIELDS if base.get(field) != compare.get(field)
    ]
    if base.get("content") != compare.get("content"):
        changed.append("content")
    return changed


def _content_diff(base_content: str, compare_content: str) -> list[dict]:
    """Line-level diff as `[{op, text}]` — `=` kept, `-` removed, `+` added."""
    base_lines = base_content.splitlines()
    compare_lines = compare_content.splitlines()
    matcher = difflib.SequenceMatcher(None, base_lines, compare_lines)
    diff: list[dict] = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            diff.extend({"op": "=", "text": line} for line in base_lines[i1:i2])
            continue
        diff.extend({"op": "-", "text": line} for line in base_lines[i1:i2])
        diff.extend({"op": "+", "text": line} for line in compare_lines[j1:j2])
    return diff
