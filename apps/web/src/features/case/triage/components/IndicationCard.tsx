import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/utils/cn'
import type { AnalysisResult } from '@/types/siaga-triage'
import {
  ABSTAIN_ICONS,
  ABSTAIN_LABELS,
  CONFIDENCE_BAND_CLASSES,
  CONFIDENCE_BAND_LABELS,
} from '../triage-labels'

interface IndicationCardProps {
  result: AnalysisResult
}

/**
 * Kartu indikasi petani — plain language, one headline, the confidence band,
 * and the mandatory "bukan diagnosis final" disclaimer.
 *
 * When the system abstained there is deliberately NO headline label: the card
 * shows the honest "Tidak Yakin" / "Konflik" message and the automatic-review
 * note instead. Inventing a label to fill the space is the exact failure mode
 * FR-005 exists to prevent.
 */
export function IndicationCard({ result }: IndicationCardProps) {
  const isAbstained = result.abstainStatus !== 'yakin'

  return (
    <section
      className="flex flex-col gap-4 rounded-3xl border border-border-primary bg-card p-5"
      aria-label="Hasil indikasi awal"
      data-testid="indication-card"
      data-abstain={result.abstainStatus}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-2xl',
            isAbstained
              ? 'bg-warning-light text-warning-deep'
              : 'bg-primary-light text-primary-deep'
          )}
        >
          <i
            className={cn('ph-fill text-h4', ABSTAIN_ICONS[result.abstainStatus])}
            aria-hidden="true"
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-font-secondary">
            Hasil pemeriksaan foto
          </p>
          <h1
            className="mt-0.5 text-h5 font-bold text-font-primary"
            data-testid="indication-headline"
          >
            {result.indication ?? ABSTAIN_LABELS[result.abstainStatus]}
          </h1>

          {!isAbstained && (
            <span
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-body-sm font-semibold',
                CONFIDENCE_BAND_CLASSES[result.confidenceBand]
              )}
              data-testid="confidence-band"
            >
              <i className="ph-fill ph-gauge" aria-hidden="true" />
              {CONFIDENCE_BAND_LABELS[result.confidenceBand]}
            </span>
          )}
        </div>
      </div>

      {isAbstained && result.abstainMessage && (
        <Alert
          className="rounded-2xl border-warning-soft bg-warning-light"
          data-testid="abstain-message"
        >
          <AlertDescription className="text-body-md text-font-primary">
            {result.abstainMessage}
          </AlertDescription>
        </Alert>
      )}

      {result.requiresReview && (
        <p
          className="flex items-start gap-2 text-body-md text-font-secondary"
          data-testid="review-note"
        >
          <i
            className="ph ph-user-check mt-0.5 text-h6 text-secondary-bold"
            aria-hidden="true"
          />
          Kasus ini otomatis masuk antrean review penyuluh.
        </p>
      )}

      <p className="border-t border-border-secondary pt-3 text-body-sm text-font-secondary">
        {result.disclaimer}
      </p>
    </section>
  )
}

export default IndicationCard
