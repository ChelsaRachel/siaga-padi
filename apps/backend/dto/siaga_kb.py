"""FE-facing camelCase DTOs for the knowledge base (Sprint 04 contract
`apps/web/docs/api-spec-kb.md`).

DB rows are snake_case — use the builders below to convert. Two rules the
shapes here encode:

- `policyFlag` always travels WITH the chunk. Sprint 05's safety checker
  decides narration from it, so it must never be dropped on the way out.
- `requiredPolicyFlag` is what the content detector says the chunk needs. The
  reviewer UI uses it to pre-select the control; the API uses it to refuse an
  approval that would let dosage/brand content through unflagged.
"""
from typing import Optional

from pydantic import BaseModel

from models.siaga_kb import detect_policy_flag


class KbSourceOut(BaseModel):
    """Contract type `KbSourceOut` — one registered document."""

    sourceId: str
    title: str
    publisher: str
    publishedDate: Optional[str] = None
    editionVersion: Optional[str] = None
    licenseNote: str
    category: Optional[str] = None
    sourceUrl: Optional[str] = None
    status: str
    availabilityStatus: str
    lastReviewedAt: Optional[str] = None
    retiredAt: Optional[str] = None
    """Chunk counts for the catalog row — 0 until the document is ingested."""
    chunkTotal: int = 0
    chunkPending: int = 0
    chunkApproved: int = 0
    createdAt: Optional[str] = None


class KbChunkOut(BaseModel):
    """Contract type `KbChunkOut` — one VERSION of one reference chunk."""

    chunkId: str
    refCode: str
    sourceId: str
    sourceTitle: Optional[str] = None
    sourceVersion: Optional[str] = None
    location: Optional[str] = None
    content: str
    diseaseTags: list[str] = []
    phaseTags: list[str] = []
    actionType: Optional[str] = None
    audience: str
    risk: str
    policyFlag: Optional[str] = None
    """Flag the CONTENT requires — approval is refused when it is unmet."""
    requiredPolicyFlag: Optional[str] = None
    approvalStatus: str
    rejectReason: Optional[str] = None
    version: int
    """False once a newer version supersedes this row (historical citation)."""
    isCurrent: bool = True
    validUntil: Optional[str] = None
    decidedAt: Optional[str] = None
    createdAt: Optional[str] = None


class KbIngestOut(BaseModel):
    """Contract type `KbIngestOut` — result of one ingest run."""

    sourceId: str
    chunkCount: int
    """Every freshly ingested chunk lands pending — never auto-approved."""
    pendingCount: int
    refCodes: list[str] = []


class KbRetrievalHitOut(BaseModel):
    """Contract type `KbRetrievalHitOut` — one ranked chunk of the index."""

    refCode: str
    chunkId: str
    sourceTitle: Optional[str] = None
    location: Optional[str] = None
    content: str
    diseaseTags: list[str] = []
    phaseTags: list[str] = []
    actionType: Optional[str] = None
    audience: str
    risk: str
    policyFlag: Optional[str] = None
    """False for policy-flagged chunks: linkable as reading, never narrated."""
    narratable: bool = True
    score: int = 0


class KbRetrievalOut(BaseModel):
    """Contract type `KbRetrievalOut` — the ranked active-index answer."""

    disease: Optional[str] = None
    phase: Optional[str] = None
    audience: Optional[str] = None
    actionType: Optional[str] = None
    hits: list[KbRetrievalHitOut] = []
    totalCount: int = 0


class KbChunkVersionOut(BaseModel):
    """One side of a version comparison."""

    chunkId: str
    version: int
    content: str
    diseaseTags: list[str] = []
    phaseTags: list[str] = []
    actionType: Optional[str] = None
    audience: str
    risk: str
    policyFlag: Optional[str] = None
    approvalStatus: str
    isCurrent: bool
    createdAt: Optional[str] = None


