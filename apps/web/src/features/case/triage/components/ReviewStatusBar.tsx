import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { reviewStatusLabel } from '../triage-labels'

interface ReviewStatusBarProps {
  caseStatus: string
  caseCode?: string | null
  areaKecamatan?: string | null
  needsHumanReview: boolean
  urgencyFlag: boolean
  updatedAt: string | null
}

/** Same `id-ID` inline formatting the timeline and case cards use. */
function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Review-status indicator + "Hubungi Penyuluh" — the two things a farmer looks
 * for after reading the advice: is a human checking this, and how do I reach
 * one.
 *
 * The urgency flag is surfaced as extra attention, never as a stronger
 * diagnosis: it comes from the questionnaire answers and says nothing about
 * what the disease is.
 */
export function ReviewStatusBar({
  caseStatus,
  caseCode,
  areaKecamatan,
  needsHumanReview,
  urgencyFlag,
  updatedAt,
}: ReviewStatusBarProps) {
  const [isContactOpen, setIsContactOpen] = useState(false)
  const statusLabel = reviewStatusLabel(caseStatus, needsHumanReview)
  const isWaiting = needsHumanReview || caseStatus === 'NEEDS_REVIEW'

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-primary bg-background-secondary px-4 py-3"
      data-testid="review-status-bar"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <i
            className={cn(
              'text-h6',
              isWaiting
                ? 'ph-fill ph-hourglass-medium text-warning-deep'
                : 'ph-fill ph-check-circle text-success-deep'
            )}
            aria-hidden="true"
          />
          <span
            className="text-body-md font-semibold text-font-primary"
            data-testid="review-status-label"
          >
            {statusLabel}
          </span>
          {urgencyFlag && (
            <span
              className="rounded-full border border-warning-soft bg-warning-light px-2 py-0.5 text-body-sm font-semibold text-warning-deep"
              data-testid="urgency-badge"
            >
              Perlu perhatian
            </span>
          )}
        </span>
        {updatedAt && (
          <span className="text-body-sm text-font-secondary" data-testid="last-updated">
            Diperbarui {formatUpdatedAt(updatedAt)}
          </span>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-lg font-semibold"
        onClick={() => setIsContactOpen(true)}
        data-testid="contact-penyuluh"
      >
        <i className="ph ph-chats-circle text-h6" aria-hidden="true" />
        Hubungi Penyuluh
      </Button>

      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="rounded-3xl" data-testid="contact-penyuluh-dialog">
          <DialogHeader className="text-left">
            <DialogTitle className="text-h6 font-bold text-font-primary">
              Hubungi Penyuluh
            </DialogTitle>
            <DialogDescription className="text-body-md text-font-secondary">
              Penyuluh wilayah Anda akan menerima konteks kasus ini.
            </DialogDescription>
          </DialogHeader>

          <dl className="flex flex-col gap-3 rounded-2xl bg-background-secondary p-4">
            {caseCode && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-body-md text-font-secondary">Kode kasus</dt>
                <dd className="font-mono text-body-md font-semibold text-font-primary">
                  {caseCode}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-body-md text-font-secondary">Wilayah</dt>
              <dd className="text-body-md font-semibold text-font-primary">
                {areaKecamatan || 'Belum ditentukan'}
              </dd>
            </div>
          </dl>

          <p className="text-body-md text-font-secondary">
            Kontak penyuluh wilayah tersedia setelah tindak lanjut penyuluh aktif
            (Sprint 06). Sementara ini, tunjukkan kode kasus di atas saat menemui
            penyuluh Anda.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReviewStatusBar
