"""Request DTOs for the case routes (`router/cases.py`).

camelCase JSON per the pinned Sprint 02 contract
(`apps/web/docs/api-spec-case.md`). Semantic rules (fieldId XOR newField,
locationMode/area coupling, observedAt skew, enum membership) are enforced in
the SERVICE layer so violations return the contract's 400 envelope with an
Indonesian message — a Pydantic validator would surface as 422 instead.
Response DTOs live in `dto/siaga_case.py`.
"""
from typing import Optional

from pydantic import BaseModel, Field, field_validator

_MAX_TEXT_LENGTH = 160

MIN_PAGE = 1
MAX_PAGE_LIMIT = 100


def clamp_page(value: int) -> int:
    """Never below 1 — out-of-range pages are corrected, not rejected."""
    return max(MIN_PAGE, value)


def clamp_limit(value: int) -> int:
    """Bounded page size so a client can never request an unbounded list."""
    return min(max(MIN_PAGE, value), MAX_PAGE_LIMIT)


class CoordsDTO(BaseModel):
    """Opt-in GPS point — only legal together with `locationMode: EXACT_GPS`."""

    lat: float
    lng: float


class NewCaseFieldDTO(BaseModel):
    """Inline lahan creation payload nested in `CreateCaseDTO.newField`."""

    name: str
    areaKabupaten: Optional[str] = Field(default=None, max_length=_MAX_TEXT_LENGTH)
    areaKecamatan: Optional[str] = Field(default=None, max_length=_MAX_TEXT_LENGTH)


class CreateCaseDTO(BaseModel):
    """Body of `POST /cases` (wizard submit; idempotent via header key)."""

    fieldId: Optional[str] = None
    newField: Optional[NewCaseFieldDTO] = None
    locationMode: Optional[str] = None
    coords: Optional[CoordsDTO] = None
    areaKabupaten: Optional[str] = Field(default=None, max_length=_MAX_TEXT_LENGTH)
    areaKecamatan: Optional[str] = Field(default=None, max_length=_MAX_TEXT_LENGTH)
    growthStage: Optional[str] = None
    observedAt: Optional[str] = None
    notes: Optional[str] = None
    assistedSessionId: Optional[str] = None


class CaseFiltersDTO(BaseModel):
    """Optional filters of `POST /cases/get-all`."""

    fieldId: Optional[str] = None
    displayStage: Optional[str] = None
    status: Optional[str] = None
    dateFrom: Optional[str] = None
    dateTo: Optional[str] = None


class FindCasesDTO(BaseModel):
    """Body of `POST /cases/get-all` — boilerplate FindDTO convention."""

    page: int = 1
    limit: int = 10
    filters: Optional[CaseFiltersDTO] = None

    _clamp_page = field_validator("page")(clamp_page)
    _clamp_limit = field_validator("limit")(clamp_limit)
