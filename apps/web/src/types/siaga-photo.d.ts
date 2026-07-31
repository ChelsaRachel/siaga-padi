/**
 * Siaga Padi photo-quality domain types — mirrors `docs/api-spec-photo.md`
 * § Shared types (Sprint 03 pinned FE ↔ BE contract). All fields camelCase,
 * exactly as the contract defines them. The client NEVER receives technical
 * quality scores — only the status + max 3 simple reasons.
 */

export type QualityStatus = 'layak' | 'ditolak' | 'ambang' | 'tidak_pasti'

export type RejectReason = 'buram' | 'gelap' | 'terlalu_jauh' | 'bukan_daun' | 'resolusi_rendah'

export type PhotoSlotNo = 1 | 2 | 3

export interface SiagaCasePhoto {
  photoId: string
  caseId: string
  slotNo: PhotoSlotNo
  qualityStatus: QualityStatus
  /** Max 3. Empty when layak/ambang. */
  rejectReasons: RejectReason[]
  /** Prior failures on this slot when this photo was uploaded. */
  retakeCount: number
  exifStripped: boolean
  /** Short-lived signed URL (private bucket) — null when signing failed. */
  signedUrl: string | null
  createdAt: string
}

export interface PhotoUploadResult {
  photo: SiagaCasePhoto
  /** True when identical bytes were re-sent — same record, never a duplicate. */
  replayed: boolean
  /** Distinct slots holding an accepted (layak/ambang) photo. */
  acceptedCount: number
  /** True after 3 failures on one slot while the minimum is unmet. */
  canEscalate: boolean
  caseStatus: string
  caseDisplayStage: string
}

export interface CasePhotoListResult {
  photos: SiagaCasePhoto[]
  acceptedCount: number
  canEscalate: boolean
  needsHumanReview: boolean
  caseStatus: string
  caseDisplayStage: string
}

export interface PhotoEscalateResult {
  caseId: string
  needsHumanReview: boolean
  caseStatus: string
  caseDisplayStage: string
}
