/**
 * Siaga Padi knowledge-base domain types — mirrors `docs/api-spec-kb.md`
 * § Shared types (Sprint 04 pinned FE ↔ BE contract). All fields camelCase,
 * exactly as the contract defines them.
 *
 * Two fields carry the safety rules and must never be dropped in the UI:
 * `policyFlag` (this chunk is not narratable to petani) and
 * `requiredPolicyFlag` (the content demands a flag before it can be approved).
 */

export type KbSourceStatus = 'draf' | 'disetujui' | 'dipensiunkan'

export type KbAvailabilityStatus = 'tersedia' | 'arsip' | 'tidak_tersedia'

export type KbApprovalStatus = 'menunggu' | 'disetujui' | 'ditolak'

export type KbAudience = 'petani' | 'penyuluh'

export type KbRisk = 'aman' | 'dibatasi'

export type KbPolicyFlag = 'memuat_dosis' | 'memuat_merek' | 'memuat_dosis_dan_merek'

export type KbActionType =
  | 'kultur_teknis'
  | 'kimiawi'
  | 'biologis'
  | 'pencegahan'
  | 'pemantauan'
  | 'eskalasi'

export interface SiagaKbSource {
  sourceId: string
  title: string
  publisher: string
  publishedDate: string | null
  editionVersion: string | null
  /** Legal basis for using the document — always present. */
  licenseNote: string
  category: string | null
  sourceUrl: string | null
  status: KbSourceStatus
  availabilityStatus: KbAvailabilityStatus
  lastReviewedAt: string | null
  retiredAt: string | null
  chunkTotal: number
  chunkPending: number
  chunkApproved: number
  createdAt: string
}

export interface SiagaKbChunk {
  chunkId: string
  /** Stable across versions — what a recommendation card cites. */
  refCode: string
  sourceId: string
  sourceTitle: string | null
  sourceVersion: string | null
  location: string | null
  content: string
  diseaseTags: string[]
  phaseTags: string[]
  actionType: KbActionType | null
  audience: KbAudience
  risk: KbRisk
  policyFlag: KbPolicyFlag | null
  /** Flag the content REQUIRES — approval is refused while it is unmet. */
  requiredPolicyFlag: KbPolicyFlag | null
  approvalStatus: KbApprovalStatus
  rejectReason: string | null
  version: number
  /** False once superseded — drives the "versi lama" label. */
  isCurrent: boolean
  validUntil: string | null
  decidedAt: string | null
  createdAt: string
}

export interface KbIngestResult {
  sourceId: string
  chunkCount: number
  /** Always equals chunkCount — ingest never approves anything. */
  pendingCount: number
  refCodes: string[]
}

export interface RegisterKbSourceResult {
  source: SiagaKbSource
  /** Null when the source was registered without document text. */
  ingest: KbIngestResult | null
}

export interface KbChunkVersion {
  chunkId: string
  version: number
  content: string
  diseaseTags: string[]
  phaseTags: string[]
  actionType: KbActionType | null
  audience: KbAudience
  risk: KbRisk
  policyFlag: KbPolicyFlag | null
  approvalStatus: KbApprovalStatus
  isCurrent: boolean
  createdAt: string | null
}

export type KbDiffOp = '=' | '-' | '+'

export interface KbDiffLine {
  op: KbDiffOp
  text: string
}

export interface KbChunkDiff {
  refCode: string
  base: KbChunkVersion
  compare: KbChunkVersion
  changedFields: string[]
  contentDiff: KbDiffLine[]
}

export interface KbRetrievalHit {
  refCode: string
  chunkId: string
  sourceTitle: string | null
  location: string | null
  content: string
  diseaseTags: string[]
  phaseTags: string[]
  actionType: KbActionType | null
  audience: KbAudience
  risk: KbRisk
  policyFlag: KbPolicyFlag | null
  /** False for policy-flagged chunks: linkable, never narrated. */
  narratable: boolean
  score: number
}

export interface KbRetrievalResult {
  disease: string | null
  phase: string | null
  audience: KbAudience | null
  actionType: KbActionType | null
  hits: KbRetrievalHit[]
  totalCount: number
}
