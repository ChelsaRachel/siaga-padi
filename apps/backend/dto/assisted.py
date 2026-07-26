"""Request DTOs for assisted-mode (mode pendampingan) routes.

camelCase JSON per the pinned contract. The subjectProfileId XOR newProfile
rule is enforced in the service layer so violations return the contract's 400
envelope (a Pydantic validator would surface as 422).
"""
from typing import Literal, Optional

from pydantic import BaseModel, Field

ConsentMethod = Literal["lisan", "tertulis", "in_app"]

_MAX_QUERY_LENGTH = 120
_MAX_NAME_LENGTH = 160


class AssistedSearchDTO(BaseModel):
    """Body of `POST /assisted/search` — name search inside binaan scope."""

    query: str = Field(min_length=1, max_length=_MAX_QUERY_LENGTH)


class NewAssistedProfileDTO(BaseModel):
    """Minimal profile payload — no credentials, no national-ID field."""

    displayName: str = Field(min_length=1, max_length=_MAX_NAME_LENGTH)
    areaKabupaten: Optional[str] = Field(default=None, max_length=_MAX_NAME_LENGTH)
    areaKecamatan: str = Field(min_length=1, max_length=_MAX_NAME_LENGTH)


class AssistedStartDTO(BaseModel):
    """Body of `POST /assisted/start` — exactly one of subjectProfileId | newProfile."""

    subjectProfileId: Optional[str] = Field(default=None, min_length=1)
    newProfile: Optional[NewAssistedProfileDTO] = None
    consentMethod: ConsentMethod


class AssistedEndDTO(BaseModel):
    """Body of `POST /assisted/end`."""

    sessionId: str = Field(min_length=1)
