import { create } from 'zustand'
import { kbService, type IKbSourceFilters, type IKbSourceRegisterPayload } from '@/services/kb.service'
import type { KbIngestResult, SiagaKbSource } from '@/types/siaga-kb'
import { parseApiError } from '@/utils/parse-api-error'

export const KB_CATALOG_PAGE_LIMIT = 10

/**
 * Source catalog state — POST apps/kb/sources/get-all with the contract
 * FindDTO `{ page, limit, filters }` and `metaData.pagination`.
 *
 * `lastIngest` is kept so the page can answer the question the admin actually
 * has after submitting the form — "how many chunks are waiting for review?" —
 * without a second round-trip.
 */
interface KbCatalogStore {
  sources: SiagaKbSource[]
  page: number
  totalPage: number
  totalItem: number
  filters: IKbSourceFilters
  isLoading: boolean
  isSaving: boolean
  error: string | null
  lastIngest: KbIngestResult | null
  setFilters: (filters: IKbSourceFilters) => void
  fetchSources: (page?: number) => Promise<void>
  registerSource: (payload: IKbSourceRegisterPayload) => Promise<KbIngestResult | null>
  ingestDocument: (
    sourceId: string,
    input: { file?: Blob; fileName?: string; content?: string }
  ) => Promise<KbIngestResult | null>
  retireSource: (sourceId: string, reason?: string) => Promise<boolean>
  clearError: () => void
  clearLastIngest: () => void
}

export const useKbCatalogStore = create<KbCatalogStore>((set, get) => ({
  sources: [],
  page: 1,
  totalPage: 1,
  totalItem: 0,
  filters: {},
  isLoading: false,
  isSaving: false,
  error: null,
  lastIngest: null,

  setFilters: (filters) => {
    set({ filters })
  },

  fetchSources: async (page = 1) => {
    set({ isLoading: true, error: null })
    try {
      const response = await kbService.getAllSources({
        page,
        limit: KB_CATALOG_PAGE_LIMIT,
        filters: get().filters,
      })
      const pagination = response?.metaData?.pagination
      const rows = Array.isArray(response?.data) ? response.data : []
      set({
        sources: rows,
        page,
        totalPage: pagination?.totalPages ?? 1,
        totalItem: pagination?.totalElements ?? rows.length,
      })
    } catch (fetchError: unknown) {
      set({ error: parseApiError(fetchError).message })
    } finally {
      set({ isLoading: false })
    }
  },

  registerSource: async (payload) => {
    set({ isSaving: true, error: null })
    try {
      const response = await kbService.registerSource(payload)
      const ingest = response?.data?.ingest ?? null
      set({ lastIngest: ingest })
      await get().fetchSources(1)
      return ingest
    } catch (saveError: unknown) {
      set({ error: parseApiError(saveError).message })
      return null
    } finally {
      set({ isSaving: false })
    }
  },

  ingestDocument: async (sourceId, input) => {
    set({ isSaving: true, error: null })
    try {
      const response = await kbService.ingestSource(sourceId, input)
      const ingest = response?.data ?? null
      set({ lastIngest: ingest })
      await get().fetchSources(get().page)
      return ingest
    } catch (ingestError: unknown) {
      set({ error: parseApiError(ingestError).message })
      return null
    } finally {
      set({ isSaving: false })
    }
  },

  retireSource: async (sourceId, reason) => {
    set({ isSaving: true, error: null })
    try {
      await kbService.retireSource(sourceId, reason)
      await get().fetchSources(get().page)
      return true
    } catch (retireError: unknown) {
      set({ error: parseApiError(retireError).message })
      return false
    } finally {
      set({ isSaving: false })
    }
  },

  clearError: () => set({ error: null }),
  clearLastIngest: () => set({ lastIngest: null }),
}))
