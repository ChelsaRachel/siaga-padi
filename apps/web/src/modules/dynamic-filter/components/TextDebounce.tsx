import { useEffect, useRef, useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Input } from '@/components/ui/input'

interface TextDebounceProps {
  id: string
  filterKey: string
  config?: WidgetFilterConfig
  placeholder?: string
  debounceMs?: number
}

export function TextDebounce({ id, filterKey, config, placeholder = 'Cari...', debounceMs = 400 }: TextDebounceProps) {
  const [value, setValue] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { emit, clear } = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (value.trim()) emit(filterKey, value.trim())
      else clear()
    }, debounceMs)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return <Input id={id} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="w-50" />
}
