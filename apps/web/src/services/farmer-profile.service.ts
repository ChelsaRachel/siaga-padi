import type { SiagaApiResponse } from '@/types/api'
import type { SiagaProfile } from '@/types/siaga-auth'
import type { SiagaCoords, SiagaDeletionRequest, SiagaField } from '@/types/siaga-case'
import apiClient from './api-client'
import { API_ENDPOINTS } from './api-endpoints'

/**
 * Farmer profile & lahan service — typed 1:1 against docs/api-spec-case.md.
 * NO national-ID anywhere (privacy by design). Deletion requests are recorded
 * per retention policy — never an instant wipe.
 *
 * NOTE: the sprint task file names this file `farmerProfile.ts`; it is
 * `farmer-profile.service.ts` to follow the mandatory `{module}.service.ts`
 * naming convention (skills/reactjs-architecture — documented deviation).
 */

export interface IFarmerProfileUpdatePayload {
  displayName?: string
  areaKabupaten?: string
  areaKecamatan?: string
  researchConsent?: boolean
  locationConsent?: boolean
}

export interface IFieldCreatePayload {
  /** 2–100 chars. */
  name: string
  areaKabupaten?: string
  areaKecamatan?: string
  coords?: SiagaCoords
  /** Penyuluh assisted mode: owner = session subject. */
  assistedSessionId?: string
}

export interface IFieldUpdatePayload {
  fieldId: string
  name?: string
  areaKabupaten?: string
  areaKecamatan?: string
  coords?: SiagaCoords
}

export interface IFieldListPayload {
  page?: number
  limit?: number
}

export interface IDeletionRequestPayload {
  reason?: string
}

export const farmerProfileService = {
  /** PUT apps/farmer/profile — updates OWN profile (no role/status changes here). */
  updateProfile: (data: IFarmerProfileUpdatePayload): Promise<SiagaApiResponse<SiagaProfile>> =>
    apiClient.put(API_ENDPOINTS.FARMER_PROFILE.UPDATE, data),

  /** POST apps/farmer/profile/fields — create lahan (name 2–100). */
  createField: (data: IFieldCreatePayload): Promise<SiagaApiResponse<SiagaField>> =>
    apiClient.post(API_ENDPOINTS.FARMER_PROFILE.FIELDS, data),

  /** PUT apps/farmer/profile/fields — update own lahan; 404 when not owner. */
  updateField: (data: IFieldUpdatePayload): Promise<SiagaApiResponse<SiagaField>> =>
    apiClient.put(API_ENDPOINTS.FARMER_PROFILE.FIELDS, data),

  /** POST apps/farmer/profile/fields/get-all — own lahan with gallery extras. */
  getFields: (data: IFieldListPayload = {}): Promise<SiagaApiResponse<SiagaField[]>> =>
    apiClient.post(API_ENDPOINTS.FARMER_PROFILE.FIELDS_GET_ALL, data),

  /** POST apps/farmer/profile/deletion-request — recorded (`tercatat`), not instant. */
  requestDeletion: (data: IDeletionRequestPayload = {}): Promise<SiagaApiResponse<SiagaDeletionRequest>> =>
    apiClient.post(API_ENDPOINTS.FARMER_PROFILE.DELETION_REQUEST, data),

  /** GET apps/farmer/profile/deletion-request — latest own request or null. */
  getDeletionRequest: (): Promise<SiagaApiResponse<SiagaDeletionRequest | null>> =>
    apiClient.get(API_ENDPOINTS.FARMER_PROFILE.DELETION_REQUEST),
}
