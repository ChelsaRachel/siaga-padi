import { useState } from 'react'
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { cn } from '@/utils/cn'

export interface RelativePreset {
  label: string
  value: string
  resolve: () => { from: string; to: string }
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
const today = () => new Date()

const DEFAULT_PRESETS: RelativePreset[] = [
  { label: 'Hari ini',        value: 'today',       resolve: () => ({ from: fmt(today()), to: fmt(today()) }) },
  { label: '7 hari terakhir', value: 'last7',        resolve: () => ({ from: fmt(subDays(today(), 6)), to: fmt(today()) }) },
  { label: '30 hari terakhir',value: 'last30',       resolve: () => ({ from: fmt(subDays(today(), 29)), to: fmt(today()) }) },
  { label: 'Bulan ini',       value: 'thisMonth',    resolve: () => ({ from: fmt(startOfMonth(today())), to: fmt(endOfMonth(today())) }) },
  { label: 'Bulan lalu',      value: 'lastMonth',    resolve: () => { const d = subMonths(today(), 1); return { from: fmt(startOfMonth(d)), to: fmt(endOfMonth(d)) } } },
  { label: 'Kuartal ini',     value: 'thisQuarter',  resolve: () => ({ from: fmt(startOfQuarter(today())), to: fmt(endOfQuarter(today())) }) },
  { label: 'Tahun ini',       value: 'thisYear',     resolve: () => ({ from: fmt(startOfYear(today())), to: fmt(endOfYear(today())) }) },
]

interface RelativeDateFilterWidgetProps {
  id: string
  filterKeyFrom: string
  filterKeyTo: string
  config?: WidgetFilterConfig
  presets?: RelativePreset[]
}

export function RelativeDateFilterWidget({
  id,
  filterKeyFrom,
  filterKeyTo,
  config,
  presets = DEFAULT_PRESETS,
}: RelativeDateFilterWidgetProps) {
  const [active, setActive] = useState<string | null>(null)
  const { emitMultiple, clear } = useFilterEmitter({
    emitterId: id,
    scope: config?.scope ?? 'all',
    targets: config?.targets,
  })

  function handleSelect(preset: RelativePreset) {
    if (active === preset.value) { setActive(null); clear() }
    else {
      const { from, to } = preset.resolve()
      setActive(preset.value)
      emitMultiple({ [filterKeyFrom]: from, [filterKeyTo]: to })
    }
  }

  return (
    <div id={id} className="flex flex-wrap gap-1.5">
      {presets.map((preset) => (
        <button
          key={preset.value}
          onClick={() => handleSelect(preset)}
          className={cn(
            'px-2.5 py-1 text-xs rounded-full border transition-colors',
            active === preset.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-border hover:bg-muted',
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
