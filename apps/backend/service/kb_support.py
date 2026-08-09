"""Shared plumbing for the Sprint 04 knowledge-base services.

Holds what `kb_ingest`, `kb_retrieval` and `kb_governance` all need: the data
seam (`KbRepositoryProtocol`) with its Supabase implementation, the audit
writer, and the small validators used on both the ingest and the governance
side. Keeping them here avoids copy-paste drift between the three modules —
same role `siaga_case_support.py` plays for Sprint 02/03.

The retrieval index is read through the `kb_active_chunks` VIEW only. That is
the single place the "approved + current + not expired + source not retired"
rule lives (migration 0012), so no service can accidentally widen it.
"""
from typing import Optional, Protocol

from config.base import settings
from exceptions.siaga_exceptions import SiagaValidationError
from models.siaga_kb import (
    APPROVAL_DISETUJUI,
    APPROVAL_MENUNGGU,
    AUDIENCES,
    AVAILABILITY_STATUSES,
    MAX_REF_CODE_SEQUENCE,
    POLICY_FLAGS,
    RISKS,
    build_ref_code,
    ref_code_token,
)
from service import BaseSupabaseRepository
from service.siaga_case_support import new_id, now_iso

# Audit actions (kb_audit_events.action) — the governance trail.
AUDIT_SOURCE_REGISTERED = "source_registered"
AUDIT_SOURCE_UPDATED = "source_updated"
AUDIT_SOURCE_RETIRED = "source_retired"
AUDIT_CHUNKS_INGESTED = "chunks_ingested"
AUDIT_CHUNK_APPROVED = "chunk_approved"
AUDIT_CHUNK_REJECTED = "chunk_rejected"
AUDIT_CHUNK_REVISED = "chunk_revised"

SOURCE_NOT_FOUND_MESSAGE = "Sumber pengetahuan tidak ditemukan."
CHUNK_NOT_FOUND_MESSAGE = "Potongan rujukan tidak ditemukan."
INVALID_AUDIENCE_MESSAGE = "Audiens harus 'petani' atau 'penyuluh'."
INVALID_RISK_MESSAGE = "Risiko harus 'aman' atau 'dibatasi'."
INVALID_POLICY_FLAG_MESSAGE = "Penanda kebijakan tidak dikenal."
INVALID_AVAILABILITY_MESSAGE = "Status ketersediaan tidak dikenal."
REF_CODE_EXHAUSTED_MESSAGE = (
    "Nomor urut penanda rujukan untuk kategori ini sudah penuh."
)


class KbRepositoryProtocol(Protocol):
    """Data-access seam consumed by the KB services (fakeable in tests)."""

    def get_profile_by_user_id(self, user_id: str) -> Optional[dict]: ...

    def get_source(self, source_id: str) -> Optional[dict]: ...

    def insert_source(self, row: dict) -> dict: ...

    def update_source(self, source_id: str, fields: dict) -> dict: ...

    def find_sources(
        self, filters: dict, page: int, limit: int
    ) -> tuple[list[dict], int]: ...

    def get_chunk(self, chunk_id: str) -> Optional[dict]: ...

    def get_chunks_by_ref(self, ref_code: str) -> list[dict]: ...

    def find_chunks(
        self, filters: dict, page: int, limit: int
    ) -> tuple[list[dict], int]: ...

    def insert_chunks(self, rows: list[dict]) -> list[dict]: ...

    def update_chunk(self, chunk_id: str, fields: dict) -> dict: ...

    def count_chunks_by_source(self, source_ids: list[str]) -> dict[str, dict]: ...

    def max_ref_sequence(self, token: str) -> int: ...

    def list_active_chunks(self) -> list[dict]: ...

    def insert_audit(self, row: dict) -> dict: ...

    def insert_retrieval_log(self, row: dict) -> dict: ...


