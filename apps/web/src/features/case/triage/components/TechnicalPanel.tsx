import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { AnalysisResult } from '@/types/siaga-triage'
import { ABSTAIN_LABELS, CONFIDENCE_BAND_LABELS } from '../triage-labels'

interface TechnicalPanelProps {
  result: AnalysisResult
  caseId: string
}

/** Calibrated 0..1 score as a percentage, e.g. `0.8234` → `82%`. */
function formatScore(score: number | null): string {
  return score === null ? '—' : `${Math.round(score * 100)}%`
}

/**
 * Panel teknis penyuluh — the same facts as the farmer card at full depth:
 * up to 3 candidates with exact scores, the photo-quality penalty, and the
 * model/threshold versions that produced them.
 *
 * The component renders nothing when `candidates` carries no scores, which is
 * precisely the shape a petani response has. Role gating is therefore enforced
 * twice: the caller checks the role, and the data itself is empty if it ever
 * reached the wrong screen.
 *
 * Evidence highlight maps are NOT rendered here — they are reviewer-only and
 * land with the Sprint 06 review surface.
 */
export function TechnicalPanel({ result, caseId }: TechnicalPanelProps) {
  const hasScores = result.candidates.some(
    (candidate) => candidate.calibratedScore !== null
  )
  if (!hasScores) return null

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border-primary bg-background-secondary p-5"
      aria-label="Detail teknis analisis"
      data-testid="technical-panel"
    >
      <header className="flex items-center gap-2">
        <i className="ph ph-chart-bar text-h6 text-secondary-bold" aria-hidden="true" />
        <h2 className="text-body-lg font-bold text-font-primary">Detail teknis</h2>
      </header>

      <div className="flex flex-col gap-2">
        <p className="text-body-sm font-medium text-font-secondary">
          Kandidat prediksi
        </p>
        <ol className="flex flex-col gap-2" data-testid="candidate-list">
          {result.candidates.map((candidate, index) => (
            <li
              key={candidate.label}
              className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2"
              data-testid={`candidate-${index}`}
            >
              <span className="min-w-0 truncate text-body-md text-font-primary">
                {index + 1}. {candidate.displayLabel}
              </span>
              <span className="shrink-0 font-mono text-body-md font-semibold text-font-primary">
                {formatScore(candidate.calibratedScore)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border-secondary pt-3">
        <div>
          <dt className="text-body-sm text-font-secondary">Band keyakinan</dt>
          <dd className="text-body-md font-medium text-font-primary">
            {CONFIDENCE_BAND_LABELS[result.confidenceBand]}
          </dd>
        </div>
        <div>
          <dt className="text-body-sm text-font-secondary">Status</dt>
          <dd className="text-body-md font-medium text-font-primary">
            {ABSTAIN_LABELS[result.abstainStatus] || 'Yakin'}
          </dd>
        </div>
        <div>
          <dt className="text-body-sm text-font-secondary">Kualitas foto</dt>
          <dd className="text-body-md font-medium text-font-primary">
            {result.qualityPenalty ? 'Ambang (skor dikurangi)' : 'Layak'}
          </dd>
        </div>
        <div>
          <dt className="text-body-sm text-font-secondary">Versi model</dt>
          <dd
            className="truncate font-mono text-body-sm text-font-primary"
            title={result.modelVersion ?? undefined}
            data-testid="model-version"
          >
            {result.modelVersion ?? '—'}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-body-sm text-font-secondary">Versi ambang</dt>
          <dd className="font-mono text-body-sm text-font-primary">
            {result.thresholdVersion ?? '—'}
          </dd>
        </div>
      </dl>

      {/* Sprint 06 owns this route; the link is the seam it plugs into. */}
      <Button
        asChild
        variant="outline"
        size="sm"
        className="w-fit rounded-lg font-semibold"
        data-testid="open-in-review"
      >
        <Link to={`/antrean-review?caseId=${caseId}`}>
          <i className="ph ph-arrow-square-out text-h6" aria-hidden="true" />
          Buka di Review
        </Link>
      </Button>
    </section>
  )
}

export default TechnicalPanel
