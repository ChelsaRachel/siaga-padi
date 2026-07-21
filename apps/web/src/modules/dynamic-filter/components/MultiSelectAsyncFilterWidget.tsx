import { useEffect, useRef, useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AsyncOption {
  label: string
  value: string
}

interface MultiSelectAsyncFilterWidgetProps {
  id: string
  filterKey: string
  config?: WidgetFilterConfig
  placeholder?: string
  fetchOptions: (search: string) => Promise<AsyncOption[]>
  debounceMs?: number
  maxDisplay?: number
}

export function MultiSelectAsyncFilterWidget({
  id,
  filterKey,
  config,
  placeholder = 'Cari...',
  fetchOptions,
  debounceMs = 400,
  maxDisplay = 2,
}: MultiSelectAsyncFilterWidgetProps) {
  const [open, setOpen]         = useState(false)
  const [search, setSearch]     = useState('')
  const [options, setOptions]   = useState<AsyncOption[]>([])
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState<AsyncOption[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { emit, clear } = useFilterEmitter({
    emitterId: id,
    scope: config?.scope ?? 'all',
    targets: config?.targets,
  })

  useEffect(() => {
    if (!open) return
    if (timer.current) clearTimeout(timer.current)
    setLoading(true)
    timer.current = setTimeout(async () => {
      setOptions(await fetchOptions(search))
      setLoading(false)
    }, debounceMs)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [search, open]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(opt: AsyncOption) {
    const isSelected = selected.some((s) => s.value === opt.value)
    const next = isSelected ? selected.filter((s) => s.value !== opt.value) : [...selected, opt]
    setSelected(next)
    if (next.length) emit(filterKey, next.map((s) => s.value))
    else clear()
  }

  function removeOne(value: string, e: React.MouseEvent) {
    e.stopPropagation()
    const next = selected.filter((s) => s.value !== value)
    setSelected(next)
    if (next.length) emit(filterKey, next.map((s) => s.value))
    else clear()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className="w-55 h-auto min-h-9 justify-between font-normal">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selected.slice(0, maxDisplay).map((s) => (
                <Badge key={s.value} variant="secondary" className="text-xs gap-1 pr-1">
                  {s.label}
                  <button onClick={(e) => removeOne(s.value, e)}><i className="ph ph-x text-[12px]" aria-hidden="true" /></button>
                </Badge>
              ))}
              {selected.length > maxDisplay && <Badge variant="outline" className="text-xs">+{selected.length - maxDisplay}</Badge>}
            </div>
          )}
          <i className="ph ph-caret-down text-[16px] opacity-50 ml-1 shrink-0" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-55 p-2" align="start">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ketik untuk mencari..." className="mb-2 h-8" />
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <i className="ph ph-spinner text-[16px] animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : (
          <ScrollArea className="max-h-48">
            {options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                <Checkbox checked={selected.some((s) => s.value === opt.value)} onCheckedChange={() => toggle(opt)} />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
            {!loading && options.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-4">Tidak ada hasil</p>
            )}
          </ScrollArea>
        )}
        {selected.length > 0 && (
          <button onClick={() => { setSelected([]); clear() }} className="w-full mt-2 text-xs text-muted-foreground hover:text-destructive text-center">
            Hapus semua
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
