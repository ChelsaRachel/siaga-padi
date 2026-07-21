export type FilterSource = 'url' | 'global' | 'widget'
export type FilterScope = 'all' | 'partial' | 'exclude-self'

export interface FilterState {
  key: string
  value: unknown
  source: FilterSource
  scope: FilterScope
  targets?: string[]
}

export interface FilterEvent {
  emitterId: string
  filters: FilterState[]
}

export interface WidgetFilterConfig {
  scope?: FilterScope
  targets?: string[]
  useAsFilter?: boolean
  emitKey?: string
  excludeSelf?: boolean
  listenFrom?: string[]
  listenGlobal?: boolean
  listenUrl?: boolean
}

export type WidgetFilterMap = Record<string, WidgetFilterConfig>
