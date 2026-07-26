"""Auth route tests: login, lockout window, refresh, /me, envelope shape."""
from datetime import datetime, timedelta, timezone

from conftest import (
    CORRECT_PASSWORD,
    PENYULUH_AREAS,
    PENYULUH_EMAIL,
    PENYULUH_USER_ID,
    PETANI_EMAIL,
    WRONG_PASSWORD,
    bearer_headers,
)

LOGIN_URL = "/siaga/auth/login"
REFRESH_URL = "/siaga/auth/refresh"
ME_URL = "/siaga/auth/me"
UNKNOWN_EMAIL = "tidak.ada@example.com"


def _login(client, email: str, password: str):
    return client.post(LOGIN_URL, json={"email": email, "password": password})


# ---- login success -----------------------------------------------------------


def test_login_success_returns_session_and_camelcase_profile(client, auth_repo):
    # Act
    response = _login(client, PETANI_EMAIL, CORRECT_PASSWORD)

    # Assert
    assert response.status_code == 200
    body = response.json()
    session = body["data"]["session"]
    assert session["tokenType"] == "bearer"
    assert isinstance(session["accessToken"], str) and session["accessToken"]
    assert isinstance(session["refreshToken"], str) and session["refreshToken"]
    assert isinstance(session["expiresIn"], int)
    profile = body["data"]["profile"]
    assert profile["displayName"] == "Ani Petani"
    assert profile["role"] == "petani"
    assert profile["accountStatus"] == "mandiri"
    assert profile["assignmentAreas"] is None


def test_login_success_penyuluh_includes_assignment_areas(client, auth_repo):
    response = _login(client, PENYULUH_EMAIL, CORRECT_PASSWORD)

    assert response.status_code == 200
    profile = response.json()["data"]["profile"]
    assert profile["role"] == "penyuluh"
    assert profile["assignmentAreas"] == PENYULUH_AREAS


# ---- lockout window ------------------------------------------------------------


def test_four_failures_still_return_401(client, auth_repo):
    for _ in range(4):
        response = _login(client, PETANI_EMAIL, WRONG_PASSWORD)
        assert response.status_code == 401


def test_fifth_failure_within_window_returns_423_with_retry_info(client, auth_repo):
    for _ in range(4):
        _login(client, PETANI_EMAIL, WRONG_PASSWORD)

    response = _login(client, PETANI_EMAIL, WRONG_PASSWORD)

    assert response.status_code == 423
    body = response.json()
    assert body["metaData"]["status"] is False
    assert body["metaData"]["responseCode"] == 423
    info = body["additionalInfo"]
    assert isinstance(info["retryAfterSeconds"], int) and info["retryAfterSeconds"] > 0
    assert isinstance(info["lockedUntil"], str) and info["lockedUntil"]


def test_locked_email_rejects_even_correct_password(client, auth_repo):
    for _ in range(5):
        _login(client, PETANI_EMAIL, WRONG_PASSWORD)

    response = _login(client, PETANI_EMAIL, CORRECT_PASSWORD)

    assert response.status_code == 423
    assert response.json()["additionalInfo"]["retryAfterSeconds"] <= 15 * 60


def test_unknown_email_also_locks_after_five_failures(client, auth_repo):
    for _ in range(4):
        response = _login(client, UNKNOWN_EMAIL, WRONG_PASSWORD)
        assert response.status_code == 401

    response = _login(client, UNKNOWN_EMAIL, WRONG_PASSWORD)

    assert response.status_code == 423
    assert UNKNOWN_EMAIL in auth_repo.lockouts


def test_fail_count_resets_after_window_elapses(client, auth_repo):
    # Arrange: 4 failures whose window started 16 minutes ago (window is 15).
    stale_start = datetime.now(timezone.utc) - timedelta(minutes=16)
    auth_repo.lockouts[PETANI_EMAIL] = {
        "email": PETANI_EMAIL,
        "failed_count": 4,
        "window_started_at": stale_start.isoformat(),
        "locked_until": None,
        "updated_at": stale_start.isoformat(),
    }

    # Act: a new failure after the window elapsed.
    response = _login(client, PETANI_EMAIL, WRONG_PASSWORD)

    # Assert: not locked; the counter restarted at 1.
    assert response.status_code == 401
    assert auth_repo.lockouts[PETANI_EMAIL]["failed_count"] == 1


