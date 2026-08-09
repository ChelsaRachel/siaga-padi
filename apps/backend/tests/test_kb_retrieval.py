"""Sprint 04 — KB retrieval: the active index, ranking, and the safety flags.

The retrieval test is the evidence a reviewer produces BEFORE activating a
version ("Blas Daun fase anakan → rujukan apa yang terambil?"), so ranking must
be deterministic and drafts must be unreachable by construction.
"""
from conftest import (
    ADMIN_USER_ID,
    PETANI_USER_ID,
    REVIEWER_USER_ID,
    bearer_headers,
    seed_kb_chunk,
    seed_kb_source,
)

ADMIN = bearer_headers(ADMIN_USER_ID)
REVIEWER = bearer_headers(REVIEWER_USER_ID)
PETANI = bearer_headers(PETANI_USER_ID)

BLAS_QUERY = {"disease": "blas_daun", "phase": "vegetatif"}


def seed_index(kb_repo):
    """One approved Blas chunk, one flagged HDB chunk, one pending draft."""
    seed_kb_source(kb_repo, status="disetujui")
    seed_kb_chunk(
        kb_repo,
        "chk-blas",
        "RUJ-BLAS-004",
        content="Gunakan varietas tahan blas daun pada fase anakan.",
        approval_status="disetujui",
        disease_tags=["blas_daun"],
        phase_tags=["vegetatif"],
        action_type="pencegahan",
    )
    seed_kb_chunk(
        kb_repo,
        "chk-hdb",
        "RUJ-HDB-002",
        content="Bakterisida dengan dosis 2 g/l untuk hawar daun bakteri.",
        approval_status="disetujui",
        disease_tags=["hawar_daun_bakteri"],
        policy_flag="memuat_dosis",
    )
    seed_kb_chunk(
        kb_repo,
        "chk-draft",
        "RUJ-BLAS-009",
        content="Draf yang belum ditinjau tentang blas daun.",
        approval_status="menunggu",
        disease_tags=["blas_daun"],
        phase_tags=["vegetatif"],
    )
    seed_kb_chunk(
        kb_repo,
        "chk-umum",
        "RUJ-UMUM-001",
        content="Lakukan pengamatan rutin setiap minggu.",
        approval_status="disetujui",
        action_type="pemantauan",
    )


def retrieval_test(client, payload=None, headers=None):
    return client.post(
        "/kb/retrieval-test",
        json={**BLAS_QUERY, **(payload or {})},
        headers=headers or REVIEWER,
    )


# ---- the active index -------------------------------------------------------------


def test_draft_chunk_is_never_retrievable(client, kb_repo):
    # Arrange
    seed_index(kb_repo)

    # Act
    response = retrieval_test(client)

    # Assert
    ref_codes = [hit["refCode"] for hit in response.json()["data"]["hits"]]
    assert "RUJ-BLAS-009" not in ref_codes


def test_rejected_chunk_is_never_retrievable(client, kb_repo):
    # Arrange
    seed_index(kb_repo)
    client.post(
        "/kb/chunks/chk-blas/reject", json={"reason": "Keliru"}, headers=REVIEWER
    )

    # Act
    response = retrieval_test(client)

    # Assert
    ref_codes = [hit["refCode"] for hit in response.json()["data"]["hits"]]
    assert "RUJ-BLAS-004" not in ref_codes


def test_expired_approval_drops_out_of_the_index(client, kb_repo):
    # Arrange
    seed_index(kb_repo)
    kb_repo.chunks["chk-blas"]["valid_until"] = "2020-01-01T00:00:00+00:00"

    # Act
    response = retrieval_test(client)

    # Assert
    ref_codes = [hit["refCode"] for hit in response.json()["data"]["hits"]]
    assert "RUJ-BLAS-004" not in ref_codes


def test_retired_source_drops_out_of_the_index(client, kb_repo):
    # Arrange
    seed_index(kb_repo)
    client.post("/kb/sources/src-bbpadi/retire", json={}, headers=ADMIN)

    # Act
    response = retrieval_test(client)

    # Assert
    assert response.json()["data"]["hits"] == []


# ---- ranking -----------------------------------------------------------------------


def test_disease_and_phase_match_ranks_first(client, kb_repo):
    # Arrange
    seed_index(kb_repo)

    # Act
    response = retrieval_test(client)

    # Assert — the specific Blas chunk beats the general one
    hits = response.json()["data"]["hits"]
    assert hits[0]["refCode"] == "RUJ-BLAS-004"
    assert hits[0]["score"] > hits[-1]["score"]


