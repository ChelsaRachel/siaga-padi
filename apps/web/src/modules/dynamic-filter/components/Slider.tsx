import { useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Slider as SliderUI } from '@/components/ui/slider'

interface SliderProps {
  id: string
  filterKey: string
  config?: WidgetFilterConfig
  min?: number
  max?: number
  step?: number
  defaultValue?: number
}

export function Slider({ id, filterKey, config, min = 0, max = 100, step = 1, defaultValue }: SliderProps) {
  const [value, setValue] = useState(defaultValue ?? min)
  const { emit } = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })

  return (
    <SliderUI
      id={id}
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueCommit={(vals) => { setValue(vals[0]); emit(filterKey, vals[0]) }}
      className="w-50"
    />
  )
}
