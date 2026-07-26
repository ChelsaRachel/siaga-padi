"""Reusable role-guard dependency for Siaga Padi routes.

Usage (any later sprint):

    from middleware.role_guard import require_role

    require_penyuluh = require_role("penyuluh")

    @router.post("/search")
    def search(dto: SearchDTO, ctx: dict = Depends(require_penyuluh)):
        actor_user_id = ctx["user_id"]

The dependency decodes the JWT via the `auth/` module (never manually), loads
the caller's role fresh from `siaga_profiles`, and raises:
- 401 when no/invalid token identity (JWTBearer already 401s a missing token),
- 403 when the profile is missing or the role does not match.

Raised errors are `SiagaError` subclasses so the app-level exception handler
(`util.siaga_response.register_siaga_exception_handlers`) renders them as the
contract's TOP-LEVEL failure envelope — dependencies cannot return a
JSONResponse themselves, and `HTTPException(detail=...)` would nest the
envelope under `"detail"`.

`_load_profile` is a module-level seam: tests monkeypatch it to avoid Supabase.
"""
from typing import Callable, Optional

from fastapi import Depends
from loguru import logger

from auth.auth_bearer import JWTBearer
from auth.auth_handler import decode_jwt
from exceptions.siaga_exceptions import SiagaForbiddenError, UnauthorizedError

# Shared bearer instance — a single dependency key so tests can override it.
jwt_bearer = JWTBearer()

_repo = None


def _load_profile(user_id: str) -> Optional[dict]:
    """Load the caller's siaga profile (lazy repo; replaceable seam in tests)."""
    global _repo
    if _repo is None:
        from service.siaga_auth import SiagaAuthRepository

        _repo = SiagaAuthRepository()
    return _repo.get_profile_by_user_id(user_id)


def require_role(*allowed_roles: str) -> Callable:
    """Build a FastAPI dependency that only lets the given roles through.

    Returns a dict context: `{"user_id", "role", "profile", "token_payload"}`.
    """

    async def dependency(token: str = Depends(jwt_bearer)) -> dict:
        payload = decode_jwt(token)
        if not isinstance(payload, dict) or not payload.get("user_id"):
            raise UnauthorizedError()
        user_id = payload["user_id"]
        profile = _load_profile(user_id)
        role = (profile or {}).get("role")
        if profile is None or role not in allowed_roles:
            logger.warning(
                f"role guard denied: user={user_id} role={role} "
                f"required={allowed_roles}"
            )
            raise SiagaForbiddenError()
        return {
            "user_id": user_id,
            "role": role,
            "profile": profile,
            "token_payload": payload,
        }

    return dependency
