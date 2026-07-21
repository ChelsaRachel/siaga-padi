import { useFilterStore } from '../store/filter.store'
import { FilterState } from '../types'

export function useResolvedFilters(widgetId: string): FilterState[] {
  return useFilterStore((s) => s.resolve(widgetId))
}

// Convenience: return as plain key-value record for query params
export function useResolvedFilterParams(widgetId: string): Record<string, unknown> {
  const filters = useResolvedFilters(widgetId)
  return Object.fromEntries(filters.map((f) => [f.key, f.value]))
}
