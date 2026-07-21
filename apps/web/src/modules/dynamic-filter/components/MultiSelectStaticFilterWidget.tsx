import { useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

interface FilterOption {
  label: string
  value: string
}

interface MultiSelectStaticFilterWidgetProps {
  id: string
  filterKey: string
  options: FilterOption[]
  config?: WidgetFilterConfig
  placeholder?: string
  maxDisplay?: number
}

export function MultiSelectStaticFilterWidget({
  id,
  filterKey,
  options,
  config,
  placeholder = 'Pilih...',
  maxDisplay = 2,
}: MultiSelectStaticFilterWidgetProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [open, setOpen]         = useState(false)
  const { emit, clear } = useFilterEmitter({
    emitterId: id,
    scope: config?.scope ?? 'all',
    targets: config?.targets,
  })

  function toggle(value: string) {
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    setSelected(next)
    if (next.length) emit(filterKey, next)
    else clear()
  }

  function removeOne(value: string, e: React.MouseEvent) {
    e.stopPropagation()
    toggle(value)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className="w-55 h-auto min-h-9 justify-between font-normal">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selected.slice(0, maxDisplay).map((v) => {
                const opt = options.find((o) => o.value === v)
                return (
                  <Badge key={v} variant="secondary" className="text-xs gap-1 pr-1">
                    {opt?.label ?? v}
                    <button onClick={(e) => removeOne(v, e)}><i className="ph ph-x text-[12px]" aria-hidden="true" /></button>
                  </Badge>
                )
              })}
              {selected.length > maxDisplay && <Badge variant="outline" className="text-xs">+{selected.length - maxDisplay}</Badge>}
            </div>
          )}
          <i className="ph ph-caret-down text-[16px] opacity-50 ml-1 shrink-0" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-55 p-2" align="start">
        <ScrollArea className="max-h-56">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
              <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => toggle(opt.value)} />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </ScrollArea>
        {selected.length > 0 && (
          <button onClick={() => { setSelected([]); clear() }} className="w-full mt-2 text-xs text-muted-foreground hover:text-destructive text-center">
            Hapus semua
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
