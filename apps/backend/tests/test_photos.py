"""Sprint 03 — photo upload + quality gate + escalation tests.

Synthetic Pillow images drive the deterministic gate:
- noisy green   → layak (sharp, bright, leaf-covered)
- blurred green → ditolak `buram`
- dark green    → ditolak `gelap`
- flat gray     → tidak_pasti `bukan_daun`
- tiny green    → ditolak `resolusi_rendah`
"""
from io import BytesIO

import numpy as np
from PIL import Image, ImageFilter

from tests.conftest import (
    PETANI_PROFILE_ID,
    PETANI_USER_ID,
    OTHER_PETANI_USER_ID,
    PENYULUH_USER_ID,
    bearer_headers,
    seed_case,
)

CASE_ID = "case-photo-1"


def _image_bytes(image: Image.Image, exif=None) -> bytes:
    output = BytesIO()
    if exif is not None:
        image.save(output, format="JPEG", quality=90, exif=exif)
    else:
        image.save(output, format="JPEG", quality=90)
    return output.getvalue()


def _green_noise_image(size=800, seed=42, base=(30, 140, 40), amplitude=60):
    """Sharp 'leaf' image: green-dominant with high-frequency noise."""
    rng = np.random.default_rng(seed)
    noise = rng.integers(-amplitude, amplitude, (size, size), dtype=np.int16)
    rgb = np.zeros((size, size, 3), dtype=np.int16)
    rgb[:, :, 0] = base[0]
    rgb[:, :, 1] = base[1] + noise
    rgb[:, :, 2] = base[2]
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))


def sharp_leaf_bytes(seed=42) -> bytes:
    return _image_bytes(_green_noise_image(seed=seed))


def blurred_leaf_bytes(seed=43) -> bytes:
    blurred = _green_noise_image(seed=seed).filter(
        ImageFilter.GaussianBlur(radius=12)
    )
    return _image_bytes(blurred)


def dark_leaf_bytes(seed=44) -> bytes:
    dark = _green_noise_image(seed=seed, base=(8, 36, 10), amplitude=18)
    return _image_bytes(dark)


def gray_bytes() -> bytes:
    return _image_bytes(Image.new("RGB", (800, 800), (128, 128, 128)))


def tiny_leaf_bytes() -> bytes:
    return _image_bytes(_green_noise_image(size=320))


def upload(client, case_id, data, slot_no=1, user_id=PETANI_USER_ID):
    return client.post(
        f"/cases/{case_id}/photos",
        files={"file": ("foto.jpg", data, "image/jpeg")},
        data={"slotNo": str(slot_no)},
        headers=bearer_headers(user_id),
    )


# ---- quality verdicts --------------------------------------------------------


def test_sharp_photo_accepted_as_layak(client, photo_repo):
    # Arrange
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)

    # Act
    response = upload(client, CASE_ID, sharp_leaf_bytes())

    # Assert
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["photo"]["qualityStatus"] == "layak"
    assert body["photo"]["rejectReasons"] == []
    assert body["photo"]["exifStripped"] is True
    assert body["photo"]["signedUrl"].startswith("https://fake.signed/")
    assert body["acceptedCount"] == 1
    assert body["replayed"] is False


def test_blurred_photo_rejected_with_buram_reason(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)

    response = upload(client, CASE_ID, blurred_leaf_bytes())

    body = response.json()["data"]
    assert body["photo"]["qualityStatus"] == "ditolak"
    assert "buram" in body["photo"]["rejectReasons"]
    assert len(body["photo"]["rejectReasons"]) <= 3


def test_dark_photo_rejected_with_gelap_reason(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)

    response = upload(client, CASE_ID, dark_leaf_bytes())

    body = response.json()["data"]
    assert body["photo"]["qualityStatus"] == "ditolak"
    assert "gelap" in body["photo"]["rejectReasons"]


