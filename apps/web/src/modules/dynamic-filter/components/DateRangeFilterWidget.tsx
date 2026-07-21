import { useState } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/utils/cn'

interface DateRangeFilterWidgetProps {
  id: string
  filterKeyFrom: string
  filterKeyTo: string
  config?: WidgetFilterConfig
  placeholder?: string
  outputFormat?: string
}

export function DateRangeFilterWidget({
  id,
  filterKeyFrom,
  filterKeyTo,
  config,
  placeholder = 'Pilih rentang tanggal',
  outputFormat = 'yyyy-MM-dd',
}: DateRangeFilterWidgetProps) {
  const [range, setRange] = useState<DateRange | undefined>()
  const [open, setOpen]   = useState(false)
  const { emitMultiple, clear } = useFilterEmitter({
    emitterId: id,
    scope: config?.scope ?? 'all',
    targets: config?.targets,
  })

  function handleSelect(selected: DateRange | undefined) {
    setRange(selected)
    if (selected?.from && selected?.to) {
      emitMultiple({
        [filterKeyFrom]: format(selected.from, outputFormat),
        [filterKeyTo]:   format(selected.to,   outputFormat),
      })
      setOpen(false)
    } else if (!selected) {
      clear()
    }
  }

  function displayLabel() {
    if (!range?.from) return placeholder
    if (!range.to)    return format(range.from, 'd MMM yyyy', { locale: localeId })
    return `${format(range.from, 'd MMM', { locale: localeId })} – ${format(range.to, 'd MMM yyyy', { locale: localeId })}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className={cn('w-60 justify-start font-normal', !range?.from && 'text-muted-foreground')}>
          <i className="ph ph-calendar text-[16px] mr-2" aria-hidden="true" />
          {displayLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={range} onSelect={handleSelect} numberOfMonths={2} />
      </PopoverContent>
    </Popover>
  )
}
