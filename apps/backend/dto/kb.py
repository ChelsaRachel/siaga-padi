"""Request DTOs for the knowledge-base routes (`router/kb_governance.py`,
`router/kb_retrieval.py`).

camelCase JSON per the pinned Sprint 04 contract
(`apps/web/docs/api-spec-kb.md`). Semantic rules (enum membership, mandatory
reject reason, policy-flag gate) are enforced in the SERVICE layer so
violations return the contract's 400 envelope with an Indonesian message — a
Pydantic validator would surface as 422 instead. Response DTOs live in
`dto/siaga_kb.py`.
"""
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from dto.cases import clamp_limit, clamp_page

_MAX_TITLE_LENGTH = 300
_MAX_NAME_LENGTH = 200
_MAX_NOTE_LENGTH = 500
_MAX_URL_LENGTH = 500


class RegisterKbSourceDTO(BaseModel):
    """Body of `POST /kb/sources` — stepped registration form (admin)."""

    title: Optional[str] = Field(default=None, max_length=_MAX_TITLE_LENGTH)
    publisher: Optional[str] = Field(default=None, max_length=_MAX_NAME_LENGTH)
    publishedDate: Optional[str] = Field(default=None, max_length=_MAX_NAME_LENGTH)
    editionVersion: Optional[str] = Field(default=None, max_length=_MAX_NAME_LENGTH)
    """Legal basis for using the document — mandatory (brief 06 §6.2)."""
    licenseNote: Optional[str] = Field(default=None, max_length=_MAX_NOTE_LENGTH)
    category: Optional[str] = Field(default=None, max_length=_MAX_NAME_LENGTH)
    sourceUrl: Optional[str] = Field(default=None, max_length=_MAX_URL_LENGTH)
    availabilityStatus: Optional[str] = None
    """Optional inline document text — registers AND ingests in one call."""
    content: Optional[str] = None


class UpdateKbSourceDTO(BaseModel):
    """Body of `PATCH /kb/sources/{id}` — metadata edit (admin)."""

    title: Optional[str] = Field(default=None, max_length=_MAX_TITLE_LENGTH)
    publisher: Optional[str] = Field(default=None, max_length=_MAX_NAME_LENGTH)
    publishedDate: Optional[str] = Field(default=None, max_length=_MAX_NAME_LENGTH)
    editionVersion: Optional[str] = Field(default=None, max_length=_MAX_NAME_LENGTH)
    licenseNote: Optional[str] = Field(default=None, max_length=_MAX_NOTE_LENGTH)
    category: Optional[str] = Field(default=None, max_length=_MAX_NAME_LENGTH)
    sourceUrl: Optional[str] = Field(default=None, max_length=_MAX_URL_LENGTH)
    availabilityStatus: Optional[str] = None
    """Stamp "terakhir ditinjau" without touching the rest of the metadata."""
    markReviewed: Optional[bool] = None


class IngestKbSourceDTO(BaseModel):
    """Body of `POST /kb/sources/{id}/ingest` — pasted document text."""

    content: Optional[str] = None


class RetireKbSourceDTO(BaseModel):
    """Body of `POST /kb/sources/{id}/retire` — reason is recorded in audit."""

    reason: Optional[str] = Field(default=None, max_length=_MAX_NOTE_LENGTH)


class KbSourceFiltersDTO(BaseModel):
    """Optional filters of `POST /kb/sources/get-all`."""

    status: Optional[str] = None
    publisher: Optional[str] = None
    availabilityStatus: Optional[str] = None
    query: Optional[str] = None


class FindKbSourcesDTO(BaseModel):
    """Body of `POST /kb/sources/get-all` — boilerplate FindDTO convention."""

    page: int = 1
    limit: int = 10
    filters: Optional[KbSourceFiltersDTO] = None

    _clamp_page = field_validator("page")(clamp_page)
    _clamp_limit = field_validator("limit")(clamp_limit)


class KbChunkFiltersDTO(BaseModel):
    """Optional filters of `POST /kb/chunks/get-all` (the review queue)."""

    sourceId: Optional[str] = None
    approvalStatus: Optional[str] = None
    disease: Optional[str] = None
    phase: Optional[str] = None
    audience: Optional[str] = None
    refCode: Optional[str] = None
    """True → only policy-flagged chunks; False → only unflagged ones."""
    policyFlagged: Optional[bool] = None
    """Default True — the queue shows current versions, not superseded ones."""
    isCurrent: Optional[bool] = None


class FindKbChunksDTO(BaseModel):
    """Body of `POST /kb/chunks/get-all` — boilerplate FindDTO convention."""

    page: int = 1
    limit: int = 10
    filters: Optional[KbChunkFiltersDTO] = None

    _clamp_page = field_validator("page")(clamp_page)
    _clamp_limit = field_validator("limit")(clamp_limit)


class ApproveKbChunkDTO(BaseModel):
    """Body of `POST /kb/chunks/{id}/approve` (domain_reviewer).

    Tag corrections ride along with the decision — the reviewer fixes the
    auto-extracted tags in the same action that approves the chunk.
    """

    policyFlag: Optional[str] = None
    diseaseTags: Optional[list[str]] = None
    phaseTags: Optional[list[str]] = None
    actionType: Optional[str] = None
    audience: Optional[str] = None
    risk: Optional[str] = None
    validUntil: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=_MAX_NOTE_LENGTH)


class RejectKbChunkDTO(BaseModel):
    """Body of `POST /kb/chunks/{id}/reject` — reason is MANDATORY."""

    reason: Optional[str] = Field(default=None, max_length=_MAX_NOTE_LENGTH)


class ReviseKbChunkDTO(BaseModel):
    """Body of `POST /kb/chunks/{id}/revise` — writes a NEW version row."""

    content: Optional[str] = None
    diseaseTags: Optional[list[str]] = None
    phaseTags: Optional[list[str]] = None
    actionType: Optional[str] = None
    audience: Optional[str] = None
    policyFlag: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=_MAX_NOTE_LENGTH)


class KbRetrievalQueryDTO(BaseModel):
    """Body of `POST /kb/retrieval` and `POST /kb/retrieval-test`."""

    disease: Optional[str] = None
    phase: Optional[str] = None
    audience: Optional[str] = None
    actionType: Optional[str] = None
    limit: int = 10

    _clamp_limit = field_validator("limit")(clamp_limit)
