import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface FilterOption {
  label: string
  value: string
}

interface RadioProps {
  id: string
  filterKey: string
  options: FilterOption[]
  config?: WidgetFilterConfig
  defaultValue?: string
}

export function Radio({ id, filterKey, options, config, defaultValue }: RadioProps) {
  const { emit } = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })

  return (
    <RadioGroup defaultValue={defaultValue} onValueChange={(val) => emit(filterKey, val)} className="flex flex-col gap-1.5">
      {options.map((opt) => (
        <div key={opt.value} className="flex items-center gap-2">
          <RadioGroupItem id={`${id}-${opt.value}`} value={opt.value} />
          <Label htmlFor={`${id}-${opt.value}`} className="font-normal cursor-pointer">{opt.label}</Label>
        </div>
      ))}
    </RadioGroup>
  )
}
