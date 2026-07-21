import { create } from 'zustand'
import { FilterEvent, FilterState, WidgetFilterMap } from '../types'
import { mergeFilters } from '../utils/filter.merge'

interface FilterStore {
  urlFilters: FilterState[]
  globalFilters: FilterState[]
  widgetFilters: Map<string, FilterState[]>
  filterMap: WidgetFilterMap

  setUrlFilters: (filters: FilterState[]) => void
  setFilterMap: (map: WidgetFilterMap) => void
  dispatch: (event: FilterEvent) => void
  clearFilterKey: (key: string) => void
  resolve: (widgetId: string) => FilterState[]
  reset: (widgetId?: string) => void
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  urlFilters: [],
  globalFilters: [],
  widgetFilters: new Map(),
  filterMap: {},

  setUrlFilters: (filters) => set({ urlFilters: filters }),

  setFilterMap: (map) => set({ filterMap: map }),

  dispatch: (event) => {
    const { emitterId, filters } = event
    const { filterMap } = get()
    const config = filterMap[emitterId]

    set((state) => {
      const scope = config?.scope ?? 'all'

      if (scope === 'all' || (scope === 'partial' && !config?.targets?.length)) {
        // Global filter — apply ke semua widget
        const next = new Map(state.globalFilters.map((f) => [f.key, f]))
        for (const f of filters) next.set(f.key, { ...f, scope, targets: config?.targets })
        return { globalFilters: Array.from(next.values()) }
      }

      if (scope === 'partial' || scope === 'exclude-self') {
        // Partial scope — simpan di global dengan targets terdefinisi
        const next = new Map(state.globalFilters.map((f) => [f.key, f]))
        for (const f of filters) {
          next.set(f.key, { ...f, scope, targets: config?.targets })
        }
        return { globalFilters: Array.from(next.values()) }
      }

      // Widget-to-widget (nested / use-as-filter dengan targets eksplisit)
      const targets = config?.targets ?? []
      const widgetFilters = new Map(state.widgetFilters)
      for (const targetId of targets) {
        const existing = new Map((widgetFilters.get(targetId) ?? []).map((f) => [f.key, f]))
        for (const f of filters) existing.set(f.key, { ...f, source: 'widget' })
        widgetFilters.set(targetId, Array.from(existing.values()))
      }
      return { widgetFilters }
    })
  },

  clearFilterKey: (key) => {
    set((state) => {
      const globalFilters = state.globalFilters.filter((f) => f.key !== key)
      const widgetFilters = new Map(state.widgetFilters)
      widgetFilters.forEach((filters, widgetId) => {
        widgetFilters.set(widgetId, filters.filter((f) => f.key !== key))
      })
      return { globalFilters, widgetFilters }
    })
  },

  resolve: (widgetId) => {
    const { urlFilters, globalFilters, widgetFilters } = get()
    return mergeFilters(widgetId, urlFilters, globalFilters, widgetFilters)
  },

  reset: (widgetId) => {
    if (widgetId) {
      set((state) => {
        const widgetFilters = new Map(state.widgetFilters)
        widgetFilters.delete(widgetId)
        return { widgetFilters }
      })
    } else {
      set({ urlFilters: [], globalFilters: [], widgetFilters: new Map() })
    }
  },
}))
