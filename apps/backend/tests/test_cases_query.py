"""POST /cases/get-all scoping + filters; GET detail/timeline no-enumeration."""
from datetime import datetime, timedelta, timezone

from conftest import (
    ADMIN_USER_ID,
    ANI_FIELD_ID,
    OTHER_PETANI_PROFILE_ID,
    OTHER_PETANI_USER_ID,
    PENYULUH_USER_ID,
    PETANI_PROFILE_ID,
    PETANI_USER_ID,
    bearer_headers,
    seed_case,
)

GET_ALL_URL = "/cases/get-all"

DIPROSES_STATUSES = {
    "QUEUED",
    "PROCESSING_CV",
    "NEEDS_CONTEXT",
    "GENERATING_RECOMMENDATION",
    "FAILED",
}


def _iso(days_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


def _get_all(client, user_id, body=None):
    return client.post(
        GET_ALL_URL, json=body or {}, headers=bearer_headers(user_id)
    )


# ---- scoping ---------------------------------------------------------------------


def test_petani_sees_only_own_cases(client, case_repo):
    seed_case(case_repo, "case-ani-1", PETANI_PROFILE_ID, area_kecamatan="Ciparay")
    seed_case(
        case_repo, "case-budi-1", OTHER_PETANI_PROFILE_ID, area_kecamatan="Soreang"
    )

    response = _get_all(client, PETANI_USER_ID)

    assert response.status_code == 200
    ids = [case["caseId"] for case in response.json()["data"]]
    assert ids == ["case-ani-1"]


def test_penyuluh_sees_binaan_cases_via_case_area_and_field_area(client, case_repo):
    # In scope through the case's own area (owner is NOT in binaan).
    seed_case(
        case_repo, "case-area", OTHER_PETANI_PROFILE_ID, area_kecamatan="Ciparay"
    )
    # In scope only through the lahan's area (case itself carries none).
    seed_case(case_repo, "case-field", PETANI_PROFILE_ID, field_id=ANI_FIELD_ID)
    # Out of scope entirely.
    seed_case(
        case_repo, "case-out", OTHER_PETANI_PROFILE_ID, area_kecamatan="Soreang"
    )

    response = _get_all(client, PENYULUH_USER_ID)

    assert response.status_code == 200
    ids = {case["caseId"] for case in response.json()["data"]}
    assert ids == {"case-area", "case-field"}


def test_penyuluh_without_assignment_sees_nothing(client, case_repo):
    case_repo.assignments[PENYULUH_USER_ID] = []
    seed_case(case_repo, "case-ani-1", PETANI_PROFILE_ID, area_kecamatan="Ciparay")

    response = _get_all(client, PENYULUH_USER_ID)

    assert response.status_code == 200
    assert response.json()["data"] == []


def test_admin_sees_all_cases(client, case_repo):
    seed_case(case_repo, "case-ani-1", PETANI_PROFILE_ID, area_kecamatan="Ciparay")
    seed_case(
        case_repo, "case-budi-1", OTHER_PETANI_PROFILE_ID, area_kecamatan="Soreang"
    )

    response = _get_all(client, ADMIN_USER_ID)

    assert len(response.json()["data"]) == 2


# ---- filters --------------------------------------------------------------------


def test_display_stage_diproses_expands_to_status_set(client, case_repo):
    all_statuses = [*DIPROSES_STATUSES, "DRAFT", "CLOSED", "NEEDS_REVIEW"]
    for index, status in enumerate(all_statuses):
        seed_case(
            case_repo,
            f"case-{index}",
            PETANI_PROFILE_ID,
            status=status,
            area_kecamatan="Ciparay",
        )

    response = _get_all(
        client, PETANI_USER_ID, {"filters": {"displayStage": "diproses"}}
    )

    statuses = {case["status"] for case in response.json()["data"]}
    assert statuses == DIPROSES_STATUSES
    assert all(
        case["displayStage"] == "diproses" for case in response.json()["data"]
    )


def test_field_and_date_filters(client, case_repo):
    seed_case(
        case_repo, "case-old", PETANI_PROFILE_ID,
        field_id=ANI_FIELD_ID, created_at=_iso(days_ago=20),
    )
    seed_case(
        case_repo, "case-recent", PETANI_PROFILE_ID,
        field_id=ANI_FIELD_ID, created_at=_iso(days_ago=2),
    )
    seed_case(
        case_repo, "case-other-field", PETANI_PROFILE_ID,
        area_kecamatan="Ciparay", created_at=_iso(days_ago=2),
    )
    date_from = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()
    date_to = datetime.now(timezone.utc).date().isoformat()

    response = _get_all(
        client,
        PETANI_USER_ID,
        {
            "filters": {
                "fieldId": ANI_FIELD_ID,
                "dateFrom": date_from,
                "dateTo": date_to,
            }
        },
    )

    ids = [case["caseId"] for case in response.json()["data"]]
    assert ids == ["case-recent"]


def test_invalid_display_stage_filter_returns_400(client, case_repo):
    response = _get_all(
        client, PETANI_USER_ID, {"filters": {"displayStage": "menunggu"}}
    )

    assert response.status_code == 400


def test_pagination_metadata_shape(client, case_repo):
    for index in range(3):
        seed_case(
            case_repo, f"case-{index}", PETANI_PROFILE_ID,
            area_kecamatan="Ciparay", created_at=_iso(days_ago=index),
        )

    response = _get_all(client, PETANI_USER_ID, {"page": 1, "limit": 2})

    body = response.json()
    assert len(body["data"]) == 2
    assert body["metaData"]["pagination"] == {
        "size": 2,
        "totalElements": 3,
        "totalPages": 2,
        "scrollId": "",
    }
    # Newest first.
    assert body["data"][0]["caseId"] == "case-0"


# ---- detail ---------------------------------------------------------------------


def test_owner_can_fetch_detail(client, case_repo):
    seed_case(
        case_repo, "case-ani-1", PETANI_PROFILE_ID,
        field_id=ANI_FIELD_ID, area_kecamatan="Ciparay",
    )

    response = client.get("/cases/case-ani-1", headers=bearer_headers(PETANI_USER_ID))

    assert response.status_code == 200
    case = response.json()["data"]
    assert case["caseId"] == "case-ani-1"
    assert case["ownerDisplayName"] == "Ani Petani"
    assert case["fieldName"] == "Sawah Utara"


def _normalized_404_body(response) -> dict:
    body = response.json()
    meta = {k: v for k, v in body["metaData"].items() if k != "executionTime"}
    return {**body, "metaData": meta}


def test_foreign_case_404_is_byte_identical_to_missing_case(client, case_repo):
    seed_case(case_repo, "case-ani-1", PETANI_PROFILE_ID, area_kecamatan="Ciparay")
    headers = bearer_headers(OTHER_PETANI_USER_ID)

    foreign = client.get("/cases/case-ani-1", headers=headers)
    missing = client.get("/cases/does-not-exist", headers=headers)

    assert foreign.status_code == 404
    assert missing.status_code == 404
    assert _normalized_404_body(foreign) == _normalized_404_body(missing)
    assert foreign.json()["metaData"]["message"] == "Kasus tidak ditemukan."
    assert foreign.json()["data"] == missing.json()["data"]


def test_timeline_404_follows_same_rule(client, case_repo):
    seed_case(case_repo, "case-ani-1", PETANI_PROFILE_ID, area_kecamatan="Ciparay")
    headers = bearer_headers(OTHER_PETANI_USER_ID)

    foreign = client.get("/cases/case-ani-1/timeline", headers=headers)
    missing = client.get("/cases/nope/timeline", headers=headers)

    assert foreign.status_code == 404 and missing.status_code == 404
    assert _normalized_404_body(foreign) == _normalized_404_body(missing)


# ---- timeline --------------------------------------------------------------------


def test_timeline_ascending_with_creation_event_first(client, case_repo):
    seed_case(case_repo, "case-ani-1", PETANI_PROFILE_ID, area_kecamatan="Ciparay")
    early = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    later = datetime.now(timezone.utc).isoformat()
    case_repo.insert_event(
        {
            "id": "event-2",
            "case_id": "case-ani-1",
            "from_status": "DRAFT",
            "to_status": "CAPTURED",
            "actor_profile_id": PETANI_PROFILE_ID,
            "note": None,
            "created_at": later,
        }
    )
    case_repo.insert_event(
        {
            "id": "event-1",
            "case_id": "case-ani-1",
            "from_status": None,
            "to_status": "DRAFT",
            "actor_profile_id": PETANI_PROFILE_ID,
            "note": "Kasus dibuat",
            "created_at": early,
        }
    )

    response = client.get(
        "/cases/case-ani-1/timeline", headers=bearer_headers(PETANI_USER_ID)
    )

    assert response.status_code == 200
    events = response.json()["data"]
    assert [event["eventId"] for event in events] == ["event-1", "event-2"]
    assert events[0]["fromStatus"] is None
    assert events[0]["toStatus"] == "DRAFT"
    assert events[0]["toDisplayStage"] == "draf"
    assert events[0]["actorDisplayName"] == "Ani Petani"
    assert events[1]["toStatus"] == "CAPTURED"
    created_ats = [event["createdAt"] for event in events]
    assert created_ats == sorted(created_ats)
