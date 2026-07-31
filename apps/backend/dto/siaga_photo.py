"""FE-facing camelCase DTOs for case photos (Sprint 03 contract
`apps/web/docs/api-spec-photo.md`).

DB rows are snake_case — use the builders below to convert. The DTO carries
ONLY the simple Indonesian reasons + status; raw technical quality scores are
never serialized to the client (FR-004: petani never sees technical scores).
"""
from typing import Optional

from pydantic import BaseModel


class CasePhotoOut(BaseModel):
    """Contract type `CasePhotoOut` — one upload attempt on a slot."""

    photoId: str
    caseId: str
    slotNo: int
    qualityStatus: str
    rejectReasons: list[str] = []
    retakeCount: int = 0
    exifStripped: bool = True
    """Short-lived signed URL — bucket is private, never a public URL."""
    signedUrl: Optional[str] = None
    createdAt: Optional[str] = None


class PhotoUploadOut(BaseModel):
    """Contract type `PhotoUploadOut` — result of one upload attempt."""

    photo: CasePhotoOut
    """True when the same bytes were re-sent — same record, never a duplicate."""
    replayed: bool = False
    """Photos currently counting toward the minimum (layak + ambang)."""
    acceptedCount: int
    """FR-004: true once a slot failed MAX_RETAKE_FAILURES times."""
    canEscalate: bool
    caseStatus: str
    caseDisplayStage: str


class CasePhotoListOut(BaseModel):
    """Contract type `CasePhotoListOut` — the case's photo state."""

    photos: list[CasePhotoOut]
    acceptedCount: int
    canEscalate: bool
    needsHumanReview: bool
    caseStatus: str
    caseDisplayStage: str


class EscalateOut(BaseModel):
    """Contract type `EscalateOut` — after 'Kirim ke Penyuluh Saja'."""

    caseId: str
    needsHumanReview: bool
    caseStatus: str
    caseDisplayStage: str


def case_photo_from_row(
    row: dict, signed_url: Optional[str] = None
) -> CasePhotoOut:
    """Build the camelCase photo DTO from a snake_case `case_photos` row."""
    return CasePhotoOut(
        photoId=row["id"],
        caseId=row["case_id"],
        slotNo=row["slot_no"],
        qualityStatus=row["quality_status"],
        rejectReasons=list(row.get("reject_reasons") or []),
        retakeCount=row.get("retake_count") or 0,
        exifStripped=bool(row.get("exif_stripped", True)),
        signedUrl=signed_url,
        createdAt=row.get("created_at"),
    )
