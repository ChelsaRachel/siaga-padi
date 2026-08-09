"""Sprint 05 — CV inference: calibration, banding, abstain, conflict, penalty.

The rules here are the ones that let the system say "I don't know". They are
tested at BOTH levels on purpose: the pure functions (so a threshold change is
a visible diff) and through the endpoint (so the role split and the frozen row
are exercised end to end).
"""
from conftest import (
    ABSTAIN_FINGERPRINT,
    BERCAK_FINGERPRINT,
    BLAS_FINGERPRINT,
    PENYULUH_USER_ID,
    PETANI_PROFILE_ID,
    PETANI_USER_ID,
    bearer_headers,
    seed_case,
    seed_photo,
)
from models.siaga_triage import (
    ABSTAIN_KONFLIK,
    ABSTAIN_TIDAK_YAKIN,
    ABSTAIN_YAKIN,
    BAND_RENDAH,
    BAND_SEDANG,
    BAND_TINGGI,
    apply_quality_penalty,
    band_for_score,
    calibrate_score,
    resolve_abstain_status,
    top_candidates,
)
from service.cv_inference import analyse_photos

PETANI = bearer_headers(PETANI_USER_ID)
PENYULUH = bearer_headers(PENYULUH_USER_ID)

CASE_ID = "case-triage-1"


def seed_ready_case(repo, case_id=CASE_ID, fingerprints=None, quality="layak"):
    """A CAPTURED case with two accepted photos — the pipeline's entry state."""
    case = seed_case(
        repo, case_id, PETANI_PROFILE_ID, status="CAPTURED", area_kecamatan="Ciparay"
    )
    prints = fingerprints or [BLAS_FINGERPRINT, BLAS_FINGERPRINT]
    for index, fingerprint in enumerate(prints, start=1):
        seed_photo(
            repo, f"photo-{case_id}-{index}", case_id, index, fingerprint, quality
        )
    return case


# ---- pure rules ----------------------------------------------------------------


def test_calibration_never_reorders_candidates():
    # Arrange
    raw = {"blas_daun": 0.92, "bercak_coklat": 0.05}

    # Act
    calibrated = {label: calibrate_score(score) for label, score in raw.items()}

    # Assert
    assert calibrated["blas_daun"] > calibrated["bercak_coklat"]
    assert calibrated["blas_daun"] < raw["blas_daun"], "over-confidence must soften"


def test_band_mapping_covers_the_three_bands():
    assert band_for_score(0.90) == BAND_TINGGI
    assert band_for_score(0.75) == BAND_TINGGI
    assert band_for_score(0.60) == BAND_SEDANG
    assert band_for_score(0.50) == BAND_SEDANG
    assert band_for_score(0.30) == BAND_RENDAH


def test_borderline_photo_costs_confidence():
    # Arrange
    score = 0.80

    # Act
    penalised = apply_quality_penalty(score, has_borderline_photo=True)

    # Assert
    assert penalised < score
    assert apply_quality_penalty(score, has_borderline_photo=False) == score


def test_low_top_score_abstains_instead_of_forcing_a_label():
    # Arrange
    candidates = top_candidates({"blas_daun": 0.22, "bercak_coklat": 0.21})

    # Act
    status = resolve_abstain_status(candidates, [("blas_daun", 0.22)])

    # Assert
    assert status == ABSTAIN_TIDAK_YAKIN


def test_two_confident_photos_disagreeing_is_a_conflict():
    # Arrange
    candidates = top_candidates({"blas_daun": 0.55, "bercak_coklat": 0.45})

    # Act
    status = resolve_abstain_status(
        candidates, [("blas_daun", 0.88), ("bercak_coklat", 0.84)]
    )

    # Assert — conflict outranks the otherwise-confident aggregate
    assert status == ABSTAIN_KONFLIK


def test_one_weak_photo_beside_a_strong_one_is_not_a_conflict():
    # Arrange
    candidates = top_candidates({"blas_daun": 0.80, "bercak_coklat": 0.12})

    # Act
    status = resolve_abstain_status(
        candidates, [("blas_daun", 0.88), ("bercak_coklat", 0.20)]
    )

    # Assert
    assert status == ABSTAIN_YAKIN


def test_fixture_photos_are_deterministic():
    # Arrange
    photos = [
        {
            "id": "p1",
            "slot_no": 1,
            "fingerprint": BLAS_FINGERPRINT,
            "quality_status": "layak",
        }
    ]

    # Act
    first = analyse_photos(photos)
    second = analyse_photos(photos)

    # Assert
    assert first.candidates == second.candidates
    assert first.candidates[0]["label"] == "blas_daun"


def test_analysis_caps_candidates_at_three():
    # Arrange
    photos = [
        {
            "id": "p1",
            "slot_no": 1,
            "fingerprint": ABSTAIN_FINGERPRINT,
            "quality_status": "layak",
        }
    ]

    # Act
    outcome = analyse_photos(photos)

    # Assert
    assert len(outcome.candidates) <= 3
    assert outcome.abstain_status == ABSTAIN_TIDAK_YAKIN


