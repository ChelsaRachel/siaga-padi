import { create } from 'zustand'
import { casesService, type ICaseListFilters } from '@/services/cases.service'
import type { SiagaCase } from '@/types/siaga-case'
import { parseApiError } from '@/utils/parse-api-error'

export const CASE_HISTORY_PAGE_LIMIT = 10

/**
 * Riwayat list state — POST apps/cases/get-all with the contract FindDTO
 * `{ page, limit, filters }` and `metaData.pagination` for load-more.
 *
 * The shared `modules/data-display` DataDisplay is deliberately NOT used
 * here: its FindDTO sends `{ page, size }` (flat) while this pinned contract
 * requires `{ page, limit, filters: {…} }`, and its pagination reader expects
 * different metadata keys. Consuming the contract exactly wins (see
 * docs/api-spec-case.md); the loading/error/empty/load-more behaviors below
 * follow the reactjs-data-display patterns instead.
 */
interface CaseHistoryStore {
  cases: SiagaCase[]
  page: number
  totalPage: number
  totalItem: number
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  /** Page 1 fetch — replaces the list (used on open and on filter change). */
  fetchCases: (filters: ICaseListFilters) => Promise<void>
  /** Next-page fetch — appends immutably. */
  fetchMore: (filters: ICaseListFilters) => Promise<void>
}

export const useCaseHistoryStore = create<CaseHistoryStore>((set, get) => ({
  cases: [],
  page: 1,
  totalPage: 1,
  totalItem: 0,
  isLoading: false,
  isLoadingMore: false,
  error: null,

  fetchCases: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const response = await casesService.getAll({ page: 1, limit: CASE_HISTORY_PAGE_LIMIT, filters })
      const pagination = response?.metaData?.pagination
      const rows = Array.isArray(response?.data) ? response.data : []
      set({
        cases: rows,
        page: 1,
        totalPage: pagination?.totalPages ?? 1,
        totalItem: pagination?.totalElements ?? rows.length,
      })
    } catch (fetchError: unknown) {
      set({ error: parseApiError(fetchError).message })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchMore: async (filters) => {
    const { page, totalPage, isLoadingMore } = get()
    if (isLoadingMore || page >= totalPage) {
      return
    }
    set({ isLoadingMore: true, error: null })
    try {
      const nextPage = page + 1
      const response = await casesService.getAll({
        page: nextPage,
        limit: CASE_HISTORY_PAGE_LIMIT,
        filters,
      })
      const pagination = response?.metaData?.pagination
      const nextCases = Array.isArray(response?.data) ? response.data : []
      set((state) => ({
        cases: [...state.cases, ...nextCases],
        page: nextPage,
        totalPage: pagination?.totalPages ?? state.totalPage,
        totalItem: pagination?.totalElements ?? state.totalItem,
      }))
    } catch (fetchError: unknown) {
      set({ error: parseApiError(fetchError).message })
    } finally {
      set({ isLoadingMore: false })
    }
  },
}))
