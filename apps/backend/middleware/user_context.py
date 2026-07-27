"""Current-user dependency for Siaga Padi routes open to ANY role.

`middleware.role_guard.require_role` restricts by role AND loads the profile;
routes like `POST /cases` accept every authenticated role, so this lighter
dependency only extracts the verified `user_id` from the JWT (decoded via the
`auth/` module — never manually). Services resolve the caller's profile
themselves through their repository seam.

Raises `UnauthorizedError` (a `SiagaError`), which the app-level handler from
`util.siaga_response.register_siaga_exception_handlers` renders as the
contract's top-level 401 failure envelope.
"""
from fastapi import Depends

from auth.auth_handler import decode_jwt
from exceptions.siaga_exceptions import UnauthorizedError
from middleware.role_guard import jwt_bearer


async def require_user(token: str = Depends(jwt_bearer)) -> str:
    """Return the authenticated caller's `user_id` or raise 401."""
    payload = decode_jwt(token)
    if not isinstance(payload, dict) or not payload.get("user_id"):
        raise UnauthorizedError()
    return payload["user_id"]
