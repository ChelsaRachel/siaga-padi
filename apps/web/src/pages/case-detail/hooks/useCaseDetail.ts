import { useCallback, useEffect, useState } from 'react'
import { casesService } from '@/services/cases.service'
import type { SiagaCase, SiagaCaseEvent } from '@/types/siaga-case'
import { parseApiError } from '@/utils/parse-api-error'

const HTTP_NOT_FOUND = 404

interface UseCaseDetailResult {
  caseData: SiagaCase | null
  events: SiagaCaseEvent[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Detail + timeline fetch, refreshed on every open (fetch on mount) so the
 * staged progress reflects the latest server status.
 */
export function useCaseDetail(caseId: string | undefined): UseCaseDetailResult {
  const [caseData, setCaseData] = useState<SiagaCase | null>(null)
  const [events, setEvents] = useState<SiagaCaseEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!caseId) {
      setError('Kasus tidak ditemukan.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const [caseResponse, timelineResponse] = await Promise.all([
        casesService.getOne(caseId),
        casesService.getTimeline(caseId),
      ])
      setCaseData(caseResponse?.data ?? null)
      setEvents(Array.isArray(timelineResponse?.data) ? timelineResponse.data : [])
    } catch (fetchError: unknown) {
      const parsed = parseApiError(fetchError)
      setError(parsed.status === HTTP_NOT_FOUND ? 'Kasus tidak ditemukan.' : parsed.message)
    } finally {
      setIsLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { caseData, events, isLoading, error, refresh }
}
