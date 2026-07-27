"""Domain exceptions for the Siaga Padi auth & assisted-mode services.

Services raise these; routers translate them into the BaseResponseFailed
envelope with the matching HTTP status code (see `util/siaga_response.py`).
Messages are user-presentable Indonesian strings per the pinned contract.
"""
from typing import Optional

# Identical body whether or not the account exists — never reveal existence.
GENERIC_LOGIN_FAILED_MESSAGE = "Email atau kata sandi tidak cocok."
SESSION_INVALID_MESSAGE = "Sesi tidak valid. Silakan masuk kembali."
FORBIDDEN_MESSAGE = "Anda tidak memiliki akses untuk tindakan ini."


class SiagaError(Exception):
    """Base domain error carrying an HTTP status and a user-safe message."""

    status_code: int = 400

    def __init__(
        self, message: str, additional_info: Optional[dict] = None
    ) -> None:
        super().__init__(message)
        self.message = message
        self.additional_info = additional_info


class InvalidCredentialsError(SiagaError):
    """401 — wrong password OR unknown account (indistinguishable by design)."""

    status_code = 401

    def __init__(self, message: str = GENERIC_LOGIN_FAILED_MESSAGE) -> None:
        super().__init__(message)


class AccountLockedError(SiagaError):
    """423 — temporary lockout after repeated failures."""

    status_code = 423

    def __init__(
        self, message: str, retry_after_seconds: int, locked_until: str
    ) -> None:
        super().__init__(
            message,
            additional_info={
                "retryAfterSeconds": retry_after_seconds,
                "lockedUntil": locked_until,
            },
        )
        self.retry_after_seconds = retry_after_seconds
        self.locked_until = locked_until


class UnauthorizedError(SiagaError):
    """401 — token valid-looking but the identity is missing or unusable."""

    status_code = 401

    def __init__(self, message: str = SESSION_INVALID_MESSAGE) -> None:
        super().__init__(message)


class InvalidRefreshTokenError(UnauthorizedError):
    """401 — invalid or expired refresh token."""


class SiagaForbiddenError(SiagaError):
    """403 — authenticated but not allowed (role / binaan scope / ownership)."""

    status_code = 403

    def __init__(self, message: str = FORBIDDEN_MESSAGE) -> None:
        super().__init__(message)


class SiagaValidationError(SiagaError):
    """400 — semantically invalid request (e.g. subjectProfileId XOR newProfile)."""

    status_code = 400


class SiagaNotFoundError(SiagaError):
    """404 — missing OR not visible to the caller (identical body by design,
    so resource existence never leaks — no-enumeration rule)."""

    status_code = 404
