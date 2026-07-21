import { useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Checkbox as CheckboxUI } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface FilterOption {
  label: string
  value: string
}

interface CheckboxProps {
  id: string
  filterKey: string
  options: FilterOption[]
  config?: WidgetFilterConfig
}

export function Checkbox({ id, filterKey, options, config }: CheckboxProps) {
  const [selected, setSelected] = useState<string[]>([])
  const { emit, clear } = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })

  function handleChange(value: string, checked: boolean) {
    const next = checked ? [...selected, value] : selected.filter((v) => v !== value)
    setSelected(next)
    if (next.length) emit(filterKey, next)
    else clear()
  }

  return (
    <div className="flex flex-col gap-1.5">
      {options.map((opt) => (
        <div key={opt.value} className="flex items-center gap-2">
          <CheckboxUI
            id={`${id}-${opt.value}`}
            checked={selected.includes(opt.value)}
            onCheckedChange={(checked) => handleChange(opt.value, !!checked)}
          />
          <Label htmlFor={`${id}-${opt.value}`} className="font-normal cursor-pointer">{opt.label}</Label>
        </div>
      ))}
    </div>
  )
}
