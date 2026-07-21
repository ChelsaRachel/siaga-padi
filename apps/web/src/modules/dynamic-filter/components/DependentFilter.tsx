import { useEffect, useState } from 'react'
import { useFilterStore, useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FilterOption {
  label: string
  value: string
  dependsOnValue?: string
}

interface DependentFilterProps {
  id: string
  filterKey: string
  options: FilterOption[]
  config?: WidgetFilterConfig
  placeholder?: string
  dependsOnKey: string
}

export function DependentFilter({ id, filterKey, options, config, placeholder = 'Pilih...', dependsOnKey }: DependentFilterProps) {
  const [selected, setSelected] = useState<string>('')

  const parentValue = useFilterStore((s) => {
    const inGlobal = s.globalFilters.find((f) => f.key === dependsOnKey)
    const inUrl    = s.urlFilters.find((f) => f.key === dependsOnKey)
    return (inGlobal ?? inUrl)?.value as string | undefined
  })

  const { emit }       = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })
  const clearFilterKey = useFilterStore((s) => s.clearFilterKey)

  useEffect(() => {
    setSelected('')
    clearFilterKey(filterKey)
  }, [parentValue]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleOptions = !parentValue || parentValue === 'all'
    ? options
    : options.filter((o) => !o.dependsOnValue || o.dependsOnValue === parentValue)

  return (
    <Select value={selected} onValueChange={(val) => { setSelected(val); emit(filterKey, val) }} disabled={visibleOptions.length === 0}>
      <SelectTrigger id={id} className="w-50">
        <SelectValue placeholder={visibleOptions.length === 0 ? 'Tidak ada opsi' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {visibleOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
