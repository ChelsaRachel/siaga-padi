import { useEffect, useRef, useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Input } from '@/components/ui/input'

interface NumberFilterWidgetProps {
  id: string
  filterKey: string
  config?: WidgetFilterConfig
  placeholder?: string
  min?: number
  max?: number
  debounceMs?: number
}

export function NumberFilterWidget({
  id,
  filterKey,
  config,
  placeholder = '0',
  min,
  max,
  debounceMs = 400,
}: NumberFilterWidgetProps) {
  const [value, setValue] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { emit, clear } = useFilterEmitter({
    emitterId: id,
    scope: config?.scope ?? 'all',
    targets: config?.targets,
  })

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const num = Number(value)
      if (value !== '' && !isNaN(num)) emit(filterKey, num)
      else clear()
    }, debounceMs)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Input
      id={id}
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-50"
    />
  )
}
