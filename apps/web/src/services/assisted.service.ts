import type { SiagaApiResponse } from '@/types/api'
import type { AccountStatus, ConsentMethod } from '@/types/siaga-auth'
import apiClient from './api-client'
import { API_ENDPOINTS } from './api-endpoints'

/**
 * Assisted-mode service (penyuluh only) — typed 1:1 against docs/api-spec.md.
 * Search is always restricted server-side to the caller's assignment
 * kecamatan; the UI states this but never has to enforce it.
 */

export interface IAssistedSearchPayload {
  query: string
}

export interface IAssistedSearchResult {
  profileId: string
  displayName: string
  areaKabupaten: string | null
  areaKecamatan: string | null
  accountStatus: AccountStatus
}

export interface IAssistedNewProfile {
  displayName: string
  areaKabupaten: string
  areaKecamatan: string
}

/** Exactly one of `subjectProfileId` | `newProfile` must be provided. */
export interface IAssistedStartPayload {
  subjectProfileId?: string
  newProfile?: IAssistedNewProfile
  consentMethod: ConsentMethod
}

export interface IAssistedStartResult {
  sessionId: string
  subjectProfileId: string
  subjectDisplayName: string
  actorUserId: string
  consentMethod: ConsentMethod
  startedAt: string
}

export interface IAssistedEndPayload {
  sessionId: string
}

export interface IAssistedEndResult {
  sessionId: string
  endedAt: string
}

export const assistedService = {
  /** POST apps/assisted/search — results only from the penyuluh's binaan. */
  search: (data: IAssistedSearchPayload): Promise<SiagaApiResponse<IAssistedSearchResult[]>> =>
    apiClient.post(API_ENDPOINTS.ASSISTED.SEARCH, data),

  /** POST apps/assisted/start — existing subject or minimal new profile. */
  start: (data: IAssistedStartPayload): Promise<SiagaApiResponse<IAssistedStartResult>> =>
    apiClient.post(API_ENDPOINTS.ASSISTED.START, data),

  /** POST apps/assisted/end — closes the audited assisted session. */
  end: (data: IAssistedEndPayload): Promise<SiagaApiResponse<IAssistedEndResult>> =>
    apiClient.post(API_ENDPOINTS.ASSISTED.END, data),
}
