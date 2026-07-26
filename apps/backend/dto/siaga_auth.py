"""Request DTOs for the Siaga Padi auth routes (camelCase JSON contract).

Unlike `dto/auth.py`, these perform no network-based email verification —
login must stay fast and must not leak account existence via timing.
"""
from pydantic import BaseModel, Field, field_validator

_MAX_EMAIL_LENGTH = 320
_MAX_PASSWORD_LENGTH = 200


class SiagaLoginDTO(BaseModel):
    """Body of `POST /siaga/auth/login`."""

    email: str = Field(min_length=3, max_length=_MAX_EMAIL_LENGTH)
    password: str = Field(min_length=1, max_length=_MAX_PASSWORD_LENGTH)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class SiagaRefreshDTO(BaseModel):
    """Body of `POST /siaga/auth/refresh`."""

    refreshToken: str = Field(min_length=1)
