"""Sprint 04 — KB ingest: extraction, chunking, auto-tagging, review queue.

The load-bearing assertion of this file is that ingest NEVER approves: a
freshly registered source can produce forty chunks and the active index stays
empty until a domain reviewer decides.
"""
from conftest import (
    ADMIN_USER_ID,
    PETANI_USER_ID,
    REVIEWER_USER_ID,
    bearer_headers,
    seed_kb_source,
)

from models.siaga_kb import (
    POLICY_FLAG_DOSIS,
    POLICY_FLAG_DOSIS_DAN_MEREK,
    POLICY_FLAG_MEREK,
    build_ref_code,
    detect_disease_tags,
    detect_phase_tags,
    detect_policy_flag,
)
from service.kb_ingest import (
    MIN_CHUNK_CHARS,
    TARGET_CHUNK_CHARS,
    extract_segments,
    split_into_chunks,
)

BLAS_DOCUMENT = """# Pengendalian Blas Daun

Blas daun menyerang tanaman padi pada fase anakan. Gunakan varietas tahan dan
atur jarak tanam agar kelembapan turun sehingga serangan tidak meluas.

# Penggunaan Fungisida

Aplikasikan fungisida berbahan aktif trisiklazol dengan dosis 2 ml/l air pada
gejala awal. Ulangi sesuai anjuran petugas POPT setempat bila gejala menetap.
"""


def register_source(client, content=None, headers=None):
    payload = {
        "title": "Pengendalian Penyakit Blas",
        "publisher": "BB Padi",
        "licenseNote": "Dokumen publik pemerintah",
        "editionVersion": "v2",
    }
    if content is not None:
        payload["content"] = content
    return client.post(
        "/kb/sources",
        json=payload,
        headers=headers or bearer_headers(ADMIN_USER_ID),
    )


# ---- pure helpers ---------------------------------------------------------------


def test_detects_disease_and_phase_tags_from_content():
    # Arrange
    content = "Blas daun menyerang padi pada fase anakan."

    # Act
    diseases = detect_disease_tags(content)
    phases = detect_phase_tags(content)

    # Assert
    assert diseases == ["blas_daun"]
    assert phases == ["vegetatif"]


def test_detects_dosage_content_as_policy_flag():
    assert detect_policy_flag("Semprot dengan dosis 2 ml/l air.") == POLICY_FLAG_DOSIS


def test_detects_brand_content_as_policy_flag():
    assert detect_policy_flag("Gunakan Score® sesuai label.") in (
        POLICY_FLAG_MEREK,
        POLICY_FLAG_DOSIS_DAN_MEREK,
    )


def test_plain_agronomy_text_needs_no_policy_flag():
    assert detect_policy_flag("Gunakan varietas tahan dan atur jarak tanam.") is None


def test_ref_code_uses_stable_disease_token():
    assert build_ref_code(["blas_daun"], 4) == "RUJ-BLAS-004"
    assert build_ref_code([], 1) == "RUJ-UMUM-001"


def test_markdown_headings_become_chunk_locations():
    # Act
    segments = extract_segments(BLAS_DOCUMENT.encode("utf-8"), "text/markdown")

    # Assert
    assert [location for location, _ in segments] == [
        "§ Pengendalian Blas Daun",
        "§ Penggunaan Fungisida",
    ]


def test_chunking_is_deterministic_and_bounded():
    # Arrange
    paragraph = "Kalimat panjang tentang pengendalian penyakit padi. " * 60

    # Act
    first = split_into_chunks(paragraph)
    second = split_into_chunks(paragraph)

    # Assert
    assert first == second
    assert all(len(chunk) <= TARGET_CHUNK_CHARS for chunk in first)
    assert all(len(chunk) >= MIN_CHUNK_CHARS for chunk in first)


def test_unsupported_binary_document_is_rejected(client, kb_repo):
    # Arrange
    seed_kb_source(kb_repo)

    # Act
    response = client.post(
        "/kb/sources/src-bbpadi/ingest",
        files={"file": ("gambar.png", b"\x89PNG\r\n\x1a\n\x00\xff", "image/png")},
        headers=bearer_headers(ADMIN_USER_ID),
    )

    # Assert
    assert response.status_code == 400


