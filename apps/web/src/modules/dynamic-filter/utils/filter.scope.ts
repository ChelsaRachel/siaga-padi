import { FilterState } from '../types'

export function isApplicable(filter: FilterState, widgetId: string): boolean {
  if (filter.scope === 'all') return true
  if (filter.scope === 'exclude-self') return filter.targets?.[0] !== widgetId
  if (filter.scope === 'partial') return filter.targets?.includes(widgetId) ?? false
  return false
}
