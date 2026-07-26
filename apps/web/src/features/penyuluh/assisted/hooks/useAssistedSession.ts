import { useState } from 'react'
import { assistedService, type IAssistedStartPayload } from '@/services/assisted.service'
import { useAssistedStore } from '@/stores/useAssistedStore'
import { parseApiError } from '@/utils/parse-api-error'

const HTTP_BAD_REQUEST = 400

/**
 * Start/end lifecycle for the assisted ("atas nama") session.
 * All API calls live here — components stay presentational; the resulting
 * state lives in `useAssistedStore` so every screen (and later sprints'
 * case wizard) can read the active subject + sessionId.
 */
export function useAssistedSession() {
  const setActiveSession = useAssistedStore((state) => state.setActiveSession)
  const clearSession = useAssistedStore((state) => state.clearSession)
  const [isStarting, setIsStarting] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startSession = async (payload: IAssistedStartPayload): Promise<boolean> => {
    setIsStarting(true)
    setError(null)
    try {
      const response = await assistedService.start(payload)
      const result = response?.data
      if (!result?.sessionId) {
        setError('Sesi pendampingan tidak dapat dimulai. Coba lagi.')
        return false
      }
      setActiveSession({
        sessionId: result.sessionId,
        subject: {
          profileId: result.subjectProfileId,
          displayName: result.subjectDisplayName,
        },
        consentMethod: result.consentMethod,
        startedAt: result.startedAt,
      })
      return true
    } catch (startError: unknown) {
      setError(parseApiError(startError).message)
      return false
    } finally {
      setIsStarting(false)
    }
  }

  const endSession = async (): Promise<boolean> => {
    const sessionId = useAssistedStore.getState().sessionId
    if (!sessionId) {
      clearSession()
      return true
    }

    setIsEnding(true)
    setError(null)
    try {
      await assistedService.end({ sessionId })
      clearSession()
      return true
    } catch (endError: unknown) {
      const parsed = parseApiError(endError)
      if (parsed.status === HTTP_BAD_REQUEST) {
        // Session already ended server-side — clear the stale local state.
        clearSession()
        return true
      }
      setError(parsed.message)
      return false
    } finally {
      setIsEnding(false)
    }
  }

  return { startSession, endSession, isStarting, isEnding, error }
}
