import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SiagaProfile, SiagaSession } from '@/types/siaga-auth'

const mocks = vi.hoisted(() => {
  const instance = Object.assign(vi.fn(), {
    defaults: { baseURL: '/api/v1' },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  })
  return { instance, post: vi.fn() }
})

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mocks.instance),
    post: mocks.post,
  },
  AxiosError: class AxiosError extends Error {},
}))

// Importing registers the interceptors on the mocked instance.
import './api-client'
import { useAuthStore } from '@/stores/useAuthStore'

type TInterceptorHandler = (value: unknown) => unknown

// Capture the handlers at module scope — vi.clearAllMocks() in beforeEach
// wipes recorded calls, but these references stay valid.
const requestInterceptor = mocks.instance.interceptors.request.use.mock
  .calls[0][0] as TInterceptorHandler
const responseErrorInterceptor = mocks.instance.interceptors.response.use.mock
  .calls[0][1] as (error: unknown) => Promise<unknown>

function getRequestInterceptor(): TInterceptorHandler {
  return requestInterceptor
}

function getResponseErrorInterceptor(): (error: unknown) => Promise<unknown> {
  return responseErrorInterceptor
}

const SESSION: SiagaSession = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  tokenType: 'bearer',
  expiresIn: 3600,
}

const PROFILE: SiagaProfile = {
  profileId: 'profile-1',
  userId: 'user-1',
  displayName: 'Bu Sari',
  role: 'penyuluh',
  areaKabupaten: null,
  areaKecamatan: null,
  accountStatus: 'mandiri',
  researchConsent: false,
  locationConsent: false,
  assignmentAreas: ['Rengasdengklok'],
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
}

describe('api-client interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: null,
      profile: null,
      session: null,
      isAuthenticated: false,
      isSessionExpired: false,
      isLoading: false,
    })
  })

  describe('request interceptor', () => {
    it('attaches Authorization: Bearer <accessToken> from the auth store', () => {
      // Arrange
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })
      const config = { headers: {} as Record<string, string> }

      // Act
      const result = getRequestInterceptor()(config) as { headers: Record<string, string> }

      // Assert
      expect(result.headers.Authorization).toBe('Bearer access-1')
    })

    it('leaves the header untouched when no session exists', () => {
      // Act
      const result = getRequestInterceptor()({ headers: {} }) as { headers: Record<string, string> }

      // Assert
      expect(result.headers.Authorization).toBeUndefined()
    })
  })

  describe('401 refresh flow', () => {
    it('refreshes with the stored refreshToken, updates the store, and retries', async () => {
      // Arrange
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })
      const newSession: SiagaSession = {
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        tokenType: 'bearer',
        expiresIn: 3600,
      }
      mocks.post.mockResolvedValue({ data: { data: { session: newSession } } })
      mocks.instance.mockResolvedValue({ metaData: { status: true }, data: { ok: true } })
      const originalRequest = { url: 'apps/assisted/search', headers: {} }
      const error = { config: originalRequest, response: { status: 401 }, message: '401' }

      // Act
      const result = await getResponseErrorInterceptor()(error)

      // Assert — refresh posts the token per the contract (body, not cookie)
      expect(mocks.post).toHaveBeenCalledWith('/api/v1/apps/siaga/auth/refresh', {
        refreshToken: 'refresh-1',
      })
      expect(useAuthStore.getState().session).toEqual(newSession)
      expect(mocks.instance).toHaveBeenCalledWith(originalRequest)
      expect(result).toEqual({ metaData: { status: true }, data: { ok: true } })
    })

    it('marks the session expired (keeps profile) when the refresh fails', async () => {
      // Arrange
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })
      mocks.post.mockRejectedValue(new Error('refresh token invalid'))
      const error = {
        config: { url: 'apps/assisted/search', headers: {} },
        response: { status: 401 },
        message: '401',
      }

      // Act + Assert
      await expect(getResponseErrorInterceptor()(error)).rejects.toBeInstanceOf(Error)
      const state = useAuthStore.getState()
      expect(state.isSessionExpired).toBe(true)
      expect(state.isAuthenticated).toBe(true)
      expect(state.profile).toEqual(PROFILE)
      expect(state.session).toBeNull()
    })

    it('never triggers refresh for the login endpoint (401 = wrong credentials)', async () => {
      // Arrange
      useAuthStore.getState().setAuth({ session: SESSION, profile: PROFILE })
      const error = {
        config: { url: 'apps/siaga/auth/login', headers: {} },
        response: {
          status: 401,
          data: { metaData: { message: 'Email atau kata sandi tidak cocok.' } },
        },
        message: '401',
      }

      // Act + Assert
      await expect(getResponseErrorInterceptor()(error)).rejects.toMatchObject({
        status: 401,
        message: 'Email atau kata sandi tidak cocok.',
      })
      expect(mocks.post).not.toHaveBeenCalled()
    })
  })

  describe('error normalization', () => {
    it('exposes status, envelope message, and additionalInfo for 423 lockouts', async () => {
      // Arrange
      const error = {
        config: { url: 'apps/siaga/auth/login', headers: {} },
        response: {
          status: 423,
          data: {
            metaData: { status: false, responseCode: 423, message: 'Terlalu banyak percobaan.', executionTime: 2 },
            data: null,
            additionalInfo: { retryAfterSeconds: 540, lockedUntil: '2026-07-26T10:00:00Z' },
            copyright: 'x',
          },
        },
        message: 'Request failed with status code 423',
      }

      // Act + Assert
      await expect(getResponseErrorInterceptor()(error)).rejects.toMatchObject({
        status: 423,
        message: 'Terlalu banyak percobaan.',
        additionalInfo: { retryAfterSeconds: 540, lockedUntil: '2026-07-26T10:00:00Z' },
      })
    })
  })
})
