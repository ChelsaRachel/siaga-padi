import type { ApiResponse } from '@/types/api'
import type { CasePhotoListResult, PhotoEscalateResult, PhotoSlotNo, PhotoUploadResult } from '@/types/siaga-photo'
import { API_ENDPOINTS } from './api-endpoints'
import { request, uploadRequest } from './api.service'

/**
 * Case-photo service — typed 1:1 against docs/api-spec-photo.md.
 *
 * Upload dedup is CONTENT-addressed server-side (sha256 of the bytes, unique
 * per case): a retry that re-sends the same photo is inherently a replay —
 * the server returns the SAME record (`replayed: true`), never a duplicate.
 * The full offline queue arrives in Sprint 07; this sprint keeps in-session
 * retry with the exact same bytes/fingerprint.
 */
export const photosService = {
  /** POST apps/cases/{id}/photos — multipart (file + slotNo) with progress events. */
  upload: (caseId: string, file: Blob, slotNo: PhotoSlotNo, onProgress?: (percent: number) => void): Promise<ApiResponse<PhotoUploadResult>> => {
    const formData = new FormData()
    formData.append('file', file, `foto-${slotNo}.jpg`)
    formData.append('slotNo', String(slotNo))
    return uploadRequest<PhotoUploadResult>(API_ENDPOINTS.PHOTOS.UPLOAD(caseId), formData, onProgress)
  },

  /** GET apps/cases/{id}/photos — the case's photo state (visibility server-side). */
  getAll: (caseId: string): Promise<ApiResponse<CasePhotoListResult>> =>
    request<CasePhotoListResult>({
      path: API_ENDPOINTS.PHOTOS.LIST(caseId),
      method: 'get',
    }),

  /** POST apps/cases/{id}/photos/escalate — "Kirim ke Penyuluh Saja" (3× gagal). */
  escalate: (caseId: string): Promise<ApiResponse<PhotoEscalateResult>> =>
    request<PhotoEscalateResult>({
      path: API_ENDPOINTS.PHOTOS.ESCALATE(caseId),
      method: 'post',
    }),
}
