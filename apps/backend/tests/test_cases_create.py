"""POST /cases: idempotent create, validation rules, assisted ownership."""
import re
import uuid
from datetime import datetime, timedelta, timezone

from conftest import (
    ANI_FIELD_ID,
    ENDED_SESSION_ID,
    FOREIGN_SESSION_ID,
    OPEN_SESSION_ID,
    PENYULUH_PROFILE_ID,
    PENYULUH_USER_ID,
    PETANI_PROFILE_ID,
    PETANI_USER_ID,
    SUBJECT_PROFILE_ID,
    bearer_headers,
)

CASES_URL = "/cases"
CASE_CODE_PATTERN = re.compile(r"^KS-\d{4}-\d{6}$")


def _headers(user_id: str = PETANI_USER_ID, key: str | None = "auto") -> dict:
    headers = bearer_headers(user_id)
    if key == "auto":
        return {**headers, "Idempotency-Key": uuid.uuid4().hex}
    if key is None:
        return headers
    return {**headers, "Idempotency-Key": key}


def _body(**overrides) -> dict:
    base = {
        "fieldId": ANI_FIELD_ID,
        "locationMode": "AREA_ONLY",
        "growthStage": "VEGETATIVE",
        "observedAt": datetime.now(timezone.utc).isoformat(),
        "notes": "Daun menguning di petak utara",
    }
    return {**base, **overrides}


# ---- happy path -----------------------------------------------------------------


def test_create_happy_petani_draft_with_creation_event(client, case_repo):
    response = client.post(CASES_URL, json=_body(), headers=_headers())

    assert response.status_code == 200
    data = response.json()["data"]
    case = data["case"]
    assert data["replayed"] is False
    assert case["status"] == "DRAFT"
    assert case["displayStage"] == "draf"
    assert CASE_CODE_PATTERN.match(case["caseCode"])
    assert case["ownerProfileId"] == PETANI_PROFILE_ID
    assert case["createdByProfileId"] == PETANI_PROFILE_ID
    assert case["fieldName"] == "Sawah Utara"
    # Area denormalized from the chosen lahan.
    assert case["areaKecamatan"] == "Ciparay"
    events = case_repo.list_events(case["caseId"])
    assert len(events) == 1
    assert events[0]["from_status"] is None
    assert events[0]["to_status"] == "DRAFT"
    assert events[0]["actor_profile_id"] == PETANI_PROFILE_ID
    assert events[0]["note"] == "Kasus dibuat"


def test_replay_same_key_returns_same_case_without_duplicate(client, case_repo):
    headers = _headers(key=uuid.uuid4().hex)

    first = client.post(CASES_URL, json=_body(), headers=headers)
    second = client.post(CASES_URL, json=_body(), headers=headers)

    assert first.status_code == 200 and second.status_code == 200
    assert first.json()["data"]["replayed"] is False
    assert second.json()["data"]["replayed"] is True
    assert (
        second.json()["data"]["case"]["caseId"]
        == first.json()["data"]["case"]["caseId"]
    )
    assert len(case_repo.cases) == 1


def test_replay_with_foreign_key_is_denied_and_leaks_nothing(client, case_repo):
    """A key only replays for its creator — never returns another user's case."""
    from conftest import OTHER_PETANI_USER_ID

    key = uuid.uuid4().hex
    first = client.post(CASES_URL, json=_body(), headers=_headers(key=key))
    assert first.status_code == 200

    foreign_body = _body(fieldId=None, locationMode="NONE")
    replay = client.post(
        CASES_URL,
        json=foreign_body,
        headers=_headers(user_id=OTHER_PETANI_USER_ID, key=key),
    )

    assert replay.status_code == 400
    body = replay.json()
    assert body["metaData"]["message"] == "Kunci idempotensi tidak valid."
    assert body["data"] is None  # no case payload leaks
    assert len(case_repo.cases) == 1  # and no duplicate was created


