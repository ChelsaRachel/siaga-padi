import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/utils/cn'
import { deriveStagedProgress, isReprocessingStatus, type TStageState } from '../utils/staged-progress'

interface StagedProgressProps {
  /** Canonical FRD status value (`SiagaCase.status`). */
  status: string
}

const STATE_LABELS: Record<TStageState, string> = {
  done: 'selesai',
  running: 'sedang berjalan',
  pending: 'menunggu',
}

function StageIcon({ state }: { state: TStageState }) {
  if (state === 'done') {
    return <i className="ph-fill ph-check-circle text-h5 text-primary-base" aria-hidden="true" />
  }
  if (state === 'running') {
    return <i className="ph ph-circle-notch animate-spin text-h5 text-secondary-bold" aria-hidden="true" />
  }
  return <i className="ph ph-circle text-h5 text-font-disabled" aria-hidden="true" />
}

/**
 * Progres bertahap bernama (Foto diterima → Analisis gambar → Pertanyaan
 * lanjutan → Rekomendasi) — NEVER a bare spinner: every running stage keeps
 * its Indonesian name and state text next to the icon.
 */
export function StagedProgress({ status }: StagedProgressProps) {
  const stages = deriveStagedProgress(status)

  return (
    <div
      className="flex flex-col gap-1 rounded-2xl border border-border-primary bg-card p-4"
      data-testid="staged-progress"
    >
      <h2 className="mb-2 text-body-lg font-semibold text-font-primary">Progres pemeriksaan</h2>

      <ol className="flex flex-col">
        {stages.map((stage, index) => (
          <li
            key={stage.label}
            data-testid={`stage-${index}`}
            data-state={stage.state}
            className="flex items-start gap-3"
          >
            <div className="flex flex-col items-center">
              <StageIcon state={stage.state} />
              {index < stages.length - 1 && (
                <span
                  className={cn('my-0.5 h-5 w-0.5 rounded-full', stage.state === 'done' ? 'bg-primary-soft' : 'bg-border-secondary')}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="min-w-0 pb-2">
              <p
                className={cn(
                  'text-body-md',
                  stage.state === 'pending' ? 'text-font-secondary' : 'font-semibold text-font-primary'
                )}
              >
                {stage.label}
              </p>
              <p className="text-body-sm text-font-secondary">{STATE_LABELS[stage.state]}</p>
            </div>
          </li>
        ))}
      </ol>

      {isReprocessingStatus(status) && (
        <Alert className="rounded-xl border-warning-soft bg-warning-light" data-testid="stage-reprocessing-note">
          <AlertDescription className="flex items-center gap-2 text-body-md text-font-primary">
            <i className="ph-fill ph-warning-circle text-h6 text-warning-deep" aria-hidden="true" />
            Terjadi kendala teknis — kasus Anda sedang diproses ulang.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