class KbRepository(BaseSupabaseRepository):
    """Supabase-backed implementation of the knowledge-base data seam."""

    def __init__(self) -> None:
        super().__init__()
        self.profile_table = settings.SUPABASE_TABLE_SIAGA_PROFILE
        self.source_table = settings.SUPABASE_TABLE_KB_SOURCE
        self.chunk_table = settings.SUPABASE_TABLE_KB_CHUNK
        self.active_view = settings.SUPABASE_VIEW_KB_ACTIVE_CHUNK
        self.audit_table = settings.SUPABASE_TABLE_KB_AUDIT_EVENT
        self.retrieval_log_table = settings.SUPABASE_TABLE_KB_RETRIEVAL_LOG

    def _first(self, query) -> Optional[dict]:
        rows = query.limit(1).execute().data or []
        return rows[0] if rows else None

    def get_profile_by_user_id(self, user_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.profile_table).select("*").eq("user_id", user_id)
        )

    # ---- sources -------------------------------------------------------------

    def get_source(self, source_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.source_table).select("*").eq("id", source_id)
        )

    def insert_source(self, row: dict) -> dict:
        self.table(self.source_table).insert(row).execute()
        return row

    def update_source(self, source_id: str, fields: dict) -> dict:
        self.table(self.source_table).update(fields).eq("id", source_id).execute()
        return {**(self.get_source(source_id) or {}), "id": source_id}

    def find_sources(
        self, filters: dict, page: int, limit: int
    ) -> tuple[list[dict], int]:
        query = self.table(self.source_table).select("*", count="exact")
        if filters.get("status"):
            query = query.eq("status", filters["status"])
        if filters.get("publisher"):
            query = query.ilike("publisher", f"%{filters['publisher']}%")
        if filters.get("availability_status"):
            query = query.eq("availability_status", filters["availability_status"])
        if filters.get("query"):
            query = query.ilike("title", f"%{filters['query']}%")
        start = (page - 1) * limit
        response = (
            query.order("created_at", desc=True)
            .range(start, start + limit - 1)
            .execute()
        )
        return response.data or [], response.count or 0

    # ---- chunks --------------------------------------------------------------

    def get_chunk(self, chunk_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.chunk_table).select("*").eq("id", chunk_id)
        )

    def get_chunks_by_ref(self, ref_code: str) -> list[dict]:
        response = (
            self.table(self.chunk_table)
            .select("*")
            .eq("ref_code", ref_code)
            .order("version", desc=False)
            .execute()
        )
        return response.data or []

    def find_chunks(
        self, filters: dict, page: int, limit: int
    ) -> tuple[list[dict], int]:
        query = self.table(self.chunk_table).select("*", count="exact")
        if filters.get("source_id"):
            query = query.eq("source_id", filters["source_id"])
        if filters.get("approval_status"):
            query = query.eq("approval_status", filters["approval_status"])
        if filters.get("ref_code"):
            query = query.eq("ref_code", filters["ref_code"])
        if filters.get("audience"):
            query = query.eq("audience", filters["audience"])
        if filters.get("disease"):
            query = query.contains("disease_tags", [filters["disease"]])
        if filters.get("phase"):
            query = query.contains("phase_tags", [filters["phase"]])
        if filters.get("is_current") is not None:
            query = query.eq("is_current", filters["is_current"])
        if filters.get("policy_flagged") is True:
            query = query.not_.is_("policy_flag", "null")
        if filters.get("policy_flagged") is False:
            query = query.is_("policy_flag", "null")
        start = (page - 1) * limit
        response = (
            query.order("ordinal", desc=False)
            .range(start, start + limit - 1)
            .execute()
        )
        return response.data or [], response.count or 0

    def insert_chunks(self, rows: list[dict]) -> list[dict]:
        if not rows:
            return []
        self.table(self.chunk_table).insert(rows).execute()
        return rows

    def update_chunk(self, chunk_id: str, fields: dict) -> dict:
        self.table(self.chunk_table).update(fields).eq("id", chunk_id).execute()
        return {**(self.get_chunk(chunk_id) or {}), "id": chunk_id}

    def count_chunks_by_source(self, source_ids: list[str]) -> dict[str, dict]:
        if not source_ids:
            return {}
        rows = (
            self.table(self.chunk_table)
            .select("source_id, approval_status, is_current")
            .in_("source_id", list(set(source_ids)))
            .execute()
            .data
            or []
        )
        return tally_chunk_counts(rows)

    def max_ref_sequence(self, token: str) -> int:
        row = self._first(
            self.table(self.chunk_table)
            .select("ref_code")
            .like("ref_code", f"RUJ-{token}-%")
            .order("ref_code", desc=True)
        )
        return parse_ref_sequence(row["ref_code"]) if row else 0

    def list_active_chunks(self) -> list[dict]:
        response = (
            self.table(self.active_view)
            .select("*")
            .order("ref_code", desc=False)
            .execute()
        )
        return response.data or []

    # ---- audit & logs ---------------------------------------------------------

    def insert_audit(self, row: dict) -> dict:
        self.table(self.audit_table).insert(row).execute()
        return row

    def insert_retrieval_log(self, row: dict) -> dict:
        self.table(self.retrieval_log_table).insert(row).execute()
        return row


