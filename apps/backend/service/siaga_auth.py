"""Siaga Padi auth service: login + DB-persisted lockout, refresh, /me.

Lockout policy (pinned contract): 5 failures within a rolling 15-minute
window — keyed by the LOWERCASED SUBMITTED EMAIL whether or not it matches an
account — lock for 15 minutes (HTTP 423). Wrong-password and unknown-account
produce identical error bodies so account existence never leaks.

The repository is an injectable seam (`SiagaAuthService(repo=...)`) so unit
tests run against an in-memory fake instead of Supabase.
"""
import math
from datetime import datetime, timedelta, timezone
from typing import NoReturn, Optional, Protocol

import bcrypt
from loguru import logger

from auth.auth_handler import base_sign_jwt, decode_jwt, sign_jwt
from config.base import settings
from dto.siaga_auth import SiagaLoginDTO, SiagaRefreshDTO
from dto.siaga_profile import profile_from_row
from exceptions.siaga_exceptions import (
    AccountLockedError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    UnauthorizedError,
)
from models.siaga_profile import ROLE_PENYULUH
from service import BaseSupabaseRepository, Services
from util.helper import censor_email

LOCKOUT_MAX_FAILURES = 5
LOCKOUT_WINDOW_SECONDS = 15 * 60
LOCKOUT_DURATION_SECONDS = 15 * 60
SINGLE_LOGIN_GRACE_SECONDS = 24 * 60 * 60
SECONDS_PER_MINUTE = 60

# Constant-time guard: compared against when the account (or its password
# hash) does not exist, so unknown-account and wrong-password take the same
# bcrypt round trip.
_DUMMY_PASSWORD_HASH = bcrypt.hashpw(b"siaga-dummy-credential", bcrypt.gensalt(10))


