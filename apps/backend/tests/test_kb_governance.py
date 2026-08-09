"""Sprint 04 — KB governance: approval gates, policy flags, versions, retire.

Covers the four acceptance rules of the sprint:
1. Only approved + non-retired chunks reach the active index.
2. A ref code is stable across versions; a change makes a NEW version row.
3. Dosage/brand content cannot be approved without a policy flag.
4. Retirement removes a source from retrieval WITHOUT breaking old citations.
"""
from conftest import (
    ADMIN_USER_ID,
    PETANI_USER_ID,
    REVIEWER_USER_ID,
    bearer_headers,
    seed_kb_chunk,
    seed_kb_source,
)

DOSAGE_CONTENT = (
    "Semprot dengan fungisida trisiklazol dosis 2 ml/l air saat gejala awal."
)
SAFE_CONTENT = "Gunakan varietas tahan blas daun dan atur jarak tanam."

ADMIN = bearer_headers(ADMIN_USER_ID)
REVIEWER = bearer_headers(REVIEWER_USER_ID)
PETANI = bearer_headers(PETANI_USER_ID)


def seed_pending(kb_repo, **kwargs):
    seed_kb_source(kb_repo)
    return seed_kb_chunk(
        kb_repo,
        kwargs.pop("chunk_id", "chk-1"),
        kwargs.pop("ref_code", "RUJ-BLAS-004"),
        **kwargs,
    )


# ---- catalog ---------------------------------------------------------------------


def test_catalog_lists_sources_with_chunk_tallies(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)

    # Act
    response = client.post(
        "/kb/sources/get-all", json={"page": 1, "limit": 10}, headers=ADMIN
    )

    # Assert
    row = response.json()["data"][0]
    assert row["chunkTotal"] == 1
    assert row["chunkPending"] == 1
    assert row["licenseNote"] == "Dokumen publik pemerintah"


def test_catalog_filters_by_status(client, kb_repo):
    # Arrange
    seed_kb_source(kb_repo, source_id="src-a", status="draf")
    seed_kb_source(
        kb_repo, source_id="src-b", title="Panduan POPT", status="disetujui"
    )

    # Act
    response = client.post(
        "/kb/sources/get-all",
        json={"page": 1, "limit": 10, "filters": {"status": "disetujui"}},
        headers=ADMIN,
    )

    # Assert
    rows = response.json()["data"]
    assert [row["sourceId"] for row in rows] == ["src-b"]


def test_petani_cannot_browse_the_catalog(client, kb_repo):
    response = client.post(
        "/kb/sources/get-all", json={"page": 1, "limit": 10}, headers=PETANI
    )
    assert response.status_code == 403


# ---- approval gate ----------------------------------------------------------------


def test_approving_dosage_chunk_without_policy_flag_is_rejected(client, kb_repo):
    # Arrange — the flag was cleared, but the CONTENT still carries a dose
    seed_pending(kb_repo, content=DOSAGE_CONTENT, policy_flag=None)

    # Act
    response = client.post("/kb/chunks/chk-1/approve", json={}, headers=REVIEWER)

    # Assert
    assert response.status_code == 400
    assert "penanda kebijakan" in response.json()["metaData"]["message"].lower()
    assert kb_repo.chunks["chk-1"]["approval_status"] == "menunggu"


def test_approving_dosage_chunk_with_policy_flag_succeeds(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=DOSAGE_CONTENT, policy_flag=None)

    # Act
    response = client.post(
        "/kb/chunks/chk-1/approve",
        json={"policyFlag": "memuat_dosis"},
        headers=REVIEWER,
    )

    # Assert
    data = response.json()["data"]
    assert data["approvalStatus"] == "disetujui"
    assert data["policyFlag"] == "memuat_dosis"
    assert data["risk"] == "dibatasi"


def test_approving_safe_chunk_needs_no_flag(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)

    # Act
    response = client.post(
        "/kb/chunks/chk-1/approve",
        json={"diseaseTags": ["blas_daun"], "phaseTags": ["vegetatif"]},
        headers=REVIEWER,
    )

    # Assert
    data = response.json()["data"]
    assert data["approvalStatus"] == "disetujui"
    assert data["policyFlag"] is None
    assert data["diseaseTags"] == ["blas_daun"]


