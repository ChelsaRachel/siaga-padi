import { cn } from '@/utils/cn'
import type { TWizardStep } from '@/features/case/create'

const STEP_LABELS: Record<TWizardStep, string> = {
  1: 'Lahan',
  2: 'Lokasi & Fase',
  3: 'Konfirmasi',
}

const TOTAL_STEPS = 3

interface WizardProgressProps {
  step: TWizardStep
}

/** Visible linear progress (1/3…3/3) — Tani Ramah guided-flow rule. */
export function WizardProgress({ step }: WizardProgressProps) {
  return (
    <div className="flex flex-col gap-2" data-testid="wizard-progress">
      <div className="flex items-baseline justify-between">
        <p className="text-body-md font-semibold text-font-primary">{STEP_LABELS[step]}</p>
        <p className="text-body-sm text-font-secondary" aria-live="polite">
          Langkah {step} dari {TOTAL_STEPS}
        </p>
      </div>
      <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={step}>
        {Array.from({ length: TOTAL_STEPS }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-2 flex-1 rounded-full transition-colors',
              index < step ? 'bg-primary-base' : 'bg-neutral-light'
            )}
          />
        ))}
      </div>
    </div>
  )
}
