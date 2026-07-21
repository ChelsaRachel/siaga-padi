import { useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Switch } from '@/components/ui/switch'

interface ToggleProps {
  id: string
  filterKey: string
  config?: WidgetFilterConfig
  valueOn?: unknown
  valueOff?: unknown
}

export function Toggle({ id, filterKey, config, valueOn = true, valueOff = false }: ToggleProps) {
  const [checked, setChecked] = useState(false)
  const { emit } = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })

  return <Switch id={id} checked={checked} onCheckedChange={(val) => { setChecked(val); emit(filterKey, val ? valueOn : valueOff) }} />
}
