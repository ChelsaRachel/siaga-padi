import { create } from 'zustand'

interface Pagination {
  page: number
  size: number
  totalPages?: number
  totalElements?: number
}

interface DataDisplayState {
  data: unknown[]
  loading: boolean
  error: string | null
  pagination: Pagination
  hasMore: boolean
  onDeleteRequest?: (row: Record<string, unknown>) => void
  onEditRequest?: (row: Record<string, unknown>) => void
  changePage?: (page: number) => void
  changeSize?: (size: number) => void
  fetchNext?: () => void
  setData: (data: unknown[]) => void
  appendData: (data: unknown[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setPagination: (pagination: Partial<Pagination>) => void
  setHasMore: (hasMore: boolean) => void
}

const initialState = {
  data: [],
  loading: false,
  error: null,
  pagination: { page: 1, size: 10, totalPages: 0, totalElements: 0 },
  hasMore: true,
}

export const useDataDisplayStore = create<DataDisplayState>((set) => ({
  ...initialState,
  setData: (data) => set({ data }),
  appendData: (data) => set((state) => ({ data: [...state.data, ...data] })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setPagination: (pagination) =>
    set((state) => ({ pagination: { ...state.pagination, ...pagination } })),
  setHasMore: (hasMore) => set({ hasMore }),
}))