# ---- endpoint ------------------------------------------------------------------


def test_run_analysis_stores_a_result_and_moves_the_case(client, triage_repo):
    # Arrange
    seed_ready_case(triage_repo)

    # Act
    response = client.post(f"/cases/{CASE_ID}/analysis", json={}, headers=PETANI)

    # Assert
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["abstainStatus"] == ABSTAIN_YAKIN
    assert data["confidenceBand"] == BAND_TINGGI
    assert triage_repo.cases[CASE_ID]["status"] == "NEEDS_CONTEXT"
    assert len(triage_repo.analyses) == 1


def test_petani_never_receives_scores_or_evidence(client, triage_repo):
    # Arrange
    seed_ready_case(triage_repo)

    # Act
    data = client.post(f"/cases/{CASE_ID}/analysis", json={}, headers=PETANI).json()[
        "data"
    ]

    # Assert
    assert data["indication"] == "Blas Daun"
    assert data["candidates"][0]["calibratedScore"] is None
    assert data["evidenceMaps"] is None
    assert data["modelVersion"] is None
    assert data["thresholdVersion"] is None


def test_penyuluh_receives_scores_and_model_version(client, triage_repo):
    # Arrange
    seed_ready_case(triage_repo)
    client.post(f"/cases/{CASE_ID}/analysis", json={}, headers=PETANI)

    # Act — the binaan penyuluh reads the same case
    data = client.get(f"/cases/{CASE_ID}/analysis", headers=PENYULUH).json()["data"]

    # Assert
    assert data["candidates"][0]["calibratedScore"] > 0
    assert data["modelVersion"] == "cv-fixture-v0"
    assert data["thresholdVersion"] == "ambang-2026-07-v1"
    assert data["evidenceMaps"] is not None


def test_conflicting_photos_flag_review_without_a_forced_label(client, triage_repo):
    # Arrange
    seed_ready_case(triage_repo, fingerprints=[BLAS_FINGERPRINT, BERCAK_FINGERPRINT])

    # Act
    data = client.post(f"/cases/{CASE_ID}/analysis", json={}, headers=PETANI).json()[
        "data"
    ]

    # Assert
    assert data["abstainStatus"] == ABSTAIN_KONFLIK
    assert data["indication"] is None, "a conflicted case gets no headline label"
    assert data["requiresReview"] is True
    assert data["abstainMessage"]
    assert triage_repo.cases[CASE_ID]["needs_human_review"] is True


def test_abstain_marks_review_and_still_advances_to_questions(client, triage_repo):
    # Arrange
    seed_ready_case(
        triage_repo, fingerprints=[ABSTAIN_FINGERPRINT, ABSTAIN_FINGERPRINT]
    )

    # Act
    data = client.post(f"/cases/{CASE_ID}/analysis", json={}, headers=PETANI).json()[
        "data"
    ]

    # Assert
    assert data["abstainStatus"] == ABSTAIN_TIDAK_YAKIN
    assert triage_repo.cases[CASE_ID]["needs_human_review"] is True
    # Questionnaire runs anyway — the reviewer needs that context most here.
    assert triage_repo.cases[CASE_ID]["status"] == "NEEDS_CONTEXT"


def test_borderline_photo_sets_the_penalty_flag(client, triage_repo):
    # Arrange
    seed_ready_case(triage_repo, quality="ambang")
    client.post(f"/cases/{CASE_ID}/analysis", json={}, headers=PETANI)

    # Act
    data = client.get(f"/cases/{CASE_ID}/analysis", headers=PENYULUH).json()["data"]

    # Assert
    assert data["qualityPenalty"] is True


def test_running_analysis_twice_returns_the_same_frozen_result(client, triage_repo):
    # Arrange
    seed_ready_case(triage_repo)

    # Act
    first = client.post(f"/cases/{CASE_ID}/analysis", json={}, headers=PETANI)
    second = client.post(f"/cases/{CASE_ID}/analysis", json={}, headers=PETANI)

    # Assert
    assert first.json()["data"]["analysisId"] == second.json()["data"]["analysisId"]
    assert len(triage_repo.analyses) == 1


def test_case_without_enough_accepted_photos_is_refused(client, triage_repo):
    # Arrange — one accepted photo only
    seed_case(
        triage_repo,
        CASE_ID,
        PETANI_PROFILE_ID,
        status="CAPTURED",
        area_kecamatan="Ciparay",
    )
    seed_photo(triage_repo, "photo-solo", CASE_ID, 1, BLAS_FINGERPRINT)

    # Act
    response = client.post(f"/cases/{CASE_ID}/analysis", json={}, headers=PETANI)

    # Assert
    assert response.status_code == 400
    assert not triage_repo.analyses


def test_analysis_is_404_before_it_has_run(client, triage_repo):
    # Arrange
    seed_ready_case(triage_repo)

    # Act
    response = client.get(f"/cases/{CASE_ID}/analysis", headers=PETANI)

    # Assert
    assert response.status_code == 404
