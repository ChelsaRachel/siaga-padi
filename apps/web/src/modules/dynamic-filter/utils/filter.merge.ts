import { FilterState } from '../types'
import { isApplicable } from './filter.scope'

// Priority: widgetFilters > globalFilters > urlFilters
// Higher index = higher priority, last write wins per key
export function mergeFilters(
  widgetId: string,
  urlFilters: FilterState[],
  globalFilters: FilterState[],
  widgetFilters: Map<string, FilterState[]>,
): FilterState[] {
  const result = new Map<string, FilterState>()

  for (const f of urlFilters) {
    result.set(f.key, f)
  }

  for (const f of globalFilters) {
    if (isApplicable(f, widgetId)) result.set(f.key, f)
  }

  const own = widgetFilters.get(widgetId) ?? []
  for (const f of own) {
    result.set(f.key, f)
  }

  return Array.from(result.values())
}
