"""Farmer profile routes: own-profile update, lahan CRUD, deletion requests."""
from conftest import (
    ANI_FIELD_ID,
    BUDI_FIELD_ID,
    FOREIGN_SESSION_ID,
    OPEN_SESSION_ID,
    PENYULUH_AREAS,
    PENYULUH_USER_ID,
    PETANI_PROFILE_ID,
    PETANI_USER_ID,
    SUBJECT_PROFILE_ID,
    bearer_headers,
    seed_case,
)

PROFILE_URL = "/farmer/profile"
FIELDS_URL = "/farmer/profile/fields"
FIELDS_GET_ALL_URL = "/farmer/profile/fields/get-all"
DELETION_URL = "/farmer/profile/deletion-request"


def _headers(user_id: str = PETANI_USER_ID) -> dict:
    return bearer_headers(user_id)


# ---- profile update -------------------------------------------------------------


def test_put_profile_updates_own_fields(client, case_repo):
    response = client.put(
        PROFILE_URL,
        json={"displayName": "Ani Baru", "researchConsent": True},
        headers=_headers(),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["profileId"] == PETANI_PROFILE_ID
    assert data["displayName"] == "Ani Baru"
    assert data["researchConsent"] is True
    stored = case_repo.profiles[PETANI_PROFILE_ID]
    assert stored["display_name"] == "Ani Baru"
    assert stored["research_consent"] is True


def test_put_profile_never_changes_role_or_account_status(client, case_repo):
    response = client.put(
        PROFILE_URL,
        json={"role": "admin", "accountStatus": "locked", "displayName": "Ani"},
        headers=_headers(),
    )

    assert response.status_code == 200
    stored = case_repo.profiles[PETANI_PROFILE_ID]
    assert stored["role"] == "petani"
    assert stored["account_status"] == "mandiri"


def test_put_profile_blank_display_name_returns_400(client, case_repo):
    response = client.put(
        PROFILE_URL, json={"displayName": "   "}, headers=_headers()
    )

    assert response.status_code == 400


def test_put_profile_penyuluh_carries_assignment_areas(client, case_repo):
    response = client.put(
        PROFILE_URL,
        json={"areaKabupaten": "Kab. Bandung"},
        headers=_headers(PENYULUH_USER_ID),
    )

    assert response.status_code == 200
    assert response.json()["data"]["assignmentAreas"] == PENYULUH_AREAS


# ---- lahan create ------------------------------------------------------------------


def test_create_field_own(client, case_repo):
    response = client.post(
        FIELDS_URL,
        json={"name": "Sawah Timur", "areaKecamatan": "Ciparay"},
        headers=_headers(),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["ownerProfileId"] == PETANI_PROFILE_ID
    assert data["name"] == "Sawah Timur"
    assert case_repo.fields[data["fieldId"]]["area_kecamatan"] == "Ciparay"


def test_create_field_assisted_owner_is_subject(client, case_repo):
    response = client.post(
        FIELDS_URL,
        json={
            "name": "Sawah Titi",
            "areaKecamatan": "Ciparay",
            "assistedSessionId": OPEN_SESSION_ID,
        },
        headers=_headers(PENYULUH_USER_ID),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["ownerProfileId"] == SUBJECT_PROFILE_ID
    assert case_repo.fields[data["fieldId"]]["owner_profile_id"] == SUBJECT_PROFILE_ID


def test_create_field_with_foreign_session_returns_403(client, case_repo):
    response = client.post(
        FIELDS_URL,
        json={"name": "Sawah X", "assistedSessionId": FOREIGN_SESSION_ID},
        headers=_headers(PENYULUH_USER_ID),
    )

    assert response.status_code == 403


def test_create_field_name_too_short_returns_400(client, case_repo):
    response = client.post(FIELDS_URL, json={"name": "A"}, headers=_headers())

    assert response.status_code == 400


# ---- lahan update ----------------------------------------------------------------


def test_update_field_own(client, case_repo):
    response = client.put(
        FIELDS_URL,
        json={"fieldId": ANI_FIELD_ID, "name": "Sawah Utara Baru"},
        headers=_headers(),
    )

    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Sawah Utara Baru"
    assert case_repo.fields[ANI_FIELD_ID]["name"] == "Sawah Utara Baru"


def _normalized_404_body(response) -> dict:
    body = response.json()
    meta = {k: v for k, v in body["metaData"].items() if k != "executionTime"}
    return {**body, "metaData": meta}


def test_update_foreign_field_404_identical_to_missing(client, case_repo):
    foreign = client.put(
        FIELDS_URL,
        json={"fieldId": BUDI_FIELD_ID, "name": "Dicuri"},
        headers=_headers(),
    )
    missing = client.put(
        FIELDS_URL,
        json={"fieldId": "no-such-field", "name": "Dicuri"},
        headers=_headers(),
    )

    assert foreign.status_code == 404 and missing.status_code == 404
    assert _normalized_404_body(foreign) == _normalized_404_body(missing)
    assert case_repo.fields[BUDI_FIELD_ID]["name"] == "Sawah Selatan"


def test_update_field_area_and_coords(client, case_repo):
    response = client.put(
        FIELDS_URL,
        json={
            "fieldId": ANI_FIELD_ID,
            "areaKabupaten": "Kab. Bandung Barat",
            "areaKecamatan": "Baleendah",
            "coords": {"lat": -6.9, "lng": 107.5},
        },
        headers=_headers(),
    )

    assert response.status_code == 200
    stored = case_repo.fields[ANI_FIELD_ID]
    assert stored["area_kabupaten"] == "Kab. Bandung Barat"
    assert stored["area_kecamatan"] == "Baleendah"
    assert stored["coords"] == {"lat": -6.9, "lng": 107.5}


# ---- lahan get-all -----------------------------------------------------------------


def test_fields_get_all_carries_case_count_and_last_growth_stage(client, case_repo):
    seed_case(
        case_repo, "case-1", PETANI_PROFILE_ID, field_id=ANI_FIELD_ID,
        growth_stage="VEGETATIVE", created_at="2026-07-01T00:00:00+00:00",
    )
    seed_case(
        case_repo, "case-2", PETANI_PROFILE_ID, field_id=ANI_FIELD_ID,
        growth_stage="RIPENING", created_at="2026-07-20T00:00:00+00:00",
    )

    response = client.post(FIELDS_GET_ALL_URL, json={}, headers=_headers())

    assert response.status_code == 200
    body = response.json()
    cards = {card["fieldId"]: card for card in body["data"]}
    assert set(cards) == {ANI_FIELD_ID, "field-ani-noarea"}  # own lahan only
    assert cards[ANI_FIELD_ID]["caseCount"] == 2
    assert cards[ANI_FIELD_ID]["lastGrowthStage"] == "RIPENING"
    assert cards["field-ani-noarea"]["caseCount"] == 0
    assert cards["field-ani-noarea"]["lastGrowthStage"] is None
    pagination = body["metaData"]["pagination"]
    assert pagination["totalElements"] == 2
    assert pagination["totalPages"] == 1


# ---- deletion request ---------------------------------------------------------


def test_create_deletion_request_recorded(client, case_repo):
    response = client.post(
        DELETION_URL, json={"reason": "Pindah domisili"}, headers=_headers()
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "tercatat"
    assert data["profileId"] == PETANI_PROFILE_ID
    assert data["reason"] == "Pindah domisili"
    assert data["processedAt"] is None
    assert len(case_repo.deletion_requests) == 1


def test_get_deletion_request_returns_latest_own(client, case_repo):
    client.post(DELETION_URL, json={"reason": "Pertama"}, headers=_headers())
    client.post(DELETION_URL, json={"reason": "Kedua"}, headers=_headers())

    response = client.get(DELETION_URL, headers=_headers())

    assert response.status_code == 200
    assert response.json()["data"]["reason"] == "Kedua"


def test_get_deletion_request_without_any_returns_null(client, case_repo):
    response = client.get(DELETION_URL, headers=_headers())

    assert response.status_code == 200
    assert response.json()["data"] is None


def test_deletion_request_reason_over_500_chars_returns_400(client, case_repo):
    response = client.post(
        DELETION_URL, json={"reason": "x" * 501}, headers=_headers()
    )

    assert response.status_code == 400
    assert case_repo.deletion_requests == []
