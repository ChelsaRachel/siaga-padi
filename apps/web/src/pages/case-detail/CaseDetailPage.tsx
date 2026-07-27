import { Link, useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CaseTimeline, StagedProgress } from '@/features/case/history'
import type { DisplayStage } from '@/types/siaga-case'
import { CaseDetailHeader } from './parts/CaseDetailHeader'
import { ResultPlaceholderCard } from './parts/ResultPlaceholderCard'
import { useCaseDetail } from './hooks/useCaseDetail'

/** Staged progress shows while the case is still being photographed/processed. */
const PROGRESS_VISIBLE_STAGES: DisplayStage[] = ['difoto', 'diproses']

/**
 * Detail kasus — header, progres bertahap bernama (never a bare spinner),
 * linimasa kronologis, dan slot hasil Sprint 05. Data di-refresh setiap kali
 * halaman dibuka (fetch on mount + tombol perbarui).
 */
function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const { caseData, events, isLoading, error, refresh } = useCaseDetail(caseId)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {isLoading && (
        <div className="flex flex-col gap-4" aria-label="Memuat detail kasus" data-testid="case-detail-loading">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="destructive" data-testid="case-detail-error">
          <AlertDescription className="flex flex-col items-start gap-3">
            {error}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={refresh}>
                Coba lagi
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-lg">
                <Link to="/riwayat">Kembali ke Riwayat</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && caseData && (
        <>
          <CaseDetailHeader caseData={caseData} onRefresh={refresh} isRefreshing={isLoading} />

          {PROGRESS_VISIBLE_STAGES.includes(caseData.displayStage) && (
            <StagedProgress status={caseData.status} />
          )}

          <ResultPlaceholderCard />

          <section aria-label="Linimasa kasus" className="flex flex-col gap-3">
            <h2 className="text-h6 font-bold text-font-primary">Linimasa</h2>
            <CaseTimeline events={events} />
          </section>
        </>
      )}
    </div>
  )
}

export default CaseDetailPage
