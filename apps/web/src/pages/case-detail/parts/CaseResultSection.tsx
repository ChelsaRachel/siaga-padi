import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FarmerActionCards,
  ReferenceDrawer,
  ReviewStatusBar,
  TechnicalRecommendationCard,
} from '@/features/case/triage'
import { triageService } from '@/services/triage.service'
import type { SiagaCase } from '@/types/siaga-case'
import type { TriageRecommendation } from '@/types/siaga-triage'
import { parseApiError } from '@/utils/parse-api-error'

interface CaseResultSectionProps {
  caseData: SiagaCase
}

const HTTP_NOT_FOUND = 404

/** Statuses at which a result can exist at all. */
const RESULT_READY_STATUSES = [
  'AUTO_TRIAGE_READY',
  'NEEDS_REVIEW',
  'REVIEWED',
  'CLOSED',
  'ARCHIVED',
  'REVISION_REQUIRED',
]

/**
 * Hasil & Rekomendasi — fills the slot Sprint 02 left on the case detail page.
 *
 * A 404 here is a normal state, not an error: the case simply has no card yet.
 * It renders the "continue the check" prompt instead, so a farmer who left
 * mid-flow is offered the next step rather than an error message.
 */
export function CaseResultSection({ caseData }: CaseResultSectionProps) {
  const [recommendation, setRecommendation] = useState<TriageRecommendation | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerRefCodes, setDrawerRefCodes] = useState<string[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await triageService.getRecommendation(caseData.caseId)
      setRecommendation(response?.data ?? null)
    } catch (loadError: unknown) {
      const parsed = parseApiError(loadError)
      // Not composed yet — an expected state, handled below as a prompt.
      setRecommendation(null)
      setError(parsed.status === HTTP_NOT_FOUND ? null : parsed.message)
    } finally {
      setIsLoading(false)
    }
  }, [caseData.caseId])

  useEffect(() => {
    load()
  }, [load])

  const openReferences = useCallback((refCodes: string[]) => {
    setDrawerRefCodes(refCodes)
    setIsDrawerOpen(true)
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" data-testid="result-loading">
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="result-error">
        <AlertDescription className="flex flex-col items-start gap-3">
          {error}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={load}
          >
            Coba lagi
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!recommendation) {
    const canContinue = !RESULT_READY_STATUSES.includes(caseData.status)
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border-secondary bg-background-secondary px-6 py-8 text-center"
        data-testid="result-pending"
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <i className="ph ph-clipboard-text text-h4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-body-lg font-semibold text-font-primary">
            Hasil &amp; Rekomendasi
          </p>
          <p className="mt-1 text-body-md text-font-secondary">
            {canContinue
              ? 'Pemeriksaan belum selesai. Lanjutkan untuk mendapatkan hasil.'
              : 'Rekomendasi sedang disiapkan.'}
          </p>
        </div>
        {canContinue && (
          <Button
            asChild
            size="lg"
            className="rounded-xl font-semibold"
            data-testid="continue-triage"
          >
            <Link to={`/kasus/${caseData.caseId}/analisis`}>
              Lanjutkan pemeriksaan
              <i className="ph ph-arrow-right text-h6" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Hasil dan rekomendasi">
      <ReviewStatusBar
        caseStatus={recommendation.caseStatus}
        caseCode={caseData.caseCode}
        areaKecamatan={caseData.areaKecamatan}
        needsHumanReview={recommendation.needsHumanReview}
        urgencyFlag={recommendation.urgencyFlag}
        updatedAt={recommendation.updatedAt}
      />

      <FarmerActionCards
        recommendation={recommendation}
        onOpenReferences={openReferences}
      />

      <TechnicalRecommendationCard
        recommendation={recommendation}
        onOpenReferences={openReferences}
      />

      <ReferenceDrawer
        refCodes={drawerRefCodes}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </section>
  )
}

export default CaseResultSection
