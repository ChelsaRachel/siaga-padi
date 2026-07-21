"""Internal token auth — gates /agent-mgmt/* routes.

Two-layer access:
1. JWT admin role — for admin dashboards via FE (when an /agent-mgmt admin UI is built).
2. X-Internal-Token header — for service-to-service callers (agent-python `_runs.py`,
   external orchestrators) that do not carry a JWT identity.

Pattern: try JWT first; fall back to the header check. Either succeeds → request allowed.
"""
import os
from fastapi import Header, HTTPException, Request, Depends
from typing import Optional


def _expected_token() -> str:
    # Read at call time so tests / hot-reload pick up env changes without reimport.
    return os.environ.get("INTERNAL_API_TOKEN", "") or ""


async def internal_or_admin_jwt(
    request: Request,
    x_internal_token: Optional[str] = Header(default=None, alias="X-Internal-Token"),
):
    """Allow if X-Internal-Token matches env OR JWT admin role present.

    Use as: `@router.post(..., dependencies=[Depends(internal_or_admin_jwt)])`.
    """
    expected = _expected_token()
    if expected and x_internal_token and _const_eq(x_internal_token, expected):
        return {"principal": "internal-token"}

    # JWT admin path — try to extract JWT bearer + verify role.
    # Reuse existing JWTBearer dependency if available; otherwise minimal check.
    try:
        from auth.jwt_bearer import JWTBearer
        bearer = JWTBearer()
        token_payload = await bearer(request)
        # Convention: admin role check via `roles` or `is_admin` claim.
        roles = token_payload.get("roles") or []
        is_admin = token_payload.get("is_admin") or "admin" in roles or "system" in roles
        if is_admin:
            return {"principal": f"jwt:{token_payload.get('sub', '?')}"}
    except ImportError:
        pass
    except Exception:
        pass

    raise HTTPException(
        status_code=401,
        detail="agent_mgmt requires X-Internal-Token header or JWT with admin/system role",
    )


def _const_eq(a: str, b: str) -> bool:
    """Constant-time string compare to avoid timing attacks."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a.encode(), b.encode()):
        result |= x ^ y
    return result == 0