def test_gray_photo_marked_tidak_pasti(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)

    response = upload(client, CASE_ID, gray_bytes())

    body = response.json()["data"]
    assert body["photo"]["qualityStatus"] == "tidak_pasti"
    assert body["photo"]["rejectReasons"] == ["bukan_daun"]


def test_tiny_photo_rejected_low_resolution(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)

    response = upload(client, CASE_ID, tiny_leaf_bytes())

    body = response.json()["data"]
    assert body["photo"]["qualityStatus"] == "ditolak"
    assert "resolusi_rendah" in body["photo"]["rejectReasons"]


def test_reject_reasons_never_exceed_three(client, photo_repo):
    """Tiny + dark + blurred fails 3 checks at once — reasons stay ≤ 3."""
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)
    bad = _green_noise_image(size=320, base=(8, 36, 10), amplitude=12).filter(
        ImageFilter.GaussianBlur(radius=12)
    )

    response = upload(client, CASE_ID, _image_bytes(bad))

    body = response.json()["data"]
    assert body["photo"]["qualityStatus"] == "ditolak"
    assert 1 <= len(body["photo"]["rejectReasons"]) <= 3


def test_response_never_leaks_technical_scores(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)

    response = upload(client, CASE_ID, blurred_leaf_bytes())

    photo = response.json()["data"]["photo"]
    leaked = {"scores", "sharpness", "lumaMean", "greenRatio", "minDimension"}
    assert leaked.isdisjoint(photo.keys())


# ---- dedup / idempotency -----------------------------------------------------


def test_duplicate_upload_replays_single_record(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)
    data = sharp_leaf_bytes()

    first = upload(client, CASE_ID, data)
    second = upload(client, CASE_ID, data)

    assert first.json()["data"]["replayed"] is False
    assert second.json()["data"]["replayed"] is True
    assert (
        second.json()["data"]["photo"]["photoId"]
        == first.json()["data"]["photo"]["photoId"]
    )
    assert len(photo_repo.photos) == 1


# ---- EXIF stripping ----------------------------------------------------------


def test_exif_including_gps_is_stripped_from_stored_object(client, photo_repo):
    # Arrange — JPEG carrying EXIF (camera make + GPS IFD)
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)
    exif = Image.Exif()
    exif[271] = "TestCam"  # Make
    exif[0x8825] = {1: "S", 2: (6.0, 11.0, 0.0), 3: "E", 4: (106.0, 49.0, 0.0)}
    data = _image_bytes(_green_noise_image(), exif=exif)
    assert Image.open(BytesIO(data)).getexif()  # input really has EXIF

    # Act
    response = upload(client, CASE_ID, data)

    # Assert — stored bytes carry no EXIF at all (GPS included)
    assert response.status_code == 200
    stored = list(photo_repo.storage.values())[0]
    stored_exif = Image.open(BytesIO(stored)).getexif()
    assert dict(stored_exif) == {}


# ---- case advancement --------------------------------------------------------


def test_two_accepted_photos_advance_case_to_captured(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)

    upload(client, CASE_ID, sharp_leaf_bytes(seed=1), slot_no=1)
    response = upload(client, CASE_ID, sharp_leaf_bytes(seed=2), slot_no=2)

    body = response.json()["data"]
    assert body["acceptedCount"] == 2
    assert body["caseStatus"] == "CAPTURED"
    assert body["caseDisplayStage"] == "difoto"
    notes = [e["note"] for e in photo_repo.events]
    assert "Foto layak terpenuhi — kasus siap dianalisis" in notes


def test_rejected_photo_does_not_advance_case(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)

    upload(client, CASE_ID, sharp_leaf_bytes(seed=1), slot_no=1)
    response = upload(client, CASE_ID, blurred_leaf_bytes(seed=2), slot_no=2)

    body = response.json()["data"]
    assert body["acceptedCount"] == 1
    assert body["caseStatus"] == "DRAFT"


