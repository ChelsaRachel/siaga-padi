"""Assisted-mode tests: scoped search, XOR validation, session lifecycle."""
from conftest import (
    OTHER_PENYULUH_USER_ID,
    PENYULUH_USER_ID,
    bearer_headers,
)

SEARCH_URL = "/assisted/search"
START_URL = "/assisted/start"
END_URL = "/assisted/end"


def _headers() -> dict:
    return bearer_headers(PENYULUH_USER_ID)


# ---- search scoping -------------------------------------------------------------


def test_search_is_scoped_to_assignment_areas(client, assisted_repo):
    # "Tani" matches Budi (Baleendah, in scope) and Cici (Soreang, OUT of scope).
    response = client.post(SEARCH_URL, json={"query": "tani"}, headers=_headers())

    assert response.status_code == 200
    results = response.json()["data"]
    names = [row["displayName"] for row in results]
    assert "Budi Tani" in names
    assert "Cici Tani" not in names
    assert all(
        row["areaKecamatan"] in ("Ciparay", "Baleendah") for row in results
    )


def test_search_result_shape_is_camelcase(client, assisted_repo):
    response = client.post(SEARCH_URL, json={"query": "ani"}, headers=_headers())

    results = response.json()["data"]
    assert results, "expected at least one in-scope match"
    assert set(results[0].keys()) == {
        "profileId",
        "displayName",
        "areaKabupaten",
        "areaKecamatan",
        "accountStatus",
    }


def test_search_without_assignment_returns_empty_never_global(
    client, assisted_repo, monkeypatch
):
    assisted_repo.assignments[PENYULUH_USER_ID] = []

    response = client.post(SEARCH_URL, json={"query": "ani"}, headers=_headers())

    assert response.status_code == 200
    assert response.json()["data"] == []


# ---- start: XOR validation ---------------------------------------------------------


def test_start_with_both_subject_and_new_profile_returns_400(client, assisted_repo):
    response = client.post(
        START_URL,
        json={
            "subjectProfileId": "profile-ani",
            "newProfile": {"displayName": "X", "areaKecamatan": "Ciparay"},
            "consentMethod": "lisan",
        },
        headers=_headers(),
    )

    assert response.status_code == 400
    assert response.json()["metaData"]["status"] is False


def test_start_with_neither_subject_nor_new_profile_returns_400(
    client, assisted_repo
):
    response = client.post(
        START_URL, json={"consentMethod": "lisan"}, headers=_headers()
    )

    assert response.status_code == 400


# ---- start: scope enforcement ----------------------------------------------------


def test_start_with_out_of_scope_subject_returns_403(client, assisted_repo):
    # profile-cici is in Soreang — outside the caller's binaan areas.
    response = client.post(
        START_URL,
        json={"subjectProfileId": "profile-cici", "consentMethod": "lisan"},
        headers=_headers(),
    )

    assert response.status_code == 403


def test_start_with_unknown_subject_returns_403(client, assisted_repo):
    response = client.post(
        START_URL,
        json={"subjectProfileId": "no-such-profile", "consentMethod": "lisan"},
        headers=_headers(),
    )

    assert response.status_code == 403


def test_start_with_new_profile_outside_scope_returns_403(client, assisted_repo):
    response = client.post(
        START_URL,
        json={
            "newProfile": {"displayName": "Baru Tani", "areaKecamatan": "Soreang"},
            "consentMethod": "tertulis",
        },
        headers=_headers(),
    )

    assert response.status_code == 403


# ---- start: happy paths ------------------------------------------------------------


def test_start_with_existing_subject_records_audit_stamp(client, assisted_repo):
    response = client.post(
        START_URL,
        json={"subjectProfileId": "profile-ani", "consentMethod": "in_app"},
        headers=_headers(),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["subjectProfileId"] == "profile-ani"
    assert data["subjectDisplayName"] == "Ani Petani"
    assert data["actorUserId"] == PENYULUH_USER_ID
    assert data["consentMethod"] == "in_app"
    assert data["startedAt"]
    # The assisted_sessions row is the audit stamp: actor + subject + consent + time.
    stored = assisted_repo.sessions[data["sessionId"]]
    assert stored["actor_user_id"] == PENYULUH_USER_ID
    assert stored["subject_profile_id"] == "profile-ani"
    assert stored["consent_method"] == "in_app"
    assert stored["started_at"] and stored["ended_at"] is None


def test_start_with_new_profile_creates_didampingi_profile(client, assisted_repo):
    response = client.post(
        START_URL,
        json={
            "newProfile": {
                "displayName": "Baru Tani",
                "areaKabupaten": "Kab. Bandung",
                "areaKecamatan": "Ciparay",
            },
            "consentMethod": "lisan",
        },
        headers=_headers(),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    created = assisted_repo.profiles[data["subjectProfileId"]]
    assert created["account_status"] == "didampingi"
    assert created["role"] == "petani"
    assert created["user_id"] is None  # no credentials
    assert data["subjectDisplayName"] == "Baru Tani"


# ---- end: lifecycle + ownership -------------------------------------------------


def _start_session(client) -> str:
    response = client.post(
        START_URL,
        json={"subjectProfileId": "profile-ani", "consentMethod": "lisan"},
        headers=_headers(),
    )
    return response.json()["data"]["sessionId"]


def test_end_closes_session_and_sets_ended_at(client, assisted_repo):
    session_id = _start_session(client)

    response = client.post(
        END_URL, json={"sessionId": session_id}, headers=_headers()
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["sessionId"] == session_id
    assert data["endedAt"]
    assert assisted_repo.sessions[session_id]["ended_at"] == data["endedAt"]


def test_end_by_non_owner_returns_403(client, assisted_repo):
    session_id = _start_session(client)

    response = client.post(
        END_URL,
        json={"sessionId": session_id},
        headers=bearer_headers(OTHER_PENYULUH_USER_ID),
    )

    assert response.status_code == 403
    assert assisted_repo.sessions[session_id]["ended_at"] is None


def test_end_twice_returns_400(client, assisted_repo):
    session_id = _start_session(client)
    client.post(END_URL, json={"sessionId": session_id}, headers=_headers())

    response = client.post(
        END_URL, json={"sessionId": session_id}, headers=_headers()
    )

    assert response.status_code == 400


def test_end_unknown_session_returns_400(client, assisted_repo):
    response = client.post(
        END_URL, json={"sessionId": "no-such-session"}, headers=_headers()
    )

    assert response.status_code == 400
