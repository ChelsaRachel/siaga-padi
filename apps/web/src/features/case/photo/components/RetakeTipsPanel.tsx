import type { RejectReason } from '@/types/siaga-photo'
import { RETAKE_TIPS } from '../photo-labels'

interface RetakeTipsPanelProps {
  reasons: RejectReason[]
  onRetake: () => void
}

/**
 * Panel tips foto ulang (FR-004): saran spesifik per alasan penolakan plus
 * contoh sebelum/sesudah, lalu tombol kembali ke kamera.
 */
function RetakeTipsPanel({ reasons, onRetake }: RetakeTipsPanelProps) {
  if (reasons.length === 0) {
    return null
  }

  return (
    <section
      data-testid="retake-tips-panel"
      className="flex w-full flex-col gap-3 rounded-2xl border border-primary-soft bg-primary-light/60 p-4"
      aria-label="Tips foto ulang"
    >
      <p className="text-body-md font-semibold text-font-primary">
        Cara memperbaiki foto
      </p>
      {reasons.map((reason) => {
        const tip = RETAKE_TIPS[reason]
        return (
          <div key={reason} className="flex flex-col gap-2">
            <p className="flex items-start gap-2 text-body-md text-font-primary">
              <i
                className={`ph ph-${tip.icon} mt-0.5 text-primary-base`}
                aria-hidden="true"
              />
              {tip.tip}
            </p>
            <div className="grid grid-cols-2 gap-2 text-body-sm">
              <div className="rounded-xl border border-destructive/30 bg-background-primary p-3">
                <p className="mb-1 font-semibold text-destructive">Sebelum</p>
                <p className="text-font-secondary">{tip.before}</p>
              </div>
              <div className="rounded-xl border border-primary-soft bg-background-primary p-3">
                <p className="mb-1 font-semibold text-primary-deep">Sesudah</p>
                <p className="text-font-secondary">{tip.after}</p>
              </div>
            </div>
          </div>
        )
      })}
      <button
        type="button"
        data-testid="retake-button"
        onClick={onRetake}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-base px-5 py-3 text-body-md font-semibold text-font-on-accent transition-colors hover:bg-primary-bold"
      >
        <i className="ph ph-camera-rotate" aria-hidden="true" />
        Foto Ulang
      </button>
    </section>
  )
}

export default RetakeTipsPanel
