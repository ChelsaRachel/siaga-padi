import { describe, expect, it } from 'vitest'
import {
  buildLoginErrorMessage,
  LOGIN_CONNECTION_MESSAGE,
  LOGIN_FAILED_MESSAGE,
} from './login-error'

describe('buildLoginErrorMessage', () => {
  it('parses 423 lockout into "coba lagi dalam X menit" from retryAfterSeconds', () => {
    // Arrange — normalized rejection from api-client
    const error = {
      status: 423,
      message: 'Terlalu banyak percobaan.',
      additionalInfo: { retryAfterSeconds: 540, lockedUntil: '2026-07-26T10:00:00Z' },
    }

    // Act + Assert — 540s rounds up to 9 minutes
    expect(buildLoginErrorMessage(error)).toBe(
      'Terlalu banyak percobaan masuk. Coba lagi dalam 9 menit.'
    )
  })

  it('rounds sub-minute lockouts up to 1 menit', () => {
    const error = { status: 423, message: 'x', additionalInfo: { retryAfterSeconds: 20 } }
    expect(buildLoginErrorMessage(error)).toBe(
      'Terlalu banyak percobaan masuk. Coba lagi dalam 1 menit.'
    )
  })

  it('falls back to a generic lockout message when retryAfterSeconds is missing', () => {
    const error = { status: 423, message: 'x', additionalInfo: null }
    expect(buildLoginErrorMessage(error)).toBe(
      'Terlalu banyak percobaan masuk. Coba lagi beberapa saat lagi.'
    )
  })

  it('returns ONE fixed message on 401 — identical whether or not the account exists', () => {
    // Two different server payloads must produce the exact same UI copy.
    const unknownAccount = { status: 401, message: 'account not found' }
    const wrongPassword = { status: 401, message: 'wrong password for user' }

    expect(buildLoginErrorMessage(unknownAccount)).toBe(LOGIN_FAILED_MESSAGE)
    expect(buildLoginErrorMessage(wrongPassword)).toBe(LOGIN_FAILED_MESSAGE)
  })

  it('returns the connection message when no HTTP status is available (network error)', () => {
    expect(buildLoginErrorMessage(new Error('Network Error'))).toBe(LOGIN_CONNECTION_MESSAGE)
  })

  it('passes through the server message for other statuses (e.g. 500)', () => {
    const error = { status: 500, message: 'Terjadi gangguan pada server.' }
    expect(buildLoginErrorMessage(error)).toBe('Terjadi gangguan pada server.')
  })
})
