"""Service/repo-level unit tests for branches the HTTP tests don't reach:
idempotent-insert race, filter edge cases, penyuluh detail visibility, the
PostgREST query shaping of the real repository, and stat aggregation.
"""
import uuid
from types import SimpleNamespace

import pytest
from conftest import (
    ADMIN_USER_ID,
    ANI_FIELD_ID,
    FakeCaseRepo,
    OTHER_PETANI_PROFILE_ID,
    PENYULUH_USER_ID,
    PETANI_PROFILE_ID,
    PETANI_USER_ID,
    bearer_headers,
    seed_case,
)

from dto.cases import CreateCaseDTO, FindCasesDTO
from exceptions.siaga_exceptions import SiagaValidationError
from service.cases import CaseRepository, CaseService
from service.farmer_profile import aggregate_field_case_stats


def _create_dto(**overrides) -> CreateCaseDTO:
    base = {
        "locationMode": "NONE",
        "growthStage": "VEGETATIVE",
        "observedAt": "2026-07-20T08:00:00+00:00",
    }
    return CreateCaseDTO(**{**base, **overrides})


# ---- idempotent insert race ---------------------------------------------------


class RacingRepo(FakeCaseRepo):
    """Simulates a concurrent writer claiming the key between check and insert."""

    def insert_case(self, row: dict) -> dict:
        competitor = {**row, "id": "case-competitor"}
        self.cases[competitor["id"]] = competitor
        raise Exception("duplicate key value violates unique constraint 23505")


class AlwaysFailingRepo(FakeCaseRepo):
    def insert_case(self, row: dict) -> dict:
        raise Exception("connection reset")


def _petani_profiles() -> list[dict]:
    return [
        {
            "id": PETANI_PROFILE_ID,
            "user_id": PETANI_USER_ID,
            "display_name": "Ani Petani",
            "role": "petani",
            "area_kabupaten": None,
            "area_kecamatan": "Ciparay",
            "account_status": "mandiri",
        }
    ]


def test_unique_violation_race_replays_competitor_row():
    repo = RacingRepo(profiles=_petani_profiles())
    service = CaseService(repo=repo)

    result = service.create_case(PETANI_USER_ID, uuid.uuid4().hex, _create_dto())

    assert result["replayed"] is True
    assert result["case"]["caseId"] == "case-competitor"
    assert repo.events == []  # the competitor wrote the creation event, not us


def test_insert_failure_without_existing_row_reraises():
    repo = AlwaysFailingRepo(profiles=_petani_profiles())
    service = CaseService(repo=repo)

    with pytest.raises(Exception, match="connection reset"):
        service.create_case(PETANI_USER_ID, uuid.uuid4().hex, _create_dto())


# ---- filter edges -----------------------------------------------------------------


def test_conflicting_display_stage_and_status_yields_empty(client, case_repo):
    seed_case(case_repo, "case-1", PETANI_PROFILE_ID, status="DRAFT")

    response = client.post(
        "/cases/get-all",
        json={"filters": {"displayStage": "diproses", "status": "DRAFT"}},
        headers=bearer_headers(PETANI_USER_ID),
    )

    assert response.status_code == 200
    assert response.json()["data"] == []


def test_matching_display_stage_and_status_intersects(client, case_repo):
    seed_case(case_repo, "case-1", PETANI_PROFILE_ID, status="QUEUED")
    seed_case(case_repo, "case-2", PETANI_PROFILE_ID, status="PROCESSING_CV")

    response = client.post(
        "/cases/get-all",
        json={"filters": {"displayStage": "diproses", "status": "QUEUED"}},
        headers=bearer_headers(PETANI_USER_ID),
    )

    ids = [case["caseId"] for case in response.json()["data"]]
    assert ids == ["case-1"]


def test_invalid_status_filter_returns_400(client, case_repo):
    response = client.post(
        "/cases/get-all",
        json={"filters": {"status": "draf"}},  # display value, not canonical
        headers=bearer_headers(PETANI_USER_ID),
    )

    assert response.status_code == 400


def test_invalid_date_filter_returns_400(client, case_repo):
    response = client.post(
        "/cases/get-all",
        json={"filters": {"dateFrom": "kemarin"}},
        headers=bearer_headers(PETANI_USER_ID),
    )

    assert response.status_code == 400


def test_service_rejects_invalid_location_mode(case_repo):
    service = CaseService(repo=case_repo)

    with pytest.raises(SiagaValidationError):
        service.create_case(
            PETANI_USER_ID, uuid.uuid4().hex, _create_dto(locationMode="GPS")
        )


def test_page_and_limit_are_clamped():
    dto = FindCasesDTO(page=-3, limit=1000)

    assert dto.page == 1
    assert dto.limit == 100


