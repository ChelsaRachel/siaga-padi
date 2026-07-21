import { useState } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/utils/cn'

interface DatePickerProps {
  id: string
  filterKey: string
  config?: WidgetFilterConfig
  placeholder?: string
  outputFormat?: string
}

export function DatePicker({ id, filterKey, config, placeholder = 'Pilih tanggal', outputFormat = 'yyyy-MM-dd' }: DatePickerProps) {
  const [date, setDate] = useState<Date | undefined>()
  const [open, setOpen] = useState(false)
  const { emit, clear } = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })

  function handleSelect(selected: Date | undefined) {
    setDate(selected)
    setOpen(false)
    if (selected) emit(filterKey, format(selected, outputFormat))
    else clear()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className={cn('w-50 justify-start font-normal', !date && 'text-muted-foreground')}>
          <i className="ph ph-calendar text-[16px] mr-2" aria-hidden="true" />
          {date ? format(date, 'd MMM yyyy', { locale: localeId }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  )
}
