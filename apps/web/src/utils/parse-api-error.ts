/**
 * Normalizes any rejected value coming out of `api-client.ts` (or a raw
 * axios error) into a safe, typed shape the UI can consume.
 *
 * The api-client response interceptor rejects with a spread AxiosError that
 * carries `status`, `message` (already resolved from `metaData.message`),
 * `additionalInfo`, and the original `response`. This parser accepts both
 * that normalized shape and an untouched AxiosError, always narrowing from
 * `unknown` — never trusting external data.
 */

export const GENERIC_ERROR_MESSAGE = 'Terjadi kesalahan. Silakan coba lagi.'

export interface IParsedApiError {
  status: number | null
  message: string
  /** Populated on HTTP 423 lockout responses (`additionalInfo.retryAfterSeconds`). */
  retryAfterSeconds: number | null
}

interface IErrorLike {
  status?: unknown
  message?: unknown
  additionalInfo?: unknown
  response?: {
    status?: unknown
    data?: {
      metaData?: { message?: unknown }
      additionalInfo?: unknown
    }
  }
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readRetryAfterSeconds(additionalInfo: unknown): number | null {
  if (typeof additionalInfo !== 'object' || additionalInfo === null) {
    return null
  }
  const { retryAfterSeconds } = additionalInfo as { retryAfterSeconds?: unknown }
  return typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)
    ? retryAfterSeconds
    : null
}

export function parseApiError(error: unknown): IParsedApiError {
  if (typeof error !== 'object' || error === null) {
    return { status: null, message: GENERIC_ERROR_MESSAGE, retryAfterSeconds: null }
  }

  const errorLike = error as IErrorLike
  const status =
    typeof errorLike.status === 'number'
      ? errorLike.status
      : typeof errorLike.response?.status === 'number'
        ? errorLike.response.status
        : null

  const additionalInfo = errorLike.additionalInfo ?? errorLike.response?.data?.additionalInfo
  const message =
    asNonEmptyString(errorLike.response?.data?.metaData?.message) ??
    asNonEmptyString(errorLike.message) ??
    GENERIC_ERROR_MESSAGE

  return { status, message, retryAfterSeconds: readRetryAfterSeconds(additionalInfo) }
}
