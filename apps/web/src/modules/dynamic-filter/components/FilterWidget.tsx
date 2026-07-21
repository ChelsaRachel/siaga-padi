import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FilterOption {
  label: string
  value: string
}

interface FilterWidgetProps {
  id: string
  filterKey: string
  options: FilterOption[]
  config?: WidgetFilterConfig
  placeholder?: string
}

export function FilterWidget({
  id,
  filterKey,
  options,
  config,
  placeholder = 'Pilih...',
}: FilterWidgetProps) {
  const { emit } = useFilterEmitter({
    emitterId: id,
    scope: config?.scope ?? 'all',
    targets: config?.targets,
  })

  return (
    <Select onValueChange={(val) => emit(filterKey, val)}>
      <SelectTrigger id={id} className="w-50">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