# ---- retake counting + escalation (FR-004) -----------------------------------


def test_three_failures_unlock_escalation(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)

    for seed in (10, 11, 12):
        response = upload(client, CASE_ID, blurred_leaf_bytes(seed=seed))

    body = response.json()["data"]
    assert body["canEscalate"] is True
    assert body["photo"]["retakeCount"] == 2  # third attempt saw 2 prior failures


def test_escalate_before_three_failures_is_rejected(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)
    upload(client, CASE_ID, blurred_leaf_bytes(seed=10))

    response = client.post(
        f"/cases/{CASE_ID}/photos/escalate",
        headers=bearer_headers(PETANI_USER_ID),
    )

    assert response.status_code == 400


def test_escalation_flags_case_for_human_review(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)
    for seed in (10, 11, 12):
        upload(client, CASE_ID, blurred_leaf_bytes(seed=seed))

    response = client.post(
        f"/cases/{CASE_ID}/photos/escalate",
        headers=bearer_headers(PETANI_USER_ID),
    )

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["needsHumanReview"] is True
    assert body["caseStatus"] == "CAPTURED"
    case = photo_repo.cases[CASE_ID]
    assert case["needs_human_review"] is True
    assert case["review_reason"] == "kualitas_foto_rendah"
    notes = [e["note"] for e in photo_repo.events]
    assert any("tanpa analisis otomatis" in note for note in notes)

    # Re-escalation is a 400 — already flagged.
    again = client.post(
        f"/cases/{CASE_ID}/photos/escalate",
        headers=bearer_headers(PETANI_USER_ID),
    )
    assert again.status_code == 400


# ---- listing -----------------------------------------------------------------


def test_list_photos_returns_case_photo_state(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)
    upload(client, CASE_ID, sharp_leaf_bytes(seed=1), slot_no=1)
    upload(client, CASE_ID, blurred_leaf_bytes(seed=2), slot_no=2)

    response = client.get(
        f"/cases/{CASE_ID}/photos", headers=bearer_headers(PETANI_USER_ID)
    )

    body = response.json()["data"]
    assert len(body["photos"]) == 2
    assert body["acceptedCount"] == 1
    assert body["needsHumanReview"] is False
    assert body["caseStatus"] == "DRAFT"


# ---- access control ----------------------------------------------------------


def test_foreign_petani_gets_identical_404(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID, area_kecamatan="Ciparay")

    response = upload(
        client, CASE_ID, sharp_leaf_bytes(), user_id=OTHER_PETANI_USER_ID
    )

    assert response.status_code == 404


def test_penyuluh_can_view_but_not_upload(client, photo_repo):
    """Binaan penyuluh reads the photo state but may not write to the case
    (no assisted session created it)."""
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID, area_kecamatan="Ciparay")

    read = client.get(
        f"/cases/{CASE_ID}/photos", headers=bearer_headers(PENYULUH_USER_ID)
    )
    write = upload(client, CASE_ID, sharp_leaf_bytes(), user_id=PENYULUH_USER_ID)

    assert read.status_code == 200
    assert write.status_code == 403


def test_upload_rejects_non_image_content_type(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)

    response = client.post(
        f"/cases/{CASE_ID}/photos",
        files={"file": ("nota.pdf", b"%PDF-1.4", "application/pdf")},
        data={"slotNo": "1"},
        headers=bearer_headers(PETANI_USER_ID),
    )

    assert response.status_code == 400


def test_upload_rejects_undecodable_image(client, photo_repo):
    seed_case(photo_repo, CASE_ID, PETANI_PROFILE_ID)

    response = client.post(
        f"/cases/{CASE_ID}/photos",
        files={"file": ("foto.jpg", b"not-really-a-jpeg", "image/jpeg")},
        data={"slotNo": "1"},
        headers=bearer_headers(PETANI_USER_ID),
    )

    assert response.status_code == 400
