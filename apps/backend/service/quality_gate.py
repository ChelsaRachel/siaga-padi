"""Deterministic photo quality gate (FR-004) + EXIF strip / normalization.

Pure functions over image bytes — no I/O, no Supabase — so the whole gate is
unit-testable with synthetic Pillow images. `service/photos.py` orchestrates
storage and rows around these.

Thresholds are the SEEDED config version; Sprint 08 formalizes managed,
versioned configs. Every photo row records `quality_config_version` so results
stay auditable after thresholds change.

Raw metric scores are returned for SERVER-SIDE LOGGING ONLY — they must never
reach a client DTO (FR-004: petani never sees technical scores; only the
simple reasons + tips).

Routes calling into this module are sync `def` endpoints, so Pillow/numpy
work runs on FastAPI's threadpool and never blocks the event loop.
"""
from dataclasses import dataclass, field
from io import BytesIO

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from exceptions.siaga_exceptions import SiagaValidationError
from models.siaga_photo import (
    MAX_REJECT_REASONS,
    QUALITY_AMBANG,
    QUALITY_DITOLAK,
    QUALITY_LAYAK,
    QUALITY_TIDAK_PASTI,
    REASON_BURAM,
    REASON_BUKAN_DAUN,
    REASON_GELAP,
    REASON_RESOLUSI_RENDAH,
    REASON_TERLALU_JAUH,
)

INVALID_IMAGE_MESSAGE = "Berkas bukan gambar yang dapat dibaca."

# ---- seeded quality config (Sprint 08 formalizes management) -----------------

QUALITY_CONFIG_VERSION = "quality-v1-seed"

# Each metric has a HARD floor (below it → simple reject reason) and a SOFT
# floor (between hard and soft → borderline; accepted as `ambang` with a
# downstream confidence penalty, FR-004 §3.2).
QUALITY_THRESHOLDS = {
    "min_dimension_hard_px": 480,
    "min_dimension_soft_px": 640,
    "luma_mean_hard": 50.0,
    "luma_mean_soft": 70.0,
    "sharpness_hard": 30.0,
    "sharpness_soft": 80.0,
    # Leaf coverage as greenish-pixel ratio. Below `leafless` the object is
    # probably not a leaf at all → `tidak_pasti` (cannot judge), FR-004 §3.2.
    "green_ratio_leafless": 0.05,
    "green_ratio_hard": 0.25,
    "green_ratio_soft": 0.35,
}

# Normalization targets (brief §4.1: size normalized before storage; location
# EXIF stripped; full-res originals only under research consent — not stored).
NORMALIZED_MAX_DIMENSION_PX = 1600
NORMALIZED_JPEG_QUALITY = 85
ANALYSIS_MAX_DIMENSION_PX = 512  # metric computation downscale (speed)
GREEN_DOMINANCE_MARGIN = 10  # channel units a pixel's G must exceed R and B by


@dataclass(frozen=True)
class NormalizedPhoto:
    """Re-encoded JPEG with orientation applied and ALL EXIF dropped."""

    data: bytes
    width: int
    height: int


@dataclass(frozen=True)
class QualityAssessment:
    """Gate verdict: simple client-facing reasons + log-only raw scores."""

    status: str
    reasons: list[str] = field(default_factory=list)
    scores: dict = field(default_factory=dict)  # server logs ONLY


def strip_and_normalize(data: bytes) -> NormalizedPhoto:
    """Decode, apply EXIF orientation, drop ALL metadata, bound the size.

    Re-encoding to a fresh JPEG without an `exif=` argument guarantees no
    EXIF block (GPS included) survives — asserted by unit tests.
    """
    try:
        image = Image.open(BytesIO(data))
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise SiagaValidationError(INVALID_IMAGE_MESSAGE) from error
    image = _bounded_resize(image, NORMALIZED_MAX_DIMENSION_PX)
    output = BytesIO()
    image.save(output, format="JPEG", quality=NORMALIZED_JPEG_QUALITY)
    return NormalizedPhoto(
        data=output.getvalue(), width=image.width, height=image.height
    )


def assess_quality(photo: NormalizedPhoto) -> QualityAssessment:
    """Run the deterministic FR-004 checks on a normalized photo."""
    scores = _compute_scores(photo)
    if scores["green_ratio"] < QUALITY_THRESHOLDS["green_ratio_leafless"]:
        return QualityAssessment(
            status=QUALITY_TIDAK_PASTI,
            reasons=[REASON_BUKAN_DAUN],
            scores=scores,
        )
    reasons, is_borderline = _grade_metrics(scores)
    if reasons:
        return QualityAssessment(
            status=QUALITY_DITOLAK,
            reasons=reasons[:MAX_REJECT_REASONS],
            scores=scores,
        )
    status = QUALITY_AMBANG if is_borderline else QUALITY_LAYAK
    return QualityAssessment(status=status, scores=scores)


def _compute_scores(photo: NormalizedPhoto) -> dict:
    """Raw metric values — log-only, never serialized to a client."""
    image = Image.open(BytesIO(photo.data))
    analysis = _bounded_resize(image, ANALYSIS_MAX_DIMENSION_PX)
    rgb = np.asarray(analysis, dtype=np.float32)
    luma = (
        0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    )
    return {
        "min_dimension": min(photo.width, photo.height),
        "luma_mean": float(luma.mean()),
        "sharpness": _laplacian_variance(luma),
        "green_ratio": _green_ratio(rgb),
    }


def _grade_metrics(scores: dict) -> tuple[list[str], bool]:
    """Map raw scores onto simple reasons (hard fail) or a borderline flag."""
    thresholds = QUALITY_THRESHOLDS
    checks = (
        (
            scores["min_dimension"],
            thresholds["min_dimension_hard_px"],
            thresholds["min_dimension_soft_px"],
            REASON_RESOLUSI_RENDAH,
        ),
        (
            scores["luma_mean"],
            thresholds["luma_mean_hard"],
            thresholds["luma_mean_soft"],
            REASON_GELAP,
        ),
        (
            scores["sharpness"],
            thresholds["sharpness_hard"],
            thresholds["sharpness_soft"],
            REASON_BURAM,
        ),
        (
            scores["green_ratio"],
            thresholds["green_ratio_hard"],
            thresholds["green_ratio_soft"],
            REASON_TERLALU_JAUH,
        ),
    )
    reasons = [reason for value, hard, _, reason in checks if value < hard]
    is_borderline = any(hard <= value < soft for value, hard, soft, _ in checks)
    return reasons, is_borderline


def _laplacian_variance(luma: np.ndarray) -> float:
    """Sharpness proxy: variance of the 4-neighbor Laplacian of the luma."""
    padded = np.pad(luma, 1, mode="edge")
    laplacian = (
        padded[:-2, 1:-1]
        + padded[2:, 1:-1]
        + padded[1:-1, :-2]
        + padded[1:-1, 2:]
        - 4.0 * luma
    )
    return float(laplacian.var())


def _green_ratio(rgb: np.ndarray) -> float:
    """Fraction of pixels whose green channel clearly dominates (leaf proxy)."""
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    is_greenish = (green > red + GREEN_DOMINANCE_MARGIN) & (
        green > blue + GREEN_DOMINANCE_MARGIN
    )
    return float(is_greenish.mean())


def _bounded_resize(image: Image.Image, max_dimension: int) -> Image.Image:
    """Downscale so the longest edge is ≤ `max_dimension` (never upscale)."""
    longest = max(image.width, image.height)
    if longest <= max_dimension:
        return image
    scale = max_dimension / longest
    new_size = (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    return image.resize(new_size, Image.LANCZOS)
