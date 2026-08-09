"""CV inference — the 4-class model call, calibrated and abstain-capable.

The model itself is owned by the CV & Dataset Owner. This module owns the SEAM
(`CvModelClient`) plus everything that turns raw scores into a defensible
result, so swapping the fixture for the trained endpoint changes one factory
function and nothing else:

- calibration (over-confident softmax -> honest 0..1),
- aggregation across the case's photos,
- the abstain and conflict rules,
- the borderline-photo confidence penalty.

`FixtureCvModelClient` is deterministic BY PHOTO FINGERPRINT: the same image
always yields the same scores, which is what makes a fixture case reproducible
and a conflict test possible. It is not a random stub.

Nothing here writes to the database — persistence and case transitions live in
`service/triage_pipeline.py`.
"""
from dataclasses import dataclass
from typing import Optional, Protocol

import httpx
from loguru import logger

from config.base import settings
from models.siaga_photo import ACCEPTED_QUALITY_STATUSES, QUALITY_AMBANG
from models.siaga_triage import (
    BAND_RENDAH,
    CALIBRATION_TEMPERATURE,
    CV_LABELS,
    THRESHOLD_VERSION,
    apply_quality_penalty,
    band_for_score,
    calibrate_score,
    resolve_abstain_status,
    top_candidates,
)

FIXTURE_MODEL_VERSION = "cv-fixture-v0"
CV_REQUEST_TIMEOUT_SECONDS = 20

# Deterministic fixtures for the known test images, keyed by the photo
# fingerprint (sha256 of the original bytes, see `service/photos.py`). A
# fingerprint listed here always produces exactly these raw scores, so a test
# can build a high-confidence case, an abstain case or a conflicting PAIR
# without touching the model. Anything not listed falls back to the
# fingerprint-derived distribution below.
FIXTURE_PREDICTIONS: dict[str, dict[str, float]] = {
    # High-confidence Blas Daun — the happy path of brief 03 §10.1.
    "fixture-blas-tinggi": {
        "blas_daun": 0.92,
        "bercak_coklat": 0.05,
        "hawar_daun_bakteri": 0.02,
        "sehat": 0.01,
    },
    # Confidently Bercak Cokelat — pair with the above to produce `konflik`.
    "fixture-bercak-tinggi": {
        "bercak_coklat": 0.88,
        "blas_daun": 0.07,
        "hawar_daun_bakteri": 0.03,
        "sehat": 0.02,
    },
    "fixture-hdb-sedang": {
        "hawar_daun_bakteri": 0.80,
        "blas_daun": 0.11,
        "bercak_coklat": 0.06,
        "sehat": 0.03,
    },
    # Nothing stands out — the model is out of its competence (`tidak_yakin`).
    "fixture-abstain": {
        "blas_daun": 0.31,
        "bercak_coklat": 0.28,
        "hawar_daun_bakteri": 0.22,
        "sehat": 0.19,
    },
    "fixture-sehat": {
        "sehat": 0.90,
        "bercak_coklat": 0.05,
        "blas_daun": 0.03,
        "hawar_daun_bakteri": 0.02,
    },
}


@dataclass(frozen=True)
class PhotoPrediction:
    """One photo's raw model output plus its reviewer-only evidence."""

    photo_id: str
    slot_no: int
    scores: dict[str, float]
    evidence: list[dict]


@dataclass(frozen=True)
class AnalysisOutcome:
    """Everything the pipeline needs to persist a frozen analysis result."""

    candidates: list[dict]
    confidence_band: str
    abstain_status: str
    quality_penalty: bool
    model_version: str
    threshold_version: str
    evidence_maps: list[dict]


class CvModelClient(Protocol):
    """The model seam. One method, so a real endpoint is a drop-in."""

    @property
    def model_version(self) -> str: ...

    def predict(self, photo: dict) -> PhotoPrediction: ...


class FixtureCvModelClient:
    """Deterministic stand-in until the trained endpoint is available.

    Scores come from the fixture table when the fingerprint is known, and
    otherwise from the fingerprint's own characters. Either way the SAME photo
    always produces the SAME scores — a fixture case is reproducible evidence,
    not a coin flip.
    """

    @property
    def model_version(self) -> str:
        return FIXTURE_MODEL_VERSION

    def predict(self, photo: dict) -> PhotoPrediction:
        fingerprint = photo.get("fingerprint") or photo.get("id") or ""
        scores = FIXTURE_PREDICTIONS.get(fingerprint) or _scores_from_fingerprint(
            fingerprint
        )
        return PhotoPrediction(
            photo_id=photo["id"],
            slot_no=photo.get("slot_no") or 0,
            scores=dict(scores),
            evidence=_fixture_evidence(fingerprint),
        )