def _locked_message(retry_after_seconds: int) -> str:
    minutes = max(1, math.ceil(retry_after_seconds / SECONDS_PER_MINUTE))
    return (
        "Terlalu banyak percobaan masuk. "
        f"Silakan coba lagi dalam {minutes} menit."
    )


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_timestamp(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


class SiagaAuthRepositoryProtocol(Protocol):
    """Data-access seam consumed by `SiagaAuthService` (fakeable in tests)."""

    def find_user_by_email(self, email: str) -> Optional[dict]: ...

    def get_profile_by_user_id(self, user_id: str) -> Optional[dict]: ...

    def get_assignment_areas(self, user_id: str) -> list[str]: ...

    def get_lockout(self, email: str) -> Optional[dict]: ...

    def upsert_lockout(self, row: dict) -> None: ...

    def clear_lockout(self, email: str) -> None: ...


class SiagaAuthRepository(BaseSupabaseRepository):
    """Supabase-backed implementation of the auth data seam."""

    def __init__(self) -> None:
        super().__init__()
        self.user_table = settings.SUPABASE_TABLE_USER
        self.profile_table = settings.SUPABASE_TABLE_SIAGA_PROFILE
        self.assignment_table = settings.SUPABASE_TABLE_PENYULUH_ASSIGNMENT
        self.lockout_table = settings.SUPABASE_TABLE_LOGIN_LOCKOUT

    def _first(self, query) -> Optional[dict]:
        rows = query.limit(1).execute().data or []
        return rows[0] if rows else None

    def find_user_by_email(self, email: str) -> Optional[dict]:
        return self._first(
            self.table(self.user_table).select("*").eq("email", email)
        )

    def get_profile_by_user_id(self, user_id: str) -> Optional[dict]:
        return self._first(
            self.table(self.profile_table).select("*").eq("user_id", user_id)
        )

    def get_assignment_areas(self, user_id: str) -> list[str]:
        row = self._first(
            self.table(self.assignment_table)
            .select("area_kecamatan")
            .eq("user_id", user_id)
        )
        return list(row.get("area_kecamatan") or []) if row else []

    def get_lockout(self, email: str) -> Optional[dict]:
        return self._first(
            self.table(self.lockout_table).select("*").eq("email", email)
        )

    def upsert_lockout(self, row: dict) -> None:
        self.table(self.lockout_table).upsert(row).execute()

    def clear_lockout(self, email: str) -> None:
        self.table(self.lockout_table).delete().eq("email", email).execute()


class SiagaAuthService:
    """Login / refresh / me built on top of the boilerplate JWT helpers."""

    def __init__(self, repo: Optional[SiagaAuthRepositoryProtocol] = None) -> None:
        self._repo = repo

    @property
    def repo(self) -> SiagaAuthRepositoryProtocol:
        if self._repo is None:
            self._repo = SiagaAuthRepository()
        return self._repo

    # ---- login -----------------------------------------------------------

    def login(self, dto: SiagaLoginDTO) -> dict:
        email = dto.email  # normalized (lowercased) by the DTO validator
        now = _now()
        self._ensure_not_locked(email, now)
        user = self._verify_credentials(email, dto.password, now)
        profile = self.repo.get_profile_by_user_id(user["id"])
        if profile is None:
            self._handle_failed_attempt(email, now, reason="no siaga profile")
        self.repo.clear_lockout(email)
        areas = self._assignment_areas_for(profile)
        session = self._build_session(user, profile)
        logger.info(
            f"siaga login success: {censor_email(email)} role={profile['role']}"
        )
        return {
            "session": session,
            "profile": profile_from_row(profile, areas).model_dump(),
        }

    def _verify_credentials(self, email: str, password: str, now: datetime) -> dict:
        user = self.repo.find_user_by_email(email)
        stored_hash = (user or {}).get("password") or _DUMMY_PASSWORD_HASH.decode(
            "utf-8"
        )
        is_match = bcrypt.checkpw(
            password.encode("utf-8"), stored_hash.encode("utf-8")
        )
        if user is None or not user.get("password") or not is_match:
            self._handle_failed_attempt(email, now, reason="bad credentials")
        return user

    def _handle_failed_attempt(
        self, email: str, now: datetime, reason: str
    ) -> NoReturn:
        """Record the failure; raise 423 when it trips the lock, else 401."""
        locked_until = self._register_failure(email, now)
        logger.warning(f"siaga login failed ({reason}): {censor_email(email)}")
        if locked_until is not None:
            logger.warning(
                f"siaga login lockout: {censor_email(email)} until {locked_until}"
            )
            raise AccountLockedError(
                _locked_message(LOCKOUT_DURATION_SECONDS),
                retry_after_seconds=LOCKOUT_DURATION_SECONDS,
                locked_until=locked_until,
            )
        raise InvalidCredentialsError()

    def _register_failure(self, email: str, now: datetime) -> Optional[str]:
        """Persist the failure in login_lockouts; return locked_until if tripped."""
        row = self.repo.get_lockout(email) or {}
        window_started = _parse_timestamp(row.get("window_started_at"))
        is_in_window = (
            window_started is not None
            and (now - window_started).total_seconds() < LOCKOUT_WINDOW_SECONDS
        )
        failed_count = (row.get("failed_count", 0) + 1) if is_in_window else 1
        window_start = window_started if is_in_window else now
        locked_until: Optional[str] = None
        if failed_count >= LOCKOUT_MAX_FAILURES:
            locked_until = (
                now + timedelta(seconds=LOCKOUT_DURATION_SECONDS)
            ).isoformat()
        self.repo.upsert_lockout(
            {
                "email": email,
                "failed_count": failed_count,
                "window_started_at": window_start.isoformat(),
                "locked_until": locked_until,
                "updated_at": now.isoformat(),
            }
        )
        return locked_until

    def _ensure_not_locked(self, email: str, now: datetime) -> None:
        row = self.repo.get_lockout(email) or {}
        locked_until = _parse_timestamp(row.get("locked_until"))
        if locked_until is None or now >= locked_until:
            return
        retry_after = max(1, int((locked_until - now).total_seconds()))
        raise AccountLockedError(
            _locked_message(retry_after),
            retry_after_seconds=retry_after,
            locked_until=locked_until.isoformat(),
        )

    # ---- session building ------------------------------------------------

    def _build_session(self, user: dict, profile: dict) -> dict:
        multi_login = user.get("multiLogin")
        multi_login = True if multi_login is None else bool(multi_login)
        auth = sign_jwt(
            user["id"],
            user.get("organizationId"),
            user.get("permissionId"),
            multi_login,
            role=profile["role"],
            profileId=profile["id"],
        )
        if not multi_login:
            self._store_single_session(user["id"], auth)
        return self._session_payload(auth)

    @staticmethod
    def _session_payload(auth: dict) -> dict:
        return {
            "accessToken": auth["token"],
            "refreshToken": auth["refresh_token"],
            "tokenType": "bearer",
            "expiresIn": settings.JWT_EXPIRED,
        }

    @staticmethod
    def _store_single_session(user_id: str, auth: dict) -> None:
        """Single-login accounts: JWTBearer checks Redis `session:{user_id}`."""
        redis_client = Services.redis()
        redis_key = f"session:{user_id}"
        redis_client.delete(redis_key)
        redis_client.setex(
            redis_key,
            settings.JWT_EXPIRED + SINGLE_LOGIN_GRACE_SECONDS,
            auth["token"],
        )

    # ---- refresh ----------------------------------------------------------

    def refresh(self, dto: SiagaRefreshDTO) -> dict:
        payload = decode_jwt(dto.refreshToken)
        if not isinstance(payload, dict) or payload.get("type") != "refresh":
            raise InvalidRefreshTokenError()
        user_id = payload.get("user_id")
        if not user_id:
            raise InvalidRefreshTokenError()
        base_payload = {
            key: value
            for key, value in payload.items()
            if key not in ("type", "expire")
        }
        auth = base_sign_jwt(base_payload)
        if payload.get("multiLogin") is False:
            self._store_single_session(user_id, auth)
        logger.info(f"siaga session refreshed: user={user_id}")
        return {"session": self._session_payload(auth)}

    # ---- me ----------------------------------------------------------------

    def get_me(self, user_id: str) -> dict:
        profile = self.repo.get_profile_by_user_id(user_id)
        if profile is None:
            raise UnauthorizedError()
        areas = self._assignment_areas_for(profile)
        return profile_from_row(profile, areas).model_dump()

    def _assignment_areas_for(self, profile: dict) -> Optional[list[str]]:
        if profile["role"] != ROLE_PENYULUH or not profile.get("user_id"):
            return None
        return self.repo.get_assignment_areas(profile["user_id"])
