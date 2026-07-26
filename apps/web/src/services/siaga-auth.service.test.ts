import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api-client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import apiClient from './api-client'
import { API_ENDPOINTS } from './api-endpoints'
import { siagaAuthService } from './siaga-auth.service'

const LOGIN_ENVELOPE = {
  metaData: { status: true, executionTime: 5, responseCode: 200, message: 'Success' },
  data: {
    session: { accessToken: 'a1', refreshToken: 'r1', tokenType: 'bearer', expiresIn: 3600 },
    profile: { profileId: 'p1', userId: 'u1', displayName: 'Pak Budi', role: 'petani' },
  },
  additionalInfo: null,
  copyright: 'siaga-padi',
}

describe('siagaAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('login posts credentials to apps/siaga/auth/login and returns the envelope', async () => {
    // Arrange
    vi.mocked(apiClient.post).mockResolvedValue(LOGIN_ENVELOPE)

    // Act
    const result = await siagaAuthService.login({ email: 'budi@tani.id', password: 'rahasia' })

    // Assert
    expect(apiClient.post).toHaveBeenCalledWith('apps/siaga/auth/login', {
      email: 'budi@tani.id',
      password: 'rahasia',
    })
    expect(result.data.session.accessToken).toBe('a1')
    expect(result.data.profile.displayName).toBe('Pak Budi')
  })

  it('refresh posts the stored refreshToken per the contract', async () => {
    // Arrange
    vi.mocked(apiClient.post).mockResolvedValue({
      ...LOGIN_ENVELOPE,
      data: { session: { accessToken: 'a2', refreshToken: 'r2', tokenType: 'bearer', expiresIn: 3600 } },
    })

    // Act
    const result = await siagaAuthService.refresh({ refreshToken: 'r1' })

    // Assert
    expect(apiClient.post).toHaveBeenCalledWith('apps/siaga/auth/refresh', { refreshToken: 'r1' })
    expect(result.data.session.accessToken).toBe('a2')
  })

  it('me issues a GET to apps/siaga/auth/me', async () => {
    // Arrange
    vi.mocked(apiClient.get).mockResolvedValue({ ...LOGIN_ENVELOPE, data: LOGIN_ENVELOPE.data.profile })

    // Act
    await siagaAuthService.me()

    // Assert
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SIAGA_AUTH.ME)
  })

  it('propagates normalized errors (e.g. 423 lockout) to the caller', async () => {
    // Arrange — shape produced by the api-client interceptor
    const lockoutError = {
      status: 423,
      message: 'Terlalu banyak percobaan.',
      additionalInfo: { retryAfterSeconds: 540, lockedUntil: '2026-07-26T10:00:00Z' },
    }
    vi.mocked(apiClient.post).mockRejectedValue(lockoutError)

    // Act + Assert
    await expect(
      siagaAuthService.login({ email: 'x@y.id', password: 'salah' })
    ).rejects.toMatchObject({ status: 423, additionalInfo: { retryAfterSeconds: 540 } })
  })
})