def test_approval_promotes_the_source_out_of_draft(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)

    # Act
    client.post("/kb/chunks/chk-1/approve", json={}, headers=REVIEWER)

    # Assert
    assert kb_repo.sources["src-bbpadi"]["status"] == "disetujui"
    assert kb_repo.sources["src-bbpadi"]["last_reviewed_at"] is not None


def test_unknown_disease_tag_is_rejected(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)

    # Act
    response = client.post(
        "/kb/chunks/chk-1/approve",
        json={"diseaseTags": ["penyakit_karangan"]},
        headers=REVIEWER,
    )

    # Assert
    assert response.status_code == 400


def test_admin_cannot_approve_a_chunk(client, kb_repo):
    # Arrange — content decisions belong to the domain reviewer
    seed_pending(kb_repo, content=SAFE_CONTENT)

    # Act
    response = client.post("/kb/chunks/chk-1/approve", json={}, headers=ADMIN)

    # Assert
    assert response.status_code == 403


# ---- rejection --------------------------------------------------------------------


def test_reject_without_reason_is_refused(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)

    # Act
    response = client.post(
        "/kb/chunks/chk-1/reject", json={"reason": "  "}, headers=REVIEWER
    )

    # Assert
    assert response.status_code == 400
    assert kb_repo.chunks["chk-1"]["approval_status"] == "menunggu"


def test_rejected_chunk_records_the_reason_and_stays_out_of_the_index(
    client, kb_repo
):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)

    # Act
    response = client.post(
        "/kb/chunks/chk-1/reject",
        json={"reason": "Memuat merek dagang"},
        headers=REVIEWER,
    )

    # Assert
    assert response.json()["data"]["rejectReason"] == "Memuat merek dagang"
    assert kb_repo.list_active_chunks() == []


# ---- versioning --------------------------------------------------------------------


def test_revision_creates_a_new_version_under_the_same_ref_code(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)
    client.post("/kb/chunks/chk-1/approve", json={}, headers=REVIEWER)

    # Act
    response = client.post(
        "/kb/chunks/chk-1/revise",
        json={"content": "Gunakan varietas tahan blas daun edisi 2025."},
        headers=ADMIN,
    )

    # Assert
    data = response.json()["data"]
    assert data["refCode"] == "RUJ-BLAS-004"
    assert data["version"] == 2
    assert data["approvalStatus"] == "menunggu"
    assert kb_repo.chunks["chk-1"]["is_current"] is False
    assert kb_repo.chunks["chk-1"]["content"] == SAFE_CONTENT


def test_revision_drops_the_old_version_out_of_the_active_index(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)
    client.post("/kb/chunks/chk-1/approve", json={}, headers=REVIEWER)
    assert len(kb_repo.list_active_chunks()) == 1

    # Act
    client.post(
        "/kb/chunks/chk-1/revise",
        json={"content": "Teks baru edisi 2025."},
        headers=ADMIN,
    )

    # Assert — the new version is pending, so nothing is active right now
    assert kb_repo.list_active_chunks() == []


def test_superseded_version_cannot_be_decided(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)
    client.post(
        "/kb/chunks/chk-1/revise",
        json={"content": "Teks baru edisi 2025."},
        headers=ADMIN,
    )

    # Act
    response = client.post("/kb/chunks/chk-1/approve", json={}, headers=REVIEWER)

    # Assert
    assert response.status_code == 400


def test_diff_reports_changed_fields_and_content_lines(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)
    client.post(
        "/kb/chunks/chk-1/revise",
        json={"content": "Teks baru edisi 2025."},
        headers=ADMIN,
    )

    # Act
    response = client.get("/kb/chunks/ref/RUJ-BLAS-004/diff", headers=REVIEWER)

    # Assert
    data = response.json()["data"]
    assert data["base"]["version"] == 1
    assert data["compare"]["version"] == 2
    assert "content" in data["changedFields"]
    assert {entry["op"] for entry in data["contentDiff"]} == {"-", "+"}


# ---- read-only preview by ref code -------------------------------------------------