# ---- shared helpers -------------------------------------------------------------


def parse_ref_sequence(ref_code: str) -> int:
    """Trailing sequence of a ref code (`RUJ-BLAS-004` → 4); 0 when unparsable."""
    tail = (ref_code or "").rsplit("-", 1)[-1]
    return int(tail) if tail.isdigit() else 0


def tally_chunk_counts(rows: list[dict]) -> dict[str, dict]:
    """Per-source `{total, pending, approved}` over CURRENT chunk versions."""
    counts: dict[str, dict] = {}
    for row in rows:
        if not row.get("is_current", True):
            continue
        source_id = row["source_id"]
        tally = counts.setdefault(
            source_id, {"total": 0, "pending": 0, "approved": 0}
        )
        tally["total"] += 1
        if row["approval_status"] == APPROVAL_MENUNGGU:
            tally["pending"] += 1
        elif row["approval_status"] == APPROVAL_DISETUJUI:
            tally["approved"] += 1
    return counts


class RefCodeAllocator:
    """Hands out stable ref codes, continuing each category's DB sequence.

    Counters are cached per disease token because ONE ingest run produces many
    chunks before a single row is written — asking the database each time would
    hand the same `RUJ-BLAS-004` to every chunk of that category.
    """

    def __init__(self, repo: KbRepositoryProtocol) -> None:
        self._repo = repo
        self._sequences: dict[str, int] = {}

    def allocate(self, disease_tags: list[str]) -> str:
        token = ref_code_token(disease_tags)
        if token not in self._sequences:
            self._sequences[token] = self._repo.max_ref_sequence(token)
        sequence = self._sequences[token] + 1
        if sequence > MAX_REF_CODE_SEQUENCE:
            raise SiagaValidationError(REF_CODE_EXHAUSTED_MESSAGE)
        self._sequences[token] = sequence
        return build_ref_code(disease_tags, sequence)


def record_audit(
    repo: KbRepositoryProtocol,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_profile_id: Optional[str],
    ref_code: Optional[str] = None,
    reason: Optional[str] = None,
    detail: Optional[dict] = None,
) -> None:
    """Append one governance decision to the audit trail (never updated)."""
    repo.insert_audit(
        {
            "id": new_id(),
            "entity_type": entity_type,
            "entity_id": entity_id,
            "ref_code": ref_code,
            "action": action,
            "actor_profile_id": actor_profile_id,
            "reason": reason,
            "detail": detail,
            "created_at": now_iso(),
        }
    )


def validate_audience(value: Optional[str]) -> Optional[str]:
    if value is not None and value not in AUDIENCES:
        raise SiagaValidationError(INVALID_AUDIENCE_MESSAGE)
    return value


def validate_risk(value: Optional[str]) -> Optional[str]:
    if value is not None and value not in RISKS:
        raise SiagaValidationError(INVALID_RISK_MESSAGE)
    return value


def validate_policy_flag(value: Optional[str]) -> Optional[str]:
    if value is not None and value not in POLICY_FLAGS:
        raise SiagaValidationError(INVALID_POLICY_FLAG_MESSAGE)
    return value


def validate_availability(value: Optional[str]) -> Optional[str]:
    if value is not None and value not in AVAILABILITY_STATUSES:
        raise SiagaValidationError(INVALID_AVAILABILITY_MESSAGE)
    return value
