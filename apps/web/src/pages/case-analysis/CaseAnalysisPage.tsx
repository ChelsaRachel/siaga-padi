import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { StagedProgress } from '@/features/case/history'
import { IndicationCard, TechnicalPanel } from '@/features/case/triage'
import { triageService } from '@/services/triage.service'
import { selectRole, useAuthStore } from '@/stores/useAuthStore'
import type { AnalysisResult } from '@/types/siaga-triage'
import { parseApiError } from '@/utils/parse-api-error'

/** Roles that may see candidates, scores and model versions. */
const TECHNICAL_ROLES = ['penyuluh', 'admin', 'domain_reviewer']

/** The pipeline is fast; a bounded poll covers a slow model call. */
const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 8

/**
 * Layar hasil indikasi awal — staged progress while the pipeline runs, then
 * the farmer card and (for a penyuluh) the technical panel.
 *
 * The page TRIGGERS the analysis on mount via an idempotent POST rather than
 * waiting for a background worker: the farmer arrives here straight from the
 * photo flow, and the server returns the existing frozen result if one is
 * already there, so a re-entry or a refresh costs nothing.
 */
function CaseAnalysisPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const role = useAuthStore(selectRole)

  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [caseStatus, setCaseStatus] = useState('PROCESSING_CV')
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(true)
  const pollCountRef = useRef(0)

  const run = useCallback(async () => {
    if (!caseId) {
      setError('Kasus tidak ditemukan.')
      setIsRunning(false)
      return
    }
    setIsRunning(true)
    setError(null)
    try {
      const response = await triageService.runAnalysis(caseId)
      setResult(response?.data ?? null)
      setCaseStatus('NEEDS_CONTEXT')
      setIsRunning(false)
    } catch (runError: unknown) {
      const parsed = parseApiError(runError)
      // The case may still be moving through the pipeline (another tab, a
      // retry): poll a bounded number of times before showing a failure.
      if (pollCountRef.current < MAX_POLLS) {
        pollCountRef.current += 1
        window.setTimeout(run, POLL_INTERVAL_MS)
        return
      }
      setError(parsed.message)
      setIsRunning(false)
    }
  }, [caseId])

  useEffect(() => {
    run()
  }, [run])

  const isTechnicalViewer = role !== null && TECHNICAL_ROLES.includes(role)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {isRunning && (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-h5 font-bold text-font-primary">Menganalisis foto</h1>
            <p className="text-body-md text-font-secondary">
              Mohon tunggu sebentar, foto Anda sedang diperiksa.
            </p>
          </div>
          <StagedProgress status={caseStatus} />
        </>
      )}

      {!isRunning && error && (
        <Alert variant="destructive" data-testid="analysis-error">
          <AlertDescription className="flex flex-col items-start gap-3">
            {error}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  pollCountRef.current = 0
                  run()
                }}
              >
                Coba lagi
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-lg">
                <Link to={`/kasus/${caseId}`}>Kembali ke kasus</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!isRunning && !error && result && (
        <>
          <IndicationCard result={result} />

          {isTechnicalViewer && caseId && (
            <TechnicalPanel result={result} caseId={caseId} />
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="lg"
              className="h-14 rounded-2xl text-body-lg font-semibold"
              onClick={() => navigate(`/kasus/${caseId}/pertanyaan`)}
              data-testid="continue-to-questions"
            >
              Lanjut Jawab Pertanyaan
              <i className="ph ph-arrow-right text-h6" aria-hidden="true" />
            </Button>
            <p className="text-center text-body-sm text-font-secondary">
              Beberapa pertanyaan singkat membantu melengkapi hasil.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default CaseAnalysisPage