def test_create_with_new_field_creates_lahan_owned_by_owner(client, case_repo):
    body = _body(
        fieldId=None,
        newField={
            "name": "Sawah Baru",
            "areaKabupaten": "Kab. Bandung",
            "areaKecamatan": "Baleendah",
        },
    )

    response = client.post(CASES_URL, json=body, headers=_headers())

    assert response.status_code == 200
    case = response.json()["data"]["case"]
    assert case["fieldId"] is not None
    created = case_repo.fields[case["fieldId"]]
    assert created["owner_profile_id"] == PETANI_PROFILE_ID
    assert created["name"] == "Sawah Baru"
    assert case["areaKecamatan"] == "Baleendah"  # denormalized from newField


def test_create_belum_tahu_mode_none_without_field_succeeds(client, case_repo):
    body = _body(fieldId=None, locationMode="NONE")

    response = client.post(CASES_URL, json=body, headers=_headers())

    assert response.status_code == 200
    case = response.json()["data"]["case"]
    assert case["fieldId"] is None
    assert case["locationMode"] == "NONE"
    assert case["status"] == "DRAFT"


# ---- validation (400) ---------------------------------------------------------


def test_missing_idempotency_key_returns_400(client, case_repo):
    response = client.post(CASES_URL, json=_body(), headers=_headers(key=None))

    assert response.status_code == 400
    assert response.json()["metaData"]["status"] is False
    assert case_repo.cases == {}


def test_blank_idempotency_key_returns_400(client, case_repo):
    response = client.post(CASES_URL, json=_body(), headers=_headers(key="   "))

    assert response.status_code == 400


def test_field_id_and_new_field_together_return_400(client, case_repo):
    body = _body(newField={"name": "Sawah Baru", "areaKecamatan": "Ciparay"})

    response = client.post(CASES_URL, json=body, headers=_headers())

    assert response.status_code == 400
    assert case_repo.cases == {}


def test_coords_with_area_only_returns_400(client, case_repo):
    body = _body(coords={"lat": -6.2, "lng": 107.1})

    response = client.post(CASES_URL, json=body, headers=_headers())

    assert response.status_code == 400


def test_coords_with_exact_gps_is_allowed(client, case_repo):
    body = _body(locationMode="EXACT_GPS", coords={"lat": -6.2, "lng": 107.1})

    response = client.post(CASES_URL, json=body, headers=_headers())

    assert response.status_code == 200
    stored = case_repo.cases[response.json()["data"]["case"]["caseId"]]
    assert stored["coords"] == {"lat": -6.2, "lng": 107.1}


def test_far_future_observed_at_returns_400(client, case_repo):
    future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

    response = client.post(
        CASES_URL, json=_body(observedAt=future), headers=_headers()
    )

    assert response.status_code == 400


def test_area_only_without_area_returns_400(client, case_repo):
    body = _body(fieldId=None)  # AREA_ONLY, no lahan, no area fields

    response = client.post(CASES_URL, json=body, headers=_headers())

    assert response.status_code == 400


def test_area_only_with_manual_area_succeeds(client, case_repo):
    body = _body(
        fieldId=None, areaKabupaten="Kab. Bandung", areaKecamatan="Ciparay"
    )

    response = client.post(CASES_URL, json=body, headers=_headers())

    assert response.status_code == 200
    assert response.json()["data"]["case"]["areaKecamatan"] == "Ciparay"


def test_exact_gps_without_field_or_area_returns_400(client, case_repo):
    body = _body(fieldId=None, locationMode="EXACT_GPS")

    response = client.post(CASES_URL, json=body, headers=_headers())

    assert response.status_code == 400


def test_unparseable_observed_at_returns_400(client, case_repo):
    response = client.post(
        CASES_URL, json=_body(observedAt="besok pagi"), headers=_headers()
    )

    assert response.status_code == 400


