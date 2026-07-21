import { useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Slider } from '@/components/ui/slider'

interface SliderRangeFilterWidgetProps {
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

export function SliderRangeFilterWidget({
  id,
  filterKeyMin,
  filterKeyMax,
  config,
  min = 0,
  max = 100,
  step = 1,
  defaultMin,
  defaultMax,
}: SliderRangeFilterWidgetProps) {
  const [range, setRange] = useState([defaultMin ?? min, defaultMax ?? max])
  const { emitMultiple } = useFilterEmitter({
    emitterId: id,
    scope: config?.scope ?? 'all',
    targets: config?.targets,
  })

  function handleCommit(vals: number[]) {
    setRange(vals)
    emitMultiple({ [filterKeyMin]: vals[0], [filterKeyMax]: vals[1] })
  }

  return <Slider id={id} min={min} max={max} step={step} value={range} onValueCommit={handleCommit} className="w-50" />
}