class HttpCvModelClient:
    """Calls the trained model endpoint (`CV_MODEL_ENDPOINT`).

    The request carries the storage path and the photo id only — no farmer
    name, phone or coordinates ever reach the model service.
    """

    def __init__(self, endpoint: str, model_version: str, api_key: str = "") -> None:
        self._endpoint = endpoint
        self._model_version = model_version
        self._api_key = api_key

    @property
    def model_version(self) -> str:
        return self._model_version

    def predict(self, photo: dict) -> PhotoPrediction:
        headers = {"Authorization": f"Bearer {self._api_key}"} if self._api_key else {}
        response = httpx.post(
            self._endpoint,
            json={
                "storagePath": photo.get("storage_path"),
                "photoId": photo["id"],
            },
            headers=headers,
            timeout=CV_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json() or {}
        raw_scores = payload.get("scores") or {}
        return PhotoPrediction(
            photo_id=photo["id"],
            slot_no=photo.get("slot_no") or 0,
            # Unknown labels are dropped: a model returning a fifth class must
            # not silently widen the MVP vocabulary.
            scores={
                label: float(raw_scores.get(label) or 0.0) for label in CV_LABELS
            },
            evidence=list(payload.get("evidence") or []),
        )


def resolve_cv_client() -> CvModelClient:
    """The configured model client — the trained endpoint when one is set."""
    endpoint = (settings.CV_MODEL_ENDPOINT or "").strip()
    if not endpoint:
        return FixtureCvModelClient()
    return HttpCvModelClient(
        endpoint=endpoint,
        model_version=settings.CV_MODEL_VERSION or "cv-endpoint",
        api_key=settings.CV_MODEL_API_KEY or "",
    )


def _scores_from_fingerprint(fingerprint: str) -> dict[str, float]:
    """Stable pseudo-distribution derived from the fingerprint's characters.

    Not a random number generator: the same fingerprint always maps to the same
    dominant label and the same margin, so an unlisted test image still behaves
    identically on every run and on every machine.
    """
    digest = fingerprint or "0"
    seed = sum((index + 1) * ord(char) for index, char in enumerate(digest))
    dominant = CV_LABELS[seed % len(CV_LABELS)]
    # 0.40..0.94 — wide enough to land in every band and in abstain territory.
    dominant_score = 0.40 + ((seed >> 3) % 55) / 100.0
    others = [label for label in CV_LABELS if label != dominant]
    share = round((1.0 - dominant_score) / len(others), 4)
    scores = {label: share for label in others}
    scores[dominant] = round(dominant_score, 4)
    return scores


def _fixture_evidence(fingerprint: str) -> list[dict]:
    """Reviewer-only highlight stand-in — a stable box, never shown to petani."""
    seed = sum(ord(char) for char in (fingerprint or "0"))
    return [
        {
            "region": "daun",
            "x": seed % 40,
            "y": (seed >> 2) % 40,
            "width": 30,
            "height": 30,
            "note": "Area dasar dugaan (contoh fixture)",
        }
    ]


def analysable_photos(photos: list[dict]) -> list[dict]:
    """Only accepted photos feed the model — a rejected photo is not evidence."""
    return [
        row for row in photos if row.get("quality_status") in ACCEPTED_QUALITY_STATUSES
    ]


def analyse_photos(
    photos: list[dict], client: Optional[CvModelClient] = None
) -> AnalysisOutcome:
    """Run the model over a case's accepted photos and reduce to one verdict.

    Aggregation is the MEAN of the calibrated per-photo scores: one strong
    photo cannot outvote a genuinely ambiguous set, which is what keeps the
    conflict rule meaningful.
    """
    model = client or resolve_cv_client()
    usable = analysable_photos(photos)
    predictions = [model.predict(photo) for photo in usable]

    has_borderline = any(row.get("quality_status") == QUALITY_AMBANG for row in usable)

    per_photo_tops: list[tuple[str, float]] = []
    totals: dict[str, float] = {label: 0.0 for label in CV_LABELS}
    for prediction in predictions:
        calibrated = {
            label: apply_quality_penalty(
                calibrate_score(score, CALIBRATION_TEMPERATURE), has_borderline
            )
            for label, score in prediction.scores.items()
            if label in CV_LABELS
        }
        if not calibrated:
            continue
        for label, score in calibrated.items():
            totals[label] += score
        best_label = max(calibrated.items(), key=lambda pair: (pair[1], pair[0]))[0]
        per_photo_tops.append((best_label, calibrated[best_label]))

    photo_count = len(per_photo_tops)
    aggregated = (
        {label: round(total / photo_count, 4) for label, total in totals.items()}
        if photo_count
        else {}
    )
    candidates = top_candidates(aggregated) if aggregated else []
    abstain_status = resolve_abstain_status(candidates, per_photo_tops)
    band = (
        band_for_score(candidates[0]["calibrated_score"])
        if candidates
        else BAND_RENDAH
    )

    logger.info(
        f"cv analysis: photos={photo_count} model={model.model_version} "
        f"band={band} abstain={abstain_status} penalty={has_borderline} "
        f"candidates={[candidate['label'] for candidate in candidates]}"
    )

    return AnalysisOutcome(
        candidates=candidates,
        confidence_band=band,
        abstain_status=abstain_status,
        quality_penalty=has_borderline,
        model_version=model.model_version,
        threshold_version=THRESHOLD_VERSION,
        evidence_maps=[
            {
                "photoId": prediction.photo_id,
                "slotNo": prediction.slot_no,
                "regions": prediction.evidence,
            }
            for prediction in predictions
        ],
    )
