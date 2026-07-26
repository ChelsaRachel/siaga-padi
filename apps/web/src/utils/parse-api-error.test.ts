import { describe, expect, it } from 'vitest'
import { GENERIC_ERROR_MESSAGE, parseApiError } from './parse-api-error'

describe('parseApiError', () => {
  it('returns the generic message for non-object errors', () => {
    // Arrange
    const error = 'boom'

    // Act
    const parsed = parseApiError(error)

    // Assert
    expect(parsed).toEqual({ status: null, message: GENERIC_ERROR_MESSAGE, retryAfterSeconds: null })
  })

  it('reads the normalized shape produced by api-client (status + message + additionalInfo)', () => {
    // Arrange — shape rejected by the api-client response interceptor
    const error = {
      status: 423,
      message: 'Akun terkunci sementara.',
      additionalInfo: { retryAfterSeconds: 300, lockedUntil: '2026-07-26T10:00:00Z' },
    }

    // Act
    const parsed = parseApiError(error)

    // Assert
    expect(parsed.status).toBe(423)
    expect(parsed.message).toBe('Akun terkunci sementara.')
    expect(parsed.retryAfterSeconds).toBe(300)
  })

  it('falls back to the raw axios error envelope (response.data.metaData.message)', () => {
    // Arrange — untouched AxiosError-like object
    const error = {
      response: {
        status: 423,
        data: {
          metaData: { status: false, responseCode: 423, message: 'Coba lagi nanti.', executionTime: 1 },
          data: null,
          additionalInfo: { retryAfterSeconds: 120 },
          copyright: 'x',
        },
      },
    }

    // Act
    const parsed = parseApiError(error)

    // Assert
    expect(parsed.status).toBe(423)
    expect(parsed.message).toBe('Coba lagi nanti.')
    expect(parsed.retryAfterSeconds).toBe(120)
  })

  it('prefers the envelope message over the generic axios message', () => {
    // Arrange
    const error = {
      message: 'Request failed with status code 401',
      response: {
        status: 401,
        data: { metaData: { message: 'Email atau kata sandi tidak cocok.' } },
      },
    }

    // Act
    const parsed = parseApiError(error)

    // Assert
    expect(parsed.message).toBe('Email atau kata sandi tidak cocok.')
  })

  it('ignores malformed retryAfterSeconds values', () => {
    // Arrange
    const error = { status: 423, message: 'x', additionalInfo: { retryAfterSeconds: 'soon' } }

    // Act
    const parsed = parseApiError(error)

    // Assert
    expect(parsed.retryAfterSeconds).toBeNull()
  })
})
