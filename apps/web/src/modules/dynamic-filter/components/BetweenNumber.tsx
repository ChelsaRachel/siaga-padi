import { useEffect, useRef, useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Input } from '@/components/ui/input'

interface BetweenNumberProps {
  id: string
  filterKeyMin: string
  filterKeyMax: string
  config?: WidgetFilterConfig
  min?: number
  max?: number
  debounceMs?: number
}

export function BetweenNumber({ id, filterKeyMin, filterKeyMax, config, min, max, debounceMs = 400 }: BetweenNumberProps) {
  const [minVal, setMinVal] = useState('')
  const [maxVal, setMaxVal] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { emitMultiple, clear } = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const numMin = Number(minVal)
      const numMax = Number(maxVal)
      if (minVal !== '' && maxVal !== '' && !isNaN(numMin) && !isNaN(numMax)) {
        emitMultiple({ [filterKeyMin]: numMin, [filterKeyMax]: numMax })
      } else if (minVal === '' && maxVal === '') {
        clear()
      }
    }, debounceMs)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [minVal, maxVal]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-2">
      <Input id={`${id}-min`} type="number" value={minVal} onChange={(e) => setMinVal(e.target.value)} placeholder="Min" min={min} max={max} className="w-22.5" />
      <span className="text-muted-foreground text-sm">–</span>
      <Input id={`${id}-max`} type="number" value={maxVal} onChange={(e) => setMaxVal(e.target.value)} placeholder="Max" min={min} max={max} className="w-22.5" />
    </div>
  )
}
