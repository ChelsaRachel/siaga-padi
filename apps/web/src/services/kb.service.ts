import type { ApiResponse, SiagaApiResponse } from '@/types/api'
import type {
  KbActionType,
  KbApprovalStatus,
  KbAudience,
  KbAvailabilityStatus,
  KbChunkDiff,
  KbIngestResult,
  KbPolicyFlag,
  KbRetrievalResult,
  KbSourceStatus,
  RegisterKbSourceResult,
  SiagaKbChunk,
  SiagaKbSource,
} from '@/types/siaga-kb'
import apiClient from './api-client'
import { API_ENDPOINTS } from './api-endpoints'
import { uploadRequest } from './api.service'

/**
 * Knowledge-base service — typed 1:1 against docs/api-spec-kb.md.
 *
 * NOTE: the sprint task file names this file `kb.ts`; it is `kb.service.ts` to
 * follow the mandatory `{module}.service.ts` naming convention
 * (skills/reactjs-architecture — deliberate, documented deviation, same as
 * `cases.service.ts`).
 *
 * Ingest is multipart because a curated source is usually a PDF; the same
 * endpoint accepts pasted text so an admin without the file can still work.
 * Nothing here is queueable: curation is a desk task on a real connection, and
 * a replayed approval would be a governance problem, not a convenience.
 */

export interface IKbSourceFilters {
  status?: KbSourceStatus
  publisher?: string
  availabilityStatus?: KbAvailabilityStatus
  /** Substring match on the title. */
  query?: string
}

export interface IKbSourceListPayload {
  page: number
  limit: number
  filters?: IKbSourceFilters
}

export interface IKbSourceRegisterPayload {
  title: string
  publisher: string
  /** Legal basis — the API refuses a source without it. */
  licenseNote: string
  publishedDate?: string
  editionVersion?: string
  category?: string
  sourceUrl?: string
  availabilityStatus?: KbAvailabilityStatus
  /** Pasted document text — registers AND ingests in one call. */
  content?: string
}

export interface IKbSourceUpdatePayload {
  title?: string
  publisher?: string
  licenseNote?: string
  publishedDate?: string
  editionVersion?: string
  category?: string
  sourceUrl?: string
  availabilityStatus?: KbAvailabilityStatus
  /** Stamps "terakhir ditinjau" without touching other metadata. */
  markReviewed?: boolean
}

export interface IKbChunkFilters {
  sourceId?: string
  approvalStatus?: KbApprovalStatus
  disease?: string
  phase?: string
  audience?: KbAudience
  refCode?: string
  policyFlagged?: boolean
  /** Defaults to true server-side — the queue shows current versions. */
  isCurrent?: boolean
}

export interface IKbChunkListPayload {
  page: number
  limit: number
  filters?: IKbChunkFilters
}

export interface IKbApprovePayload {
  policyFlag?: KbPolicyFlag
  diseaseTags?: string[]
  phaseTags?: string[]
  actionType?: KbActionType
  audience?: KbAudience
  validUntil?: string
  note?: string
}

export interface IKbRevisePayload {
  content?: string
  diseaseTags?: string[]
  phaseTags?: string[]
  actionType?: KbActionType
  audience?: KbAudience
  policyFlag?: KbPolicyFlag
  note?: string
}

export interface IKbRetrievalPayload {
  disease?: string
  phase?: string
  audience?: KbAudience
  actionType?: KbActionType
  limit?: number
}

