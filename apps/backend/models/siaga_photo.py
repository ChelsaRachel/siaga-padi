"""Row-shape model and the FR-004 quality vocabulary for case photos.

Mirrors `supabase/migrations/0011_case_photos.sql` (snake_case columns).
FE-facing camelCase DTOs live in `dto/siaga_photo.py`.

`quality_status` and `reject_reasons` store the petani-facing Indonesian
domain values directly (brief 02 §5.1) — there is no canonical/display split
for photos. Raw technical scores are NEVER stored on the row; they live only
in server logs (petani never sees technical scores).
"""
from typing import Optional

from pydantic import BaseModel

# ---- quality statuses (FR-004) ----------------------------------------------

QUALITY_LAYAK = "layak"
QUALITY_DITOLAK = "ditolak"
QUALITY_AMBANG = "ambang"  # borderline: accepted with downstream confidence penalty
QUALITY_TIDAK_PASTI = "tidak_pasti"  # cannot judge leaf-ness: review / extra photo

QUALITY_STATUSES = (
    QUALITY_LAYAK,
    QUALITY_DITOLAK,
    QUALITY_AMBANG,
    QUALITY_TIDAK_PASTI,
)

# Statuses that count toward the "minimum 2 layak photos" gate. `ambang` is
# accepted-with-warning by FR-004 §3.2 (penalty applied downstream, Sprint 05).
ACCEPTED_QUALITY_STATUSES = (QUALITY_LAYAK, QUALITY_AMBANG)

# ---- simple rejection reasons (FR-004 — max 3 shown) -------------------------

REASON_BURAM = "buram"
REASON_GELAP = "gelap"
REASON_TERLALU_JAUH = "terlalu_jauh"
REASON_BUKAN_DAUN = "bukan_daun"
REASON_RESOLUSI_RENDAH = "resolusi_rendah"

REJECT_REASONS = (
    REASON_BURAM,
    REASON_GELAP,
    REASON_TERLALU_JAUH,
    REASON_BUKAN_DAUN,
    REASON_RESOLUSI_RENDAH,
)

MAX_REJECT_REASONS = 3

# ---- photo-count rules (FR-003) ----------------------------------------------

MIN_ACCEPTED_PHOTOS = 2
MAX_PHOTO_SLOTS = 3

# FR-004: after this many failed attempts on a slot the escalation path
# ("Kirim ke Penyuluh Saja") is offered.
MAX_RETAKE_FAILURES = 3


class CasePhotoModel(BaseModel):
    """One row of `case_photos`."""

    id: str
    case_id: str
    slot_no: int
    storage_path: str
    quality_status: str
    reject_reasons: list[str] = []
    retake_count: int = 0
    fingerprint: str
    quality_config_version: str
    exif_stripped: bool = True
    never_for_training: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
