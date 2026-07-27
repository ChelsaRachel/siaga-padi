/**
 * Siaga Padi case-management domain types — mirrors `docs/api-spec-case.md`
 * § Shared types (Sprint 02 pinned FE ↔ BE contract). All fields camelCase,
 * exactly as the contract defines them.
 */

export type GrowthStage = 'SEEDLING' | 'VEGETATIVE' | 'REPRODUCTIVE' | 'RIPENING' | 'UNKNOWN'

export type LocationMode = 'EXACT_GPS' | 'AREA_ONLY' | 'NONE'

/** Petani-facing Indonesian stage derived server-side — FE renders this. */
export type DisplayStage =
  | 'draf'
  | 'difoto'
  | 'diproses'
  | 'hasil_siap'
  | 'direview'
  | 'revisi'
  | 'selesai'
  | 'dibatalkan'

/**
 * Canonical FRD §6.5 status values known to Sprint 02. `SiagaCase.status`
 * stays `string` per the contract ("Sprint 03/05/06 will extend") — this
 * union documents the values the staged-progress view understands.
 */
export type SiagaCaseStatus =
  | 'DRAFT'
  | 'CAPTURED'
  | 'QUALITY_REJECTED'
  | 'QUEUED'
  | 'PROCESSING_CV'
  | 'NEEDS_CONTEXT'
  | 'GENERATING_RECOMMENDATION'
  | 'AUTO_TRIAGE_READY'
  | 'NEEDS_REVIEW'
  | 'REVISION_REQUIRED'
  | 'REVIEWED'
  | 'CLOSED'
  | 'FAILED'
  | 'ARCHIVED'
  | 'CANCELLED'

export interface SiagaCoords {
  lat: number
  lng: number
}

export interface SiagaField {
  fieldId: string
  ownerProfileId: string
  /** 2–100 chars, free naming. */
  name: string
  areaKabupaten: string | null
  areaKecamatan: string | null
  /** Opt-in only. */
  coords: SiagaCoords | null
  /** Gallery card extra. */
  lastGrowthStage: GrowthStage | null
  /** Gallery card extra. */
  caseCount: number | null
  createdAt: string
  updatedAt: string
}

export interface SiagaCase {
  caseId: string
  /** 'KS-YYYY-NNNNNN' */
  caseCode: string
  ownerProfileId: string
  ownerDisplayName: string | null
  /** ≠ owner when assisted. */
  createdByProfileId: string
  createdByDisplayName: string | null
  assistedSessionId: string | null
  /** Null on "belum tahu" cases. */
  fieldId: string | null
  fieldName: string | null
  growthStage: GrowthStage
  locationMode: LocationMode
  areaKabupaten: string | null
  areaKecamatan: string | null
  /** Canonical FRD value — drives the staged-progress view. */
  status: string
  displayStage: DisplayStage
  /** ≤500 chars. */
  notes: string | null
  /** ISO 8601, not far-future. */
  observedAt: string
  createdAt: string
  updatedAt: string
}

export interface SiagaCaseEvent {
  eventId: string
  caseId: string
  /** Null = creation event. */
  fromStatus: string | null
  toStatus: string
  toDisplayStage: DisplayStage
  actorProfileId: string | null
  actorDisplayName: string | null
  note: string | null
  createdAt: string
}

export type DeletionRequestStatus = 'tercatat' | 'diproses' | 'selesai' | 'ditolak'

export interface SiagaDeletionRequest {
  requestId: string
  profileId: string
  reason: string | null
  status: DeletionRequestStatus
  requestedAt: string
  processedAt: string | null
}
