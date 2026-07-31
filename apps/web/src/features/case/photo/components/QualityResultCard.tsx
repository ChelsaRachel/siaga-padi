import type { SiagaCasePhoto } from '@/types/siaga-photo'
import {
  QUALITY_STATUS_LABELS,
  REJECT_REASON_LABELS,
} from '../photo-labels'

interface QualityResultCardProps {
  photo: SiagaCasePhoto
}

const STATUS_STYLES: Record<SiagaCasePhoto['qualityStatus'], string> = {
  layak: 'border-primary-soft bg-primary-light text-primary-deep',
  ambang: 'border-warning/40 bg-warning/10 text-warning-strong',
  ditolak: 'border-destructive/40 bg-destructive/10 text-destructive',
  tidak_pasti: 'border-border-primary bg-muted text-font-primary',
}

const STATUS_ICONS: Record<SiagaCasePhoto['qualityStatus'], string> = {
  layak: 'check-circle',
  ambang: 'warning-circle',
  ditolak: 'x-circle',
  tidak_pasti: 'question',
}

/**
 * Kartu hasil kualitas per foto (FR-004): status + maks 3 alasan sederhana.
 * TIDAK pernah menampilkan skor teknis — hanya bahasa awam.
 */
function QualityResultCard({ photo }: QualityResultCardProps) {
  const isRejected =
    photo.qualityStatus === 'ditolak' || photo.qualityStatus === 'tidak_pasti'

  return (
    <article
      data-testid={`quality-card-${photo.slotNo}`}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border-primary bg-background-primary p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-body-md font-semibold text-font-primary">
          Hasil Foto {photo.slotNo}
        </p>
        <span
          data-testid="quality-status"
          className={`flex items-center gap-1 rounded-lg border px-3 py-1 text-body-sm font-semibold ${STATUS_STYLES[photo.qualityStatus]}`}
        >
          <i
            className={`ph ph-${STATUS_ICONS[photo.qualityStatus]}`}
            aria-hidden="true"
          />
          {QUALITY_STATUS_LABELS[photo.qualityStatus]}
        </span>
      </div>

      {photo.qualityStatus === 'ambang' && (
        <p data-testid="ambang-note" className="text-body-sm text-font-secondary">
          Foto ini diterima dengan catatan — hasil analisis nanti bisa kurang
          yakin. Jika sempat, foto ulang di tempat lebih terang.
        </p>
      )}

      {isRejected && photo.rejectReasons.length > 0 && (
        <ul className="flex flex-col gap-1" data-testid="reject-reasons">
          {photo.rejectReasons.map((reason) => (
            <li
              key={reason}
              className="flex items-center gap-2 text-body-md text-font-primary"
            >
              <i className="ph ph-arrow-right text-destructive" aria-hidden="true" />
              {REJECT_REASON_LABELS[reason]}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default QualityResultCard
