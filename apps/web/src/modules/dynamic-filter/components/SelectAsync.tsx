import { useEffect, useRef, useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AsyncOption { label: string; value: string }

interface SelectAsyncProps {
  id: string
  filterKey: string
  config?: WidgetFilterConfig
  placeholder?: string
  fetchOptions: (search: string) => Promise<AsyncOption[]>
  debounceMs?: number
}

export function SelectAsync({ id, filterKey, config, placeholder = 'Cari...', fetchOptions, debounceMs = 400 }: SelectAsyncProps) {
  const [open, setOpen]         = useState(false)
  const [search, setSearch]     = useState('')
  const [options, setOptions]   = useState<AsyncOption[]>([])
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState<AsyncOption | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { emit, clear } = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className="w-50 justify-between font-normal">
          <span className={selected ? '' : 'text-muted-foreground'}>{selected ? selected.label : placeholder}</span>
          <i className="ph ph-caret-down text-[16px] opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-50 p-2" align="start">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ketik untuk mencari..." className="mb-2 h-8" />
        {loading ? (
          <div className="flex items-center justify-center py-4"><i className="ph ph-spinner text-[16px] animate-spin text-muted-foreground" aria-hidden="true" /></div>
        ) : options.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">Tidak ada hasil</p>
        ) : (
          <ScrollArea className="max-h-48">
            {options.map((opt) => (
              <button key={opt.value} onClick={() => { setSelected(opt); emit(filterKey, opt.value); setOpen(false) }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted">
                {opt.label}
              </button>
            ))}
          </ScrollArea>
        )}
        {selected && (
          <button onClick={() => { setSelected(null); setSearch(''); clear() }} className="w-full mt-2 text-xs text-muted-foreground hover:text-destructive text-center">
            Hapus pilihan
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
