import { useState } from 'react'
import { assistedService, type IAssistedSearchResult } from '@/services/assisted.service'
import { parseApiError } from '@/utils/parse-api-error'

type TSearchStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Petani search within the penyuluh's binaan (server-enforced scope).
 * Explicit 4-state model so the dialog can render loading / error / empty.
 */
export function useAssistedSearch() {
  const [status, setStatus] = useState<TSearchStatus>('idle')
  const [results, setResults] = useState<IAssistedSearchResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const search = async (query: string): Promise<void> => {
    setStatus('loading')
    setError(null)
    try {
      const response = await assistedService.search({ query })
      setResults(response?.data ?? [])
      setStatus('success')
    } catch (searchError: unknown) {
      setResults([])
      setError(parseApiError(searchError).message)
      setStatus('error')
    }
  }

  const reset = (): void => {
    setStatus('idle')
    setResults([])
    setError(null)
  }

  return { status, results, error, search, reset }
}
