"""Request DTOs for the farmer profile/lahan routes (`router/farmer_profile.py`).

camelCase JSON per the pinned Sprint 02 contract
(`apps/web/docs/api-spec-case.md`). Role/account-status changes are NOT part
of `UpdateFarmerProfileDTO` by design — unknown fields in the request body are
ignored (Pydantic default), so a client can never escalate its own role here
(admin territory, Sprint 08). Response DTOs live in `dto/siaga_case.py` and
`dto/siaga_profile.py`.
"""
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from dto.cases import CoordsDTO, clamp_limit, clamp_page

_MAX_TEXT_LENGTH = 160


class UpdateFarmerProfileDTO(BaseModel):
    """Body of `PUT /farmer/profile` — own profile fields only."""

    displayName: Optional[str] = Field(default=None, max_length=_MAX_TEXT_LENGTH)
    areaKabupaten: Optional[str] = Field(default=None, max_length=_MAX_TEXT_LENGTH)
    areaKecamatan: Optional[str] = Field(default=None, max_length=_MAX_TEXT_LENGTH)
    researchConsent: Optional[bool] = None
    locationConsent: Optional[bool] = None


class CreateFarmerFieldDTO(BaseModel):
    """Body of `POST /farmer/profile/fields` (assisted create supported)."""

    name: str
    areaKabupaten: Optional[str] = Field(default=None, max_length=_MAX_TEXT_LENGTH)
    areaKecamatan: Optional[str] = Field(default=None, max_length=_MAX_TEXT_LENGTH)
    coords: Optional[CoordsDTO] = None
    assistedSessionId: Optional[str] = None


class UpdateFarmerFieldDTO(BaseModel):
    """Body of `PUT /farmer/profile/fields` — id in body per boilerplate."""

    fieldId: str
    name: Optional[str] = None
    areaKabupaten: Optional[str] = Field(default=None, max_length=_MAX_TEXT_LENGTH)
    areaKecamatan: Optional[str] = Field(default=None, max_length=_MAX_TEXT_LENGTH)
    coords: Optional[CoordsDTO] = None
    assistedSessionId: Optional[str] = None


class FindFarmerFieldsDTO(BaseModel):
    """Body of `POST /farmer/profile/fields/get-all`."""

    page: int = 1
    limit: int = 10

    _clamp_page = field_validator("page")(clamp_page)
    _clamp_limit = field_validator("limit")(clamp_limit)


class DeletionRequestDTO(BaseModel):
    """Body of `POST /farmer/profile/deletion-request`."""

    reason: Optional[str] = None