class KbChunkDiffOut(BaseModel):
    """Contract type `KbChunkDiffOut` — draf vs aktif for the diff view."""

    refCode: str
    base: KbChunkVersionOut
    compare: KbChunkVersionOut
    """Field names that differ between the two versions (metadata diff)."""
    changedFields: list[str] = []
    """Line-level content diff: each entry is `{op: '=' | '-' | '+', text}`."""
    contentDiff: list[dict] = []


def kb_source_from_row(row: dict, counts: Optional[dict] = None) -> KbSourceOut:
    """Build the camelCase source DTO from a snake_case `kb_sources` row."""
    tally = counts or {}
    return KbSourceOut(
        sourceId=row["id"],
        title=row["title"],
        publisher=row["publisher"],
        publishedDate=row.get("published_date"),
        editionVersion=row.get("edition_version"),
        licenseNote=row["license_note"],
        category=row.get("category"),
        sourceUrl=row.get("source_url"),
        status=row["status"],
        availabilityStatus=row.get("availability_status") or "tersedia",
        lastReviewedAt=row.get("last_reviewed_at"),
        retiredAt=row.get("retired_at"),
        chunkTotal=tally.get("total", 0),
        chunkPending=tally.get("pending", 0),
        chunkApproved=tally.get("approved", 0),
        createdAt=row.get("created_at"),
    )


def kb_chunk_from_row(row: dict, source_title: Optional[str] = None) -> KbChunkOut:
    """Build the camelCase chunk DTO from a snake_case `kb_chunks` row."""
    return KbChunkOut(
        chunkId=row["id"],
        refCode=row["ref_code"],
        sourceId=row["source_id"],
        sourceTitle=source_title,
        sourceVersion=row.get("source_version"),
        location=row.get("location"),
        content=row["content"],
        diseaseTags=list(row.get("disease_tags") or []),
        phaseTags=list(row.get("phase_tags") or []),
        actionType=row.get("action_type"),
        audience=row.get("audience") or "penyuluh",
        risk=row.get("risk") or "aman",
        policyFlag=row.get("policy_flag"),
        requiredPolicyFlag=detect_policy_flag(row["content"]),
        approvalStatus=row["approval_status"],
        rejectReason=row.get("reject_reason"),
        version=row.get("version") or 1,
        isCurrent=bool(row.get("is_current", True)),
        validUntil=row.get("valid_until"),
        decidedAt=row.get("decided_at"),
        createdAt=row.get("created_at"),
    )


def kb_chunk_version_from_row(row: dict) -> KbChunkVersionOut:
    """Build one side of the diff view from a `kb_chunks` row."""
    return KbChunkVersionOut(
        chunkId=row["id"],
        version=row.get("version") or 1,
        content=row["content"],
        diseaseTags=list(row.get("disease_tags") or []),
        phaseTags=list(row.get("phase_tags") or []),
        actionType=row.get("action_type"),
        audience=row.get("audience") or "penyuluh",
        risk=row.get("risk") or "aman",
        policyFlag=row.get("policy_flag"),
        approvalStatus=row["approval_status"],
        isCurrent=bool(row.get("is_current", True)),
        createdAt=row.get("created_at"),
    )


def kb_retrieval_hit_from_row(
    row: dict, score: int, source_title: Optional[str] = None
) -> KbRetrievalHitOut:
    """Build one ranked retrieval hit from an active-index row."""
    policy_flag = row.get("policy_flag")
    return KbRetrievalHitOut(
        refCode=row["ref_code"],
        chunkId=row["id"],
        sourceTitle=source_title,
        location=row.get("location"),
        content=row["content"],
        diseaseTags=list(row.get("disease_tags") or []),
        phaseTags=list(row.get("phase_tags") or []),
        actionType=row.get("action_type"),
        audience=row.get("audience") or "penyuluh",
        risk=row.get("risk") or "aman",
        policyFlag=policy_flag,
        narratable=policy_flag is None,
        score=score,
    )