# ---- penyuluh detail visibility ---------------------------------------------------


def test_penyuluh_detail_visible_via_case_area(client, case_repo):
    seed_case(
        case_repo, "case-1", OTHER_PETANI_PROFILE_ID, area_kecamatan="Ciparay"
    )

    response = client.get("/cases/case-1", headers=bearer_headers(PENYULUH_USER_ID))

    assert response.status_code == 200


def test_penyuluh_detail_visible_via_field_area(client, case_repo):
    seed_case(case_repo, "case-1", PETANI_PROFILE_ID, field_id=ANI_FIELD_ID)

    response = client.get("/cases/case-1", headers=bearer_headers(PENYULUH_USER_ID))

    assert response.status_code == 200


def test_penyuluh_detail_hidden_when_no_area_and_no_field(client, case_repo):
    seed_case(case_repo, "case-1", OTHER_PETANI_PROFILE_ID)

    response = client.get("/cases/case-1", headers=bearer_headers(PENYULUH_USER_ID))

    assert response.status_code == 404


def test_penyuluh_detail_hidden_when_field_outside_binaan(client, case_repo):
    from conftest import BUDI_FIELD_ID

    seed_case(case_repo, "case-1", OTHER_PETANI_PROFILE_ID, field_id=BUDI_FIELD_ID)

    response = client.get("/cases/case-1", headers=bearer_headers(PENYULUH_USER_ID))

    assert response.status_code == 404


def test_admin_detail_visible_for_any_case(client, case_repo):
    seed_case(case_repo, "case-1", OTHER_PETANI_PROFILE_ID)

    response = client.get("/cases/case-1", headers=bearer_headers(ADMIN_USER_ID))

    assert response.status_code == 200


# ---- real-repo query shaping (no DB needed) ------------------------------------


class StubQuery:
    """Records the PostgREST chain calls `_apply_filters` makes."""

    def __init__(self) -> None:
        self.calls: list[tuple] = []

    def eq(self, column, value):
        self.calls.append(("eq", column, value))
        return self

    def in_(self, column, values):
        self.calls.append(("in", column, list(values)))
        return self

    def gte(self, column, value):
        self.calls.append(("gte", column, value))
        return self

    def lte(self, column, value):
        self.calls.append(("lte", column, value))
        return self


def test_repo_apply_filters_translates_to_postgrest_chain():
    query = StubQuery()
    filters = {
        "field_id": "field-1",
        "statuses": ["QUEUED", "FAILED"],
        "date_from": "2026-07-01",
        "date_to": "2026-07-26T23:59:59.999999+00:00",
    }

    CaseRepository._apply_filters(query, filters)

    assert query.calls == [
        ("eq", "field_id", "field-1"),
        ("in", "status", ["QUEUED", "FAILED"]),
        ("gte", "created_at", "2026-07-01"),
        ("lte", "created_at", "2026-07-26T23:59:59.999999+00:00"),
    ]


def test_repo_apply_filters_skips_absent_filters():
    query = StubQuery()

    CaseRepository._apply_filters(query, {})

    assert query.calls == []


def test_repo_area_scope_clause_includes_field_ids():
    stub_self = SimpleNamespace(_field_ids_in_areas=lambda areas: ["f-1", "f-2"])

    clause = CaseRepository._area_scope_clause(stub_self, ["Ciparay", "Baleendah"])

    assert clause == (
        'area_kecamatan.in.("Ciparay","Baleendah"),field_id.in.("f-1","f-2")'
    )


def test_repo_area_scope_clause_without_matching_fields():
    stub_self = SimpleNamespace(_field_ids_in_areas=lambda areas: [])

    clause = CaseRepository._area_scope_clause(stub_self, ["Ciparay"])

    assert clause == 'area_kecamatan.in.("Ciparay")'


# ---- stat aggregation ---------------------------------------------------------


def test_aggregate_field_case_stats_counts_and_last_stage():
    rows = [
        {"field_id": "f-1", "growth_stage": "SEEDLING", "created_at": "2026-01-01"},
        {"field_id": "f-1", "growth_stage": "RIPENING", "created_at": "2026-02-01"},
        {"field_id": "f-2", "growth_stage": "UNKNOWN", "created_at": "2026-03-01"},
        {"field_id": None, "growth_stage": "UNKNOWN", "created_at": "2026-03-02"},
    ]

    stats = aggregate_field_case_stats(rows)

    assert stats == {
        "f-1": {"case_count": 2, "last_growth_stage": "RIPENING"},
        "f-2": {"case_count": 1, "last_growth_stage": "UNKNOWN"},
    }
