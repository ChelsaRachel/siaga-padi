import { useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Switch } from '@/components/ui/switch'

interface ToggleFilterWidgetProps {
  id: string
  filterKey: string
  config?: WidgetFilterConfig
  valueOn?: unknown
  valueOff?: unknown
}

export function ToggleFilterWidget({
  id,
  filterKey,
  config,
  valueOn = true,
  valueOff = false,
}: ToggleFilterWidgetProps) {
  const [checked, setChecked] = useState(false)
  const { emit } = useFilterEmitter({
    emitterId: id,
    scope: config?.scope ?? 'all',
    targets: config?.targets,
  })

  function handleChange(val: boolean) {
    setChecked(val)
    emit(filterKey, val ? valueOn : valueOff)
  }

  return <Switch id={id} checked={checked} onCheckedChange={handleChange} />
}