def test_invalid_growth_stage_returns_400(client, case_repo):
    response = client.post(
        CASES_URL, json=_body(growthStage="MATANG"), headers=_headers()
    )

    assert response.status_code == 400


def test_notes_over_500_chars_returns_400(client, case_repo):
    response = client.post(
        CASES_URL, json=_body(notes="x" * 501), headers=_headers()
    )

    assert response.status_code == 400


def test_foreign_field_id_returns_400(client, case_repo):
    from conftest import BUDI_FIELD_ID

    response = client.post(
        CASES_URL, json=_body(fieldId=BUDI_FIELD_ID), headers=_headers()
    )

    assert response.status_code == 400


def test_coords_out_of_range_returns_400(client, case_repo):
    body = _body(locationMode="EXACT_GPS", coords={"lat": 9e99, "lng": 200.5})

    response = client.post(CASES_URL, json=body, headers=_headers())

    assert response.status_code == 400
    assert response.json()["metaData"]["message"] == "Koordinat di luar rentang yang valid."
    assert case_repo.cases == {}


def test_coords_within_range_are_accepted(client, case_repo):
    body = _body(locationMode="EXACT_GPS", coords={"lat": -6.2, "lng": 107.1})

    response = client.post(CASES_URL, json=body, headers=_headers())

    assert response.status_code == 200
    stored = case_repo.cases[response.json()["data"]["case"]["caseId"]]
    assert stored["coords"] == {"lat": -6.2, "lng": 107.1}


# ---- role restriction (contract: petani, or penyuluh assisted) -------------------


def test_penyuluh_without_assisted_session_cannot_create(client, case_repo):
    """Otherwise an unattended submit silently makes the penyuluh the owner."""
    body = _body(fieldId=None, locationMode="NONE")

    response = client.post(CASES_URL, json=body, headers=_headers(PENYULUH_USER_ID))

    assert response.status_code == 403
    assert case_repo.cases == {}


def test_admin_cannot_create_cases(client, case_repo):
    from conftest import ADMIN_USER_ID

    body = _body(fieldId=None, locationMode="NONE")

    response = client.post(CASES_URL, json=body, headers=_headers(ADMIN_USER_ID))

    assert response.status_code == 403
    assert case_repo.cases == {}


# ---- assisted mode --------------------------------------------------------------


def test_assisted_create_sets_owner_subject_and_creator_penyuluh(client, case_repo):
    body = _body(
        fieldId=None, locationMode="NONE", assistedSessionId=OPEN_SESSION_ID
    )

    response = client.post(
        CASES_URL, json=body, headers=_headers(PENYULUH_USER_ID)
    )

    assert response.status_code == 200
    case = response.json()["data"]["case"]
    assert case["ownerProfileId"] == SUBJECT_PROFILE_ID
    assert case["createdByProfileId"] == PENYULUH_PROFILE_ID
    assert case["assistedSessionId"] == OPEN_SESSION_ID
    stored = case_repo.cases[case["caseId"]]
    assert stored["owner_profile_id"] == SUBJECT_PROFILE_ID
    assert stored["created_by_profile_id"] == PENYULUH_PROFILE_ID
    assert stored["assisted_session_id"] == OPEN_SESSION_ID


def test_assisted_create_with_foreign_session_returns_403(client, case_repo):
    body = _body(
        fieldId=None, locationMode="NONE", assistedSessionId=FOREIGN_SESSION_ID
    )

    response = client.post(
        CASES_URL, json=body, headers=_headers(PENYULUH_USER_ID)
    )

    assert response.status_code == 403
    assert case_repo.cases == {}


def test_assisted_create_with_ended_session_returns_403(client, case_repo):
    body = _body(
        fieldId=None, locationMode="NONE", assistedSessionId=ENDED_SESSION_ID
    )

    response = client.post(
        CASES_URL, json=body, headers=_headers(PENYULUH_USER_ID)
    )

    assert response.status_code == 403
