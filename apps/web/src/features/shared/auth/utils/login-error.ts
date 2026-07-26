import { parseApiError } from '@/utils/parse-api-error'

const HTTP_UNAUTHORIZED = 401
const HTTP_LOCKED = 423
const SECONDS_PER_MINUTE = 60

/** Fixed string — never varies with account existence (anti-enumeration). */
export const LOGIN_FAILED_MESSAGE = 'Email atau kata sandi tidak cocok.'
export const LOGIN_CONNECTION_MESSAGE =
  'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.'

function toRetryMinutes(retryAfterSeconds: number): number {
  return Math.max(1, Math.ceil(retryAfterSeconds / SECONDS_PER_MINUTE))
}

/**
 * Maps a login failure to safe Indonesian copy:
 * - 423 → lockout with "coba lagi dalam X menit" from additionalInfo.retryAfterSeconds
 * - 401 → one generic message, identical whether or not the account exists
 * - network/other → generic connection message
 */
export function buildLoginErrorMessage(error: unknown): string {
  const parsed = parseApiError(error)

  if (parsed.status === HTTP_LOCKED) {
    const minutes = parsed.retryAfterSeconds !== null ? toRetryMinutes(parsed.retryAfterSeconds) : null
    return minutes !== null
      ? `Terlalu banyak percobaan masuk. Coba lagi dalam ${minutes} menit.`
      : 'Terlalu banyak percobaan masuk. Coba lagi beberapa saat lagi.'
  }

  if (parsed.status === HTTP_UNAUTHORIZED) {
    return LOGIN_FAILED_MESSAGE
  }

  return parsed.status === null ? LOGIN_CONNECTION_MESSAGE : parsed.message
}
