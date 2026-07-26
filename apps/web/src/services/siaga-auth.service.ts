import type { SiagaApiResponse } from '@/types/api'
import type { SiagaProfile, SiagaSession } from '@/types/siaga-auth'
import apiClient from './api-client'
import { API_ENDPOINTS } from './api-endpoints'

/**
 * Siaga Padi auth service — typed 1:1 against docs/api-spec.md.
 * Errors bubble to the caller already normalized by api-client
 * (`status`, Indonesian `message`, `additionalInfo`).
 */

export interface ISiagaLoginPayload {
  email: string
  password: string
}

export interface ISiagaLoginResult {
  session: SiagaSession
  profile: SiagaProfile
}

export interface ISiagaRefreshPayload {
  refreshToken: string
}

export interface ISiagaRefreshResult {
  session: SiagaSession
}

export const siagaAuthService = {
  /** POST apps/siaga/auth/login — 401 generic, 423 lockout with retryAfterSeconds. */
  login: (data: ISiagaLoginPayload): Promise<SiagaApiResponse<ISiagaLoginResult>> =>
    apiClient.post(API_ENDPOINTS.SIAGA_AUTH.LOGIN, data),

  /** POST apps/siaga/auth/refresh — body-token refresh, no cookies. */
  refresh: (data: ISiagaRefreshPayload): Promise<SiagaApiResponse<ISiagaRefreshResult>> =>
    apiClient.post(API_ENDPOINTS.SIAGA_AUTH.REFRESH, data),

  /** GET apps/siaga/auth/me — Bearer; assignmentAreas populated for penyuluh. */
  me: (): Promise<SiagaApiResponse<SiagaProfile>> =>
    apiClient.get(API_ENDPOINTS.SIAGA_AUTH.ME),
}
