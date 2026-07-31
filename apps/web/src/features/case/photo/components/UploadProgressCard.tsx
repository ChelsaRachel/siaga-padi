import { Progress } from '@/components/ui/progress'
import { UPLOAD_STATE_LABELS } from '../photo-labels'
import type { IPhotoSlot } from '../store/usePhotoFlowStore'

interface UploadProgressCardProps {
  slot: IPhotoSlot
  onRetry: () => void
}

/**
 * Status pengiriman per foto (FR-003): bilah progres, badge "menunggu
 * jaringan" saat koneksi putus (foto tetap di perangkat), tombol coba lagi.
 * Copy tidak pernah mengklaim foto sampai sebelum server mengonfirmasi.
 */
function UploadProgressCard({ slot, onRetry }: UploadProgressCardProps) {
  const isSending = slot.uploadState === 'mengirim'
  const isWaitingNetwork = slot.uploadState === 'menunggu_jaringan'
  const isFailed = slot.uploadState === 'gagal'
  const isDelivered = slot.uploadState === 'terkirim'

  if (slot.uploadState === 'idle') {
    return null
  }

  return (
    <article
      data-testid={`upload-card-${slot.slotNo}`}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border-primary bg-background-primary p-4"
    >
      <div className="flex items-center gap-3">
        {slot.previewUrl && (
          <img
            src={slot.previewUrl}
            alt={`Foto slot ${slot.slotNo}`}
            className="size-12 rounded-xl border border-border-primary object-cover"
          />
        )}
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-body-md font-semibold text-font-primary">
            Foto {slot.slotNo}
          </p>
          {isSending && (
            <p className="text-body-sm text-font-secondary">
              {UPLOAD_STATE_LABELS.mengirim} {slot.progress}%
            </p>
          )}
          {isDelivered && (
            <p className="text-body-sm text-primary-deep">
              <i className="ph ph-check-circle mr-1" aria-hidden="true" />
              {UPLOAD_STATE_LABELS.terkirim}
            </p>
          )}
          {isWaitingNetwork && (
            <p
              data-testid="pending-network-badge"
              className="w-fit rounded-lg bg-warning/15 px-2 py-0.5 text-body-sm font-medium text-warning-strong"
            >
              <i className="ph ph-wifi-slash mr-1" aria-hidden="true" />
              {UPLOAD_STATE_LABELS.menunggu_jaringan}
            </p>
          )}
          {isFailed && (
            <p className="text-body-sm text-destructive">
              <i className="ph ph-warning-circle mr-1" aria-hidden="true" />
              {slot.error ?? UPLOAD_STATE_LABELS.gagal}
            </p>
          )}
        </div>
      </div>

      {isSending && <Progress value={slot.progress} aria-label="Progres unggah" />}

      {(isFailed || isWaitingNetwork) && (
        <button
          type="button"
          data-testid={`upload-retry-${slot.slotNo}`}
          onClick={onRetry}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary-soft bg-primary-light px-4 py-2 text-body-md font-semibold text-primary-deep transition-colors hover:bg-primary-soft"
        >
          <i className="ph ph-arrow-clockwise" aria-hidden="true" />
          Coba Kirim Lagi
        </button>
      )}
    </article>
  )
}

export default UploadProgressCard
