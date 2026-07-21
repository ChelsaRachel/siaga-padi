import { useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Slider } from '@/components/ui/slider'

interface SliderFilterWidgetProps {
  id: string
  filterKey: string
  config?: WidgetFilterConfig
  min?: number
  max?: number
  step?: number
  defaultValue?: number
}

export function SliderFilterWidget({
  id,
  filterKey,
  config,
  min = 0,
  max = 100,
  step = 1,
  defaultValue,
}: SliderFilterWidgetProps) {
  const [value, setValue] = useState(defaultValue ?? min)
  const { emit } = useFilterEmitter({
    emitterId: id,
    scope: config?.scope ?? 'all',
    targets: config?.targets,
  })

  function handleCommit(vals: number[]) {
    setValue(vals[0])
    emit(filterKey, vals[0])
  }

  return (
    <Slider
      id={id}
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueCommit={handleCommit}
      className="w-50"
    />
  )
}