export const kbService = {
  /** POST apps/kb/sources — register (+ ingest when `content` is present). */
  registerSource: (
    payload: IKbSourceRegisterPayload
  ): Promise<SiagaApiResponse<RegisterKbSourceResult>> =>
    apiClient.post(API_ENDPOINTS.KB.SOURCES, payload),

  /** POST apps/kb/sources/get-all — filtered catalog page. */
  getAllSources: (
    payload: IKbSourceListPayload
  ): Promise<SiagaApiResponse<SiagaKbSource[]>> =>
    apiClient.post(API_ENDPOINTS.KB.SOURCES_GET_ALL, payload),

  /** GET apps/kb/sources/{id}. */
  getSource: (sourceId: string): Promise<SiagaApiResponse<SiagaKbSource>> =>
    apiClient.get(API_ENDPOINTS.KB.SOURCE_DETAIL(sourceId)),

  /** PATCH apps/kb/sources/{id} — metadata edit (admin). */
  updateSource: (
    sourceId: string,
    payload: IKbSourceUpdatePayload
  ): Promise<SiagaApiResponse<SiagaKbSource>> =>
    apiClient.patch(API_ENDPOINTS.KB.SOURCE_DETAIL(sourceId), payload),

  /**
   * POST apps/kb/sources/{id}/ingest — multipart document OR pasted text.
   * Every produced chunk lands pending; nothing is auto-approved.
   */
  ingestSource: (
    sourceId: string,
    input: { file?: Blob; fileName?: string; content?: string },
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<KbIngestResult>> => {
    const formData = new FormData()
    if (input.file) {
      formData.append('file', input.file, input.fileName ?? 'dokumen.pdf')
    }
    if (input.content) {
      formData.append('content', input.content)
    }
    return uploadRequest<KbIngestResult>(
      API_ENDPOINTS.KB.SOURCE_INGEST(sourceId),
      formData,
      onProgress
    )
  },

  /** POST apps/kb/sources/{id}/retire — out of the index, history intact. */
  retireSource: (
    sourceId: string,
    reason?: string
  ): Promise<SiagaApiResponse<SiagaKbSource>> =>
    apiClient.post(API_ENDPOINTS.KB.SOURCE_RETIRE(sourceId), { reason }),

  /** POST apps/kb/chunks/get-all — the review queue. */
  getAllChunks: (
    payload: IKbChunkListPayload
  ): Promise<SiagaApiResponse<SiagaKbChunk[]>> =>
    apiClient.post(API_ENDPOINTS.KB.CHUNKS_GET_ALL, payload),

  /** GET apps/kb/chunks/ref/{refCode} — read-only preview, any signed-in role. */
  getChunkByRef: (
    refCode: string,
    version?: number
  ): Promise<SiagaApiResponse<SiagaKbChunk>> =>
    apiClient.get(API_ENDPOINTS.KB.CHUNK_BY_REF(refCode), {
      params: version ? { version } : undefined,
    }),

  /** GET apps/kb/chunks/ref/{refCode}/diff — draf vs aktif. */
  getChunkDiff: (
    refCode: string,
    versions?: { baseVersion?: number; compareVersion?: number }
  ): Promise<SiagaApiResponse<KbChunkDiff>> =>
    apiClient.get(API_ENDPOINTS.KB.CHUNK_DIFF(refCode), { params: versions }),

  /** POST apps/kb/chunks/{id}/approve — refused while a policy flag is due. */
  approveChunk: (
    chunkId: string,
    payload: IKbApprovePayload
  ): Promise<SiagaApiResponse<SiagaKbChunk>> =>
    apiClient.post(API_ENDPOINTS.KB.CHUNK_APPROVE(chunkId), payload),

  /** POST apps/kb/chunks/{id}/reject — reason is mandatory. */
  rejectChunk: (
    chunkId: string,
    reason: string
  ): Promise<SiagaApiResponse<SiagaKbChunk>> =>
    apiClient.post(API_ENDPOINTS.KB.CHUNK_REJECT(chunkId), { reason }),

  /** POST apps/kb/chunks/{id}/revise — writes a new version row. */
  reviseChunk: (
    chunkId: string,
    payload: IKbRevisePayload
  ): Promise<SiagaApiResponse<SiagaKbChunk>> =>
    apiClient.post(API_ENDPOINTS.KB.CHUNK_REVISE(chunkId), payload),

  /** POST apps/kb/retrieval-test — evidence before a version is activated. */
  retrievalTest: (
    payload: IKbRetrievalPayload
  ): Promise<SiagaApiResponse<KbRetrievalResult>> =>
    apiClient.post(API_ENDPOINTS.KB.RETRIEVAL_TEST, payload),
}
