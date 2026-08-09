import { create } from 'zustand'
import {
  kbService,
  type IKbApprovePayload,
  type IKbChunkFilters,
  type IKbRetrievalPayload,
} from '@/services/kb.service'
import type { KbChunkDiff, KbRetrievalResult, SiagaKbChunk } from '@/types/siaga-kb'
import { parseApiError } from '@/utils/parse-api-error'

export const KB_REVIEW_PAGE_LIMIT = 20

/**
 * Reviewer workspace state: the approval queue, the version diff, and the
 * retrieval test.
 *
 * A decision always refetches the queue rather than patching the row locally —
 * approving a chunk can change the SOURCE status and the pending tally too, and
 * a stale queue is how a reviewer ends up deciding the same chunk twice.
 */
interface KbReviewStore {
  chunks: SiagaKbChunk[]
  totalItem: number
  page: number
  totalPage: number
  selectedChunkId: string | null
  filters: IKbChunkFilters
  diff: KbChunkDiff | null
  retrieval: KbRetrievalResult | null
  isLoading: boolean
  isDeciding: boolean
  isTesting: boolean
  error: string | null
  decisionError: string | null
  setFilters: (filters: IKbChunkFilters) => void
  selectChunk: (chunkId: string | null) => void
  fetchChunks: (page?: number) => Promise<void>
  approveChunk: (chunkId: string, payload: IKbApprovePayload) => Promise<boolean>
  rejectChunk: (chunkId: string, reason: string) => Promise<boolean>
  fetchDiff: (refCode: string) => Promise<void>
  clearDiff: () => void
  runRetrievalTest: (payload: IKbRetrievalPayload) => Promise<void>
  clearErrors: () => void
}

export const useKbReviewStore = create<KbReviewStore>((set, get) => ({
  chunks: [],
  totalItem: 0,
  page: 1,
  totalPage: 1,
  selectedChunkId: null,
  filters: { approvalStatus: 'menunggu' },
  diff: null,
  retrieval: null,
  isLoading: false,
  isDeciding: false,
  isTesting: false,
  error: null,
  decisionError: null,

  setFilters: (filters) => set({ filters, selectedChunkId: null }),

  selectChunk: (chunkId) => set({ selectedChunkId: chunkId, decisionError: null }),

  fetchChunks: async (page = 1) => {
    set({ isLoading: true, error: null })
    try {
      const response = await kbService.getAllChunks({
        page,
        limit: KB_REVIEW_PAGE_LIMIT,
        filters: get().filters,
      })
      const pagination = response?.metaData?.pagination
      const rows = Array.isArray(response?.data) ? response.data : []
      const { selectedChunkId } = get()
      const isSelectionStillListed = rows.some(
        (chunk) => chunk.chunkId === selectedChunkId
      )
      set({
        chunks: rows,
        page,
        totalPage: pagination?.totalPages ?? 1,
        totalItem: pagination?.totalElements ?? rows.length,
        selectedChunkId: isSelectionStillListed
          ? selectedChunkId
          : (rows[0]?.chunkId ?? null),
      })
    } catch (fetchError: unknown) {
      set({ error: parseApiError(fetchError).message })
    } finally {
      set({ isLoading: false })
    }
  },

  approveChunk: async (chunkId, payload) => {
    set({ isDeciding: true, decisionError: null })
    try {
      await kbService.approveChunk(chunkId, payload)
      await get().fetchChunks(get().page)
      return true
    } catch (approveError: unknown) {
      // The policy-flag refusal arrives here — surface the API message verbatim.
      set({ decisionError: parseApiError(approveError).message })
      return false
    } finally {
      set({ isDeciding: false })
    }
  },

  rejectChunk: async (chunkId, reason) => {
    set({ isDeciding: true, decisionError: null })
    try {
      await kbService.rejectChunk(chunkId, reason)
      await get().fetchChunks(get().page)
      return true
    } catch (rejectError: unknown) {
      set({ decisionError: parseApiError(rejectError).message })
      return false
    } finally {
      set({ isDeciding: false })
    }
  },

  fetchDiff: async (refCode) => {
    set({ error: null })
    try {
      const response = await kbService.getChunkDiff(refCode)
      set({ diff: response?.data ?? null })
    } catch (diffError: unknown) {
      set({ error: parseApiError(diffError).message, diff: null })
    }
  },

  clearDiff: () => set({ diff: null }),

  runRetrievalTest: async (payload) => {
    set({ isTesting: true, error: null })
    try {
      const response = await kbService.retrievalTest(payload)
      set({ retrieval: response?.data ?? null })
    } catch (testError: unknown) {
      set({ error: parseApiError(testError).message, retrieval: null })
    } finally {
      set({ isTesting: false })
    }
  },

  clearErrors: () => set({ error: null, decisionError: null }),
}))