def test_expired_lock_allows_login_again(client, auth_repo):
    past = datetime.now(timezone.utc) - timedelta(minutes=20)
    auth_repo.lockouts[PETANI_EMAIL] = {
        "email": PETANI_EMAIL,
        "failed_count": 5,
        "window_started_at": past.isoformat(),
        "locked_until": (past + timedelta(minutes=15)).isoformat(),
        "updated_at": past.isoformat(),
    }

    response = _login(client, PETANI_EMAIL, CORRECT_PASSWORD)

    assert response.status_code == 200


def test_success_resets_failure_counter(client, auth_repo):
    for _ in range(2):
        _login(client, PETANI_EMAIL, WRONG_PASSWORD)

    assert _login(client, PETANI_EMAIL, CORRECT_PASSWORD).status_code == 200
    assert PETANI_EMAIL not in auth_repo.lockouts

    # 4 fresh failures after the reset must still be 401 (not the 5th overall).
    for _ in range(4):
        response = _login(client, PETANI_EMAIL, WRONG_PASSWORD)
        assert response.status_code == 401


# ---- account-existence privacy ----------------------------------------------------


def test_identical_error_body_for_unknown_account_and_wrong_password(
    client, auth_repo
):
    wrong_password = _login(client, PETANI_EMAIL, WRONG_PASSWORD)
    unknown_account = _login(client, UNKNOWN_EMAIL, WRONG_PASSWORD)

    assert wrong_password.status_code == unknown_account.status_code == 401
    body_a, body_b = wrong_password.json(), unknown_account.json()
    body_a["metaData"]["executionTime"] = 0
    body_b["metaData"]["executionTime"] = 0
    assert body_a == body_b


# ---- refresh -----------------------------------------------------------------------


def test_refresh_with_valid_token_returns_new_session(client, auth_repo):
    login_body = _login(client, PETANI_EMAIL, CORRECT_PASSWORD).json()
    refresh_token = login_body["data"]["session"]["refreshToken"]

    response = client.post(REFRESH_URL, json={"refreshToken": refresh_token})

    assert response.status_code == 200
    session = response.json()["data"]["session"]
    assert session["tokenType"] == "bearer"
    assert session["accessToken"]
    assert session["refreshToken"]


def test_refresh_with_garbage_token_returns_401(client, auth_repo):
    response = client.post(REFRESH_URL, json={"refreshToken": "not-a-jwt"})

    assert response.status_code == 401
    assert response.json()["metaData"]["status"] is False


def test_refresh_rejects_access_token(client, auth_repo):
    login_body = _login(client, PETANI_EMAIL, CORRECT_PASSWORD).json()
    access_token = login_body["data"]["session"]["accessToken"]

    response = client.post(REFRESH_URL, json={"refreshToken": access_token})

    assert response.status_code == 401


# ---- /me -----------------------------------------------------------------------------


def test_me_returns_camelcase_profile_with_areas_for_penyuluh(client, auth_repo):
    response = client.get(ME_URL, headers=bearer_headers(PENYULUH_USER_ID))

    assert response.status_code == 200
    profile = response.json()["data"]
    assert profile["profileId"] == "profile-penyuluh-1"
    assert profile["userId"] == PENYULUH_USER_ID
    assert profile["displayName"] == "Dewi Penyuluh"
    assert profile["role"] == "penyuluh"
    assert profile["assignmentAreas"] == PENYULUH_AREAS
    assert profile["accountStatus"] == "mandiri"


def test_me_without_token_returns_401(client, auth_repo):
    response = client.get(ME_URL)

    assert response.status_code == 401


def test_me_with_unknown_user_returns_401(client, auth_repo):
    response = client.get(ME_URL, headers=bearer_headers("user-without-profile"))

    assert response.status_code == 401
    assert response.json()["metaData"]["responseCode"] == 401


# ---- envelope shape -----------------------------------------------------------------


def test_envelope_shape_on_success(client, auth_repo):
    body = _login(client, PETANI_EMAIL, CORRECT_PASSWORD).json()

    meta = body["metaData"]
    assert meta["status"] is True
    assert meta["responseCode"] == 200
    assert isinstance(meta["executionTime"], int)
    assert "data" in body
    assert "additionalInfo" in body
    assert "copyright" in body


def test_envelope_shape_on_failure(client, auth_repo):
    body = _login(client, PETANI_EMAIL, WRONG_PASSWORD).json()

    meta = body["metaData"]
    assert meta["status"] is False
    assert meta["responseCode"] == 401
    assert isinstance(meta["executionTime"], int)
    assert meta["message"] == "Email atau kata sandi tidak cocok."
    assert body["additionalInfo"] is None
