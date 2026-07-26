"""Role-guard tests via the assisted router (penyuluh-only endpoints)."""
from conftest import PENYULUH_USER_ID, PETANI_USER_ID, bearer_headers

SEARCH_URL = "/assisted/search"
SEARCH_BODY = {"query": "ani"}


def test_correct_role_is_allowed(client, assisted_repo):
    response = client.post(
        SEARCH_URL, json=SEARCH_BODY, headers=bearer_headers(PENYULUH_USER_ID)
    )

    assert response.status_code == 200
    assert response.json()["metaData"]["status"] is True


def test_wrong_role_returns_403(client, assisted_repo):
    response = client.post(
        SEARCH_URL, json=SEARCH_BODY, headers=bearer_headers(PETANI_USER_ID)
    )

    assert response.status_code == 403


def test_missing_token_returns_401(client, assisted_repo):
    response = client.post(SEARCH_URL, json=SEARCH_BODY)

    assert response.status_code == 401


def test_unknown_user_without_profile_returns_403(client, assisted_repo):
    response = client.post(
        SEARCH_URL, json=SEARCH_BODY, headers=bearer_headers("user-unknown")
    )

    assert response.status_code == 403
