import { Button } from '@/components/ui/button'
import type { TriageRecommendation } from '@/types/siaga-triage'

interface TechnicalRecommendationCardProps {
  recommendation: TriageRecommendation
  onOpenReferences: (refCodes: string[]) => void
}

/**
 * Kartu teknis penyuluh — the reviewer's view of the same card: summary,
 * an explicit uncertainty statement, the evidence quotations, and the rule
 * markers the engine attached.
 *
 * Returns null when `technicalView` is absent, which is exactly the shape a
 * petani response has — the panel cannot leak by being rendered on the wrong
 * screen, because there is no data to render.
 */
export function TechnicalRecommendationCard({
  recommendation,
  onOpenReferences,
}: TechnicalRecommendationCardProps) {
  const technical = recommendation.technicalView
  if (!technical) return null

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border-primary bg-background-secondary p-5"
      aria-label="Catatan teknis penyuluh"
      data-testid="technical-recommendation"
    >
      <header className="flex items-center gap-2">
        <i
          className="ph ph-stethoscope text-h6 text-secondary-bold"
          aria-hidden="true"
        />
        <h2 className="text-body-lg font-bold text-font-primary">Catatan penyuluh</h2>
      </header>

      <div>
        <p className="text-body-sm font-medium text-font-secondary">Ringkasan</p>
        <p className="text-body-md text-font-primary">{technical.ringkasan}</p>
      </div>

      <div>
        <p className="text-body-sm font-medium text-font-secondary">Ketidakpastian</p>
        <p className="text-body-md text-font-primary">{technical.ketidakpastian}</p>
      </div>

      {technical.kutipan.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-body-sm font-medium text-font-secondary">Kutipan bukti</p>
          <ul className="flex flex-col gap-2">
            {technical.kutipan.map((item, index) => (
              <li
                key={`${item.text}-${index}`}
                className="rounded-xl border-l-2 border-secondary-base bg-card px-3 py-2"
              >
                <p className="text-body-md text-font-primary">{item.text}</p>
                {item.refCodes.length > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 font-mono text-body-sm"
                    onClick={() => onOpenReferences(item.refCodes)}
                  >
                    {item.refCodes.join(', ')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {technical.penanda.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="technical-markers">
          {technical.penanda.map((marker) => (
            <span
              key={marker}
              className="rounded-full border border-border-secondary bg-card px-2.5 py-1 font-mono text-body-sm text-font-secondary"
            >
              {marker}
            </span>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border-secondary pt-3 text-body-sm">
        <div>
          <dt className="text-font-secondary">Versi model</dt>
          <dd className="truncate font-mono text-font-primary">
            {recommendation.modelVersion ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-font-secondary">Penyedia</dt>
          <dd
            className="truncate font-mono text-font-primary"
            title={recommendation.providerVersion ?? undefined}
          >
            {recommendation.providerVersion ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-font-secondary">Versi ambang</dt>
          <dd className="truncate font-mono text-font-primary">
            {recommendation.thresholdVersion ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-font-secondary">Bank pertanyaan</dt>
          <dd className="truncate font-mono text-font-primary">
            {recommendation.questionBankVersion ?? '—'}
          </dd>
        </div>
      </dl>
    </section>
  )
}

export default TechnicalRecommendationCard
