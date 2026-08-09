import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StagedProgress } from '@/features/case/history'
import {
  QuestionStepper,
  selectAnswerPayload,
  selectCurrentQuestion,
  selectIsLastStep,
  useQuestionnaireStore,
} from '@/features/case/triage'
import { triageService } from '@/services/triage.service'
import {
  selectAssistedSessionId,
  selectAssistedSubject,
  useAssistedStore,
} from '@/stores/useAssistedStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { parseApiError } from '@/utils/parse-api-error'

/**
 * Kuesioner konteks — one question per screen, answers held locally until the
 * whole set is submitted.
 *
 * On the last question the flow submits and then composes the recommendation,
 * showing staged progress in between: from the farmer's side, answering the
 * last question and seeing the advice is one continuous motion.
 */
function CaseQuestionnairePage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()

  const questions = useQuestionnaireStore((state) => state.questions)
  const answers = useQuestionnaireStore((state) => state.answers)
  const stepIndex = useQuestionnaireStore((state) => state.stepIndex)
  const currentQuestion = useQuestionnaireStore(selectCurrentQuestion)
  const isLastStep = useQuestionnaireStore(selectIsLastStep)
  const answerPayload = useQuestionnaireStore(selectAnswerPayload)
  const loadQuestions = useQuestionnaireStore((state) => state.loadQuestions)
  const setAnswer = useQuestionnaireStore((state) => state.setAnswer)
  const goNext = useQuestionnaireStore((state) => state.goNext)
  const goBack = useQuestionnaireStore((state) => state.goBack)
  const reset = useQuestionnaireStore((state) => state.reset)

  const assistedSessionId = useAssistedStore(selectAssistedSessionId)
  const assistedSubject = useAssistedStore(selectAssistedSubject)
  const profile = useAuthStore((state) => state.profile)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!caseId) {
      setError('Kasus tidak ditemukan.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await triageService.getQuestions(caseId)
      loadQuestions(response?.data?.questions ?? [])
    } catch (loadError: unknown) {
      setError(parseApiError(loadError).message)
    } finally {
      setIsLoading(false)
    }
  }, [caseId, loadQuestions])

  useEffect(() => {
    load()
    return () => reset()
  }, [load, reset])

  const submit = useCallback(async () => {
    if (!caseId) return
    setIsSubmitting(true)
    setError(null)
    try {
      await triageService.submitAnswers(caseId, {
        answers: answerPayload,
        ...(assistedSessionId ? { assistedSessionId } : {}),
      })
      // Compose immediately so the farmer lands on the finished card.
      await triageService.composeRecommendation(caseId)
      navigate(`/kasus/${caseId}`)
    } catch (submitError: unknown) {
      setError(parseApiError(submitError).message)
      setIsSubmitting(false)
    }
  }, [answerPayload, assistedSessionId, caseId, navigate])

  const handleAdvance = useCallback(() => {
    if (isLastStep) {
      submit()
      return
    }
    goNext()
  }, [goNext, isLastStep, submit])

  /** Assisted mode records the penyuluh; show it subtly, not as a banner. */
  const fillerName = assistedSubject ? profile?.displayName ?? null : null

  if (isSubmitting) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-h5 font-bold text-font-primary">Menyusun rekomendasi</h1>
          <p className="text-body-md text-font-secondary">
            Jawaban Anda sedang digabungkan dengan rujukan resmi.
          </p>
        </div>
        <StagedProgress status="GENERATING_RECOMMENDATION" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {isLoading && (
        <div className="flex flex-col gap-4" data-testid="questionnaire-loading">
          <Skeleton className="h-6 rounded-lg" />
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="destructive" data-testid="questionnaire-error">
          <AlertDescription className="flex flex-col items-start gap-3">
            {error}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={load}
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

      {!isLoading && !error && questions.length === 0 && (
        <Alert data-testid="questionnaire-empty">
          <AlertDescription className="flex flex-col items-start gap-3">
            Tidak ada pertanyaan lanjutan untuk kasus ini.
            <Button
              type="button"
              size="sm"
              className="rounded-lg"
              onClick={submit}
              data-testid="skip-to-recommendation"
            >
              Lanjut ke rekomendasi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && currentQuestion && (
        <>
          <QuestionStepper
            question={currentQuestion}
            stepIndex={stepIndex}
            totalCount={questions.length}
            selectedAnswer={answers[currentQuestion.questionId] ?? null}
            fillerName={fillerName}
            onAnswer={(answer) => {
              setAnswer(currentQuestion.questionId, answer)
              handleAdvance()
            }}
            onBack={goBack}
            onSkip={handleAdvance}
          />

          {isLastStep && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 rounded-2xl font-semibold"
              onClick={submit}
              data-testid="finish-questionnaire"
            >
              Selesai &amp; lihat rekomendasi
            </Button>
          )}
        </>
      )}
    </div>
  )
}

export default CaseQuestionnairePage
