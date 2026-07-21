import { useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Slider } from '@/components/ui/slider'

interface SliderRangeProps {
  id: string
  filterKeyMin: string
  filterKeyMax: string
  config?: WidgetFilterConfig
  min?: number
  max?: number
  step?: number
  defaultMin?: number
  defaultMax?: number
}

export function SliderRange({ id, filterKeyMin, filterKeyMax, config, min = 0, max = 100, step = 1, defaultMin, defaultMax }: SliderRangeProps) {
  const [range, setRange] = useState([defaultMin ?? min, defaultMax ?? max])
  const { emitMultiple } = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })

  return (
    <Slider
      id={id}
      min={min}
      max={max}
      step={step}
      value={range}
      onValueCommit={(vals) => { setRange(vals); emitMultiple({ [filterKeyMin]: vals[0], [filterKeyMax]: vals[1] }) }}
      className="w-50"
    />
  )
}
