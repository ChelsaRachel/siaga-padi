"""Edge-branch tests: single-login Redis path, malformed tokens/timestamps."""
from datetime import datetime, timezone

from conftest import (
    CORRECT_PASSWORD,
    FakeAuthRepo,
    PETANI_EMAIL,
    PETANI_USER_ID,
    make_profile,
    make_user,
)

LOGIN_URL = "/siaga/auth/login"
REFRESH_URL = "/siaga/auth/refresh"
SEARCH_URL = "/assisted/search"


def test_single_login_account_stores_session_in_redis(
    client, monkeypatch, password_hash
):
    # Arrange: an account flagged multiLogin=False (single-login enforcement).
    from router import siaga_auth as siaga_auth_router
    from service import Services
    from service.siaga_auth import SiagaAuthService

    user = {**make_user(PETANI_USER_ID, PETANI_EMAIL, password_hash), "multiLogin": False}
    repo = FakeAuthRepo(
        users=[user],
        profiles=[make_profile("profile-petani-1", PETANI_USER_ID, "petani")],
    )
    monkeypatch.setattr(siaga_auth_router, "obj", SiagaAuthService(repo=repo))
    redis_client = Services.redis()
    redis_key = f"session:{PETANI_USER_ID}"
    redis_client.delete(redis_key)

    try:
        # Act
        response = client.post(
            LOGIN_URL, json={"email": PETANI_EMAIL, "password": CORRECT_PASSWORD}
        )

        # Assert: the issued access token is the active session in Redis.
        assert response.status_code == 200
        session = response.json()["data"]["session"]
        assert redis_client.get(redis_key) == session["accessToken"]

        # Refresh keeps the single-login session in sync.
        refreshed = client.post(
            REFRESH_URL, json={"refreshToken": session["refreshToken"]}
        )
        assert refreshed.status_code == 200
        new_access = refreshed.json()["data"]["session"]["accessToken"]
        assert redis_client.get(redis_key) == new_access
    finally:
        redis_client.delete(redis_key)


def test_refresh_token_without_user_id_returns_401(client, auth_repo):
    from auth.auth_handler import base_sign_jwt

    tokens = base_sign_jwt({"multiLogin": True})  # refresh token with no user_id

    response = client.post(
        REFRESH_URL, json={"refreshToken": tokens["refresh_token"]}
    )

    assert response.status_code == 401


def test_role_guard_rejects_token_without_user_id(client, assisted_repo):
    from auth.auth_handler import base_sign_jwt

    tokens = base_sign_jwt({"multiLogin": True})
    headers = {"Authorization": f"Bearer {tokens['token']}"}

    response = client.post(SEARCH_URL, json={"query": "ani"}, headers=headers)

    assert response.status_code == 401


def test_garbage_window_timestamp_is_treated_as_new_window(client, auth_repo):
    auth_repo.lockouts[PETANI_EMAIL] = {
        "email": PETANI_EMAIL,
        "failed_count": 4,
        "window_started_at": "not-a-timestamp",
        "locked_until": None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    response = client.post(
        LOGIN_URL, json={"email": PETANI_EMAIL, "password": "wrong-password"}
    )

    # Unparseable window → treated as a fresh window; counter restarts at 1.
    assert response.status_code == 401
    assert auth_repo.lockouts[PETANI_EMAIL]["failed_count"] == 1
