import { useFilterEmitter } from '@/modules/dynamic-filter'
import { useFilterStore } from '@/modules/dynamic-filter/store/filter.store'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { cn } from '@/utils/cn'

interface ChipOption {
  label: string
  value: string
}

interface ChipGroupProps {
  id: string
  filterKey: string
  options: ChipOption[]
  config?: WidgetFilterConfig
  /** Leading chip that clears the key (single-select semantics). */
  allLabel?: string
}

/**
 * Single-select chip row for touch-first pages (mobile filter bars).
 * Added per the module's extension rule (filter-rules.md § Adding a new
 * filter component): none of the existing 18 components renders a large
 * tap-target chip strip. State lives in the filter store — the active value
 * is read from `globalFilters`, never local state; tapping the active chip
 * (or the "all" chip) clears the key via `clearFilterKey`.
 */
export function ChipGroup({ id, filterKey, options, config, allLabel = 'Semua' }: ChipGroupProps) {
  const activeValue = useFilterStore(
    (s) => s.globalFilters.find((f) => f.key === filterKey)?.value as string | undefined
  )
  const clearFilterKey = useFilterStore((s) => s.clearFilterKey)
  const { emit } = useFilterEmitter({
    emitterId: id,
    scope: config?.scope ?? 'all',
    targets: config?.targets,
  })

  function handleSelect(value: string) {
    if (activeValue === value) {
      clearFilterKey(filterKey)
    } else {
      emit(filterKey, value)
    }
  }

  const chipClasses = (isActive: boolean) =>
    cn(
      'min-h-11 rounded-full border px-4 py-2 text-body-sm font-medium transition-colors',
      isActive
        ? 'border-primary-base bg-primary-base text-font-on-accent'
        : 'border-border-primary bg-background-primary text-font-primary hover:bg-muted'
    )

  return (
    <div id={id} role="group" className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => clearFilterKey(filterKey)}
        aria-pressed={activeValue === undefined}
        className={chipClasses(activeValue === undefined)}
      >
        {allLabel}
      </button>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleSelect(option.value)}
          aria-pressed={activeValue === option.value}
          data-testid={`chip-${filterKey}-${option.value}`}
          className={chipClasses(activeValue === option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