# ---- ingest through the API -------------------------------------------------------


def test_registering_with_text_produces_pending_chunks(client, kb_repo):
    # Act
    response = register_source(client, content=BLAS_DOCUMENT)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["ingest"]["chunkCount"] >= 2
    assert data["ingest"]["chunkCount"] == data["ingest"]["pendingCount"]
    assert all(
        chunk["approval_status"] == "menunggu" for chunk in kb_repo.chunks.values()
    )


def test_ingested_chunks_are_not_in_the_active_index(client, kb_repo):
    # Act
    register_source(client, content=BLAS_DOCUMENT)

    # Assert — nothing approved yet, so the retrieval index is empty
    assert kb_repo.list_active_chunks() == []


def test_each_chunk_gets_a_unique_stable_ref_code(client, kb_repo):
    # Act
    register_source(client, content=BLAS_DOCUMENT)

    # Assert
    ref_codes = [chunk["ref_code"] for chunk in kb_repo.chunks.values()]
    assert len(ref_codes) == len(set(ref_codes))
    assert any(code.startswith("RUJ-BLAS-") for code in ref_codes)


def test_dosage_chunk_is_flagged_at_ingest(client, kb_repo):
    # Act
    register_source(client, content=BLAS_DOCUMENT)

    # Assert
    flagged = [c for c in kb_repo.chunks.values() if c["policy_flag"]]
    assert flagged, "the fungisida chunk carries a dose and must be flagged"
    assert all(chunk["risk"] == "dibatasi" for chunk in flagged)


def test_ingest_records_an_audit_event(client, kb_repo):
    # Act
    register_source(client, content=BLAS_DOCUMENT)

    # Assert
    actions = [event["action"] for event in kb_repo.audit]
    assert "source_registered" in actions
    assert "chunks_ingested" in actions


def test_second_ingest_continues_the_ordinals(client, kb_repo):
    # Arrange
    seed_kb_source(kb_repo)
    headers = bearer_headers(ADMIN_USER_ID)

    # Act
    client.post(
        "/kb/sources/src-bbpadi/ingest",
        data={"content": BLAS_DOCUMENT},
        headers=headers,
    )
    client.post(
        "/kb/sources/src-bbpadi/ingest",
        data={"content": BLAS_DOCUMENT},
        headers=headers,
    )

    # Assert
    ordinals = sorted(chunk["ordinal"] for chunk in kb_repo.chunks.values())
    assert ordinals == list(range(len(ordinals)))


def test_ingest_without_file_or_text_is_rejected(client, kb_repo):
    # Arrange
    seed_kb_source(kb_repo)

    # Act
    response = client.post(
        "/kb/sources/src-bbpadi/ingest",
        data={"content": "   "},
        headers=bearer_headers(ADMIN_USER_ID),
    )

    # Assert
    assert response.status_code == 400


def test_ingest_into_retired_source_is_rejected(client, kb_repo):
    # Arrange
    seed_kb_source(
        kb_repo, status="dipensiunkan", retired_at="2026-08-01T00:00:00+00:00"
    )

    # Act
    response = client.post(
        "/kb/sources/src-bbpadi/ingest",
        data={"content": BLAS_DOCUMENT},
        headers=bearer_headers(ADMIN_USER_ID),
    )

    # Assert
    assert response.status_code == 400


def test_license_note_is_mandatory(client, kb_repo):
    # Act
    response = client.post(
        "/kb/sources",
        json={"title": "Panduan Tanpa Lisensi", "publisher": "BB Padi"},
        headers=bearer_headers(ADMIN_USER_ID),
    )

    # Assert
    assert response.status_code == 400
    assert "lisensi" in response.json()["metaData"]["message"].lower()


def test_petani_cannot_register_a_source(client, kb_repo):
    # Act
    response = register_source(client, headers=bearer_headers(PETANI_USER_ID))

    # Assert
    assert response.status_code == 403


def test_reviewer_cannot_register_a_source(client, kb_repo):
    # Act — the catalog is the admin's; the reviewer decides content only
    response = register_source(client, headers=bearer_headers(REVIEWER_USER_ID))

    # Assert
    assert response.status_code == 403