def test_a_different_disease_is_excluded(client, kb_repo):
    # Arrange
    seed_index(kb_repo)

    # Act
    response = retrieval_test(client)

    # Assert — HDB material must not surface on a Blas query
    ref_codes = [hit["refCode"] for hit in response.json()["data"]["hits"]]
    assert "RUJ-HDB-002" not in ref_codes


def test_general_chunk_stays_available_as_fallback(client, kb_repo):
    # Arrange
    seed_index(kb_repo)

    # Act
    response = retrieval_test(client)

    # Assert
    ref_codes = [hit["refCode"] for hit in response.json()["data"]["hits"]]
    assert "RUJ-UMUM-001" in ref_codes


def test_ranking_is_deterministic_across_calls(client, kb_repo):
    # Arrange
    seed_index(kb_repo)

    # Act
    first = retrieval_test(client).json()["data"]["hits"]
    second = retrieval_test(client).json()["data"]["hits"]

    # Assert
    assert [hit["refCode"] for hit in first] == [hit["refCode"] for hit in second]


def test_action_type_filter_narrows_the_result(client, kb_repo):
    # Arrange
    seed_index(kb_repo)

    # Act
    response = retrieval_test(client, {"actionType": "pencegahan"})

    # Assert
    ref_codes = [hit["refCode"] for hit in response.json()["data"]["hits"]]
    assert ref_codes == ["RUJ-BLAS-004"]


def test_petani_audience_never_gets_penyuluh_only_material(client, kb_repo):
    # Arrange
    seed_index(kb_repo)

    # Act — everything seeded defaults to the penyuluh audience
    response = retrieval_test(client, {"audience": "petani"})

    # Assert
    assert response.json()["data"]["hits"] == []


# ---- policy flags ---------------------------------------------------------------------


def test_policy_flag_travels_with_the_hit(client, kb_repo):
    # Arrange
    seed_index(kb_repo)

    # Act
    response = client.post(
        "/kb/retrieval-test",
        json={"disease": "hawar_daun_bakteri"},
        headers=REVIEWER,
    )

    # Assert — linkable as reading, but never narratable
    hit = response.json()["data"]["hits"][0]
    assert hit["refCode"] == "RUJ-HDB-002"
    assert hit["policyFlag"] == "memuat_dosis"
    assert hit["narratable"] is False


def test_unflagged_chunk_is_narratable(client, kb_repo):
    # Arrange
    seed_index(kb_repo)

    # Act
    response = retrieval_test(client)

    # Assert
    assert response.json()["data"]["hits"][0]["narratable"] is True


# ---- logging & access -------------------------------------------------------------------


def test_retrieval_log_keeps_ref_codes_only(client, kb_repo):
    # Arrange
    seed_index(kb_repo)

    # Act
    retrieval_test(client)

    # Assert
    log = kb_repo.retrieval_logs[-1]
    assert log["channel"] == "uji"
    assert log["ref_codes"] == ["RUJ-BLAS-004", "RUJ-UMUM-001"]
    assert "content" not in log


def test_runtime_channel_is_recorded_separately(client, kb_repo, monkeypatch):
    # Arrange
    seed_index(kb_repo)
    monkeypatch.setenv("INTERNAL_API_TOKEN", "token-uji-internal")

    # Act — Sprint 05's engine calls with no user identity
    response = client.post(
        "/kb/retrieval",
        json=BLAS_QUERY,
        headers={"X-Internal-Token": "token-uji-internal"},
    )

    # Assert
    assert response.status_code == 200
    assert kb_repo.retrieval_logs[-1]["channel"] == "runtime"
    assert kb_repo.retrieval_logs[-1]["actor_profile_id"] is None


def test_wrong_internal_token_is_rejected(client, kb_repo, monkeypatch):
    # Arrange
    seed_index(kb_repo)
    monkeypatch.setenv("INTERNAL_API_TOKEN", "token-uji-internal")

    # Act
    response = client.post(
        "/kb/retrieval", json=BLAS_QUERY, headers={"X-Internal-Token": "salah"}
    )

    # Assert
    assert response.status_code in (401, 403)


def test_petani_cannot_run_the_retrieval_test(client, kb_repo):
    # Arrange
    seed_index(kb_repo)

    # Act
    response = retrieval_test(client, headers=PETANI)

    # Assert
    assert response.status_code == 403
