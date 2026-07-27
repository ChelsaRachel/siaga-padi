import { GROWTH_STAGE_OPTIONS } from '@/features/case/case-labels'
import type { GrowthStage } from '@/types/siaga-case'
import { cn } from '@/utils/cn'

interface GrowthStagePickerProps {
  value: string
  onChange: (value: GrowthStage) => void
}

/**
 * Fase pertumbuhan picker — large tap targets with Indonesian labels mapping
 * to canonical values (Semai=SEEDLING … Belum tahu=UNKNOWN). Plain buttons
 * (aria-pressed) instead of a dropdown: one glance, one tap, field-friendly.
 */
export function GrowthStagePicker({ value, onChange }: GrowthStagePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Fase pertumbuhan">
      {GROWTH_STAGE_OPTIONS.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
            data-testid={`growth-stage-${option.value}`}
            className={cn(
              'flex min-h-14 items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
              isSelected
                ? 'border-primary-base bg-primary-light'
                : 'border-border-primary bg-card hover:bg-background-secondary'
            )}
          >
            <i
              className={cn(
                'shrink-0 text-h5',
                isSelected ? 'ph-fill ph-check-circle text-primary-base' : 'ph ph-leaf text-font-secondary'
              )}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block text-body-md font-semibold text-font-primary">{option.label}</span>
              <span className="block text-body-sm text-font-secondary">{option.description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