def test_ref_preview_returns_the_current_version_by_default(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)
    client.post(
        "/kb/chunks/chk-1/revise",
        json={"content": "Teks baru edisi 2025."},
        headers=ADMIN,
    )

    # Act
    response = client.get("/kb/chunks/ref/RUJ-BLAS-004", headers=PETANI)

    # Assert
    data = response.json()["data"]
    assert data["version"] == 2
    assert data["isCurrent"] is True


def test_ref_preview_resolves_a_historical_version(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)
    client.post(
        "/kb/chunks/chk-1/revise",
        json={"content": "Teks baru edisi 2025."},
        headers=ADMIN,
    )

    # Act — an old case card cites version 1
    response = client.get("/kb/chunks/ref/RUJ-BLAS-004?version=1", headers=PETANI)

    # Assert — isCurrent drives the "versi lama" label in the UI
    data = response.json()["data"]
    assert data["version"] == 1
    assert data["isCurrent"] is False
    assert data["content"] == SAFE_CONTENT


def test_unknown_ref_code_is_not_found(client, kb_repo):
    response = client.get("/kb/chunks/ref/RUJ-TIDAK-ADA", headers=PETANI)
    assert response.status_code == 404


# ---- retirement ---------------------------------------------------------------------


def test_retiring_a_source_empties_the_index_but_keeps_history(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)
    client.post("/kb/chunks/chk-1/approve", json={}, headers=REVIEWER)

    # Act
    response = client.post(
        "/kb/sources/src-bbpadi/retire",
        json={"reason": "Edisi 2024 ditarik penerbit"},
        headers=ADMIN,
    )

    # Assert
    assert response.json()["data"]["status"] == "dipensiunkan"
    assert kb_repo.list_active_chunks() == []
    # …while the citation still resolves for an old case
    preview = client.get("/kb/chunks/ref/RUJ-BLAS-004", headers=PETANI)
    assert preview.status_code == 200


def test_retiring_twice_is_refused(client, kb_repo):
    # Arrange
    seed_kb_source(kb_repo)
    client.post("/kb/sources/src-bbpadi/retire", json={}, headers=ADMIN)

    # Act
    response = client.post("/kb/sources/src-bbpadi/retire", json={}, headers=ADMIN)

    # Assert
    assert response.status_code == 400


def test_reviewer_cannot_retire_a_source(client, kb_repo):
    seed_kb_source(kb_repo)
    response = client.post(
        "/kb/sources/src-bbpadi/retire", json={}, headers=REVIEWER
    )
    assert response.status_code == 403


# ---- audit ----------------------------------------------------------------------------


def test_every_decision_lands_in_the_audit_trail(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)
    seed_kb_chunk(kb_repo, "chk-2", "RUJ-BLAS-005", content=SAFE_CONTENT)

    # Act
    client.post("/kb/chunks/chk-1/approve", json={}, headers=REVIEWER)
    client.post(
        "/kb/chunks/chk-2/reject", json={"reason": "Duplikat"}, headers=REVIEWER
    )
    client.post("/kb/sources/src-bbpadi/retire", json={}, headers=ADMIN)

    # Assert
    actions = [event["action"] for event in kb_repo.audit]
    assert actions == ["chunk_approved", "chunk_rejected", "source_retired"]
    assert kb_repo.audit[0]["ref_code"] == "RUJ-BLAS-004"
    assert kb_repo.audit[1]["reason"] == "Duplikat"


def test_review_queue_filters_pending_chunks_of_a_source(client, kb_repo):
    # Arrange
    seed_pending(kb_repo, content=SAFE_CONTENT)
    seed_kb_chunk(
        kb_repo,
        "chk-2",
        "RUJ-BLAS-005",
        content=SAFE_CONTENT,
        approval_status="disetujui",
    )

    # Act
    response = client.post(
        "/kb/chunks/get-all",
        json={
            "page": 1,
            "limit": 10,
            "filters": {"sourceId": "src-bbpadi", "approvalStatus": "menunggu"},
        },
        headers=REVIEWER,
    )

    # Assert
    rows = response.json()["data"]
    assert [row["chunkId"] for row in rows] == ["chk-1"]
    assert response.json()["metaData"]["pagination"]["totalElements"] == 1
