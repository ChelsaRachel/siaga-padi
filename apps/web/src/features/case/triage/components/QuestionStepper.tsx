import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import type { TriageAnswer, TriageQuestion } from '@/types/siaga-triage'
import { ANSWER_LABELS, ANSWER_OPTIONS } from '../triage-labels'

interface QuestionStepperProps {
  question: TriageQuestion
  stepIndex: number
  totalCount: number
  selectedAnswer: TriageAnswer | null
  fillerName?: string | null
  onAnswer: (answer: TriageAnswer) => void
  onBack: () => void
  onSkip: () => void
}

const ANSWER_ICONS: Record<TriageAnswer, string> = {
  ya: 'ph-thumbs-up',
  tidak: 'ph-thumbs-down',
  tidak_tahu: 'ph-question',
}

/**
 * Satu pertanyaan per layar — large touch targets, the "mengapa ditanya" note,
 * and a "2 dari 4" indicator.
 *
 * "Tidak Tahu" sits beside Ya/Tidak as an equal option rather than hidden
 * behind a skip link: the brief treats not knowing as a legitimate answer, and
 * a farmer who cannot tell must not feel pushed into guessing.
 */
export function QuestionStepper({
  question,
  stepIndex,
  totalCount,
  selectedAnswer,
  fillerName,
  onAnswer,
  onBack,
  onSkip,
}: QuestionStepperProps) {
  const isFirst = stepIndex === 0

  return (
    <section
      className="flex flex-col gap-5"
      aria-label={`Pertanyaan ${stepIndex + 1} dari ${totalCount}`}
      data-testid="question-stepper"
      data-question-code={question.code}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p
            className="text-body-sm font-semibold text-font-secondary"
            data-testid="question-progress-label"
          >
            Pertanyaan {stepIndex + 1} dari {totalCount}
          </p>
          {fillerName && (
            <p
              className="truncate text-body-sm text-font-secondary"
              data-testid="filler-name"
            >
              Diisi oleh {fillerName}
            </p>
          )}
        </div>

        <ol className="flex gap-1.5" aria-hidden="true" data-testid="progress-dots">
          {Array.from({ length: totalCount }, (_, index) => (
            <li
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                index < stepIndex && 'bg-primary-base',
                index === stepIndex && 'bg-primary-bold',
                index > stepIndex && 'bg-border-secondary'
              )}
            />
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-border-primary bg-card p-5">
        <h1 className="text-h6 font-bold text-font-primary" data-testid="question-text">
          {question.text}
        </h1>

        {question.illustration && (
          <img
            src={question.illustration}
            alt=""
            className="max-h-48 w-full rounded-2xl object-cover"
            loading="lazy"
          />
        )}

        <p
          className="flex items-start gap-2 rounded-2xl bg-background-secondary p-3 text-body-md text-font-secondary"
          data-testid="why-asked"
        >
          <i
            className="ph ph-info mt-0.5 shrink-0 text-h6 text-secondary-bold"
            aria-hidden="true"
          />
          {question.whyAsked}
        </p>
      </div>

      <div className="flex flex-col gap-3" role="group" aria-label="Pilihan jawaban">
        {ANSWER_OPTIONS.map((option) => (
          <Button
            key={option}
            type="button"
            size="lg"
            variant={selectedAnswer === option ? 'default' : 'outline'}
            aria-pressed={selectedAnswer === option}
            className="h-14 justify-start gap-3 rounded-2xl text-body-lg font-semibold"
            onClick={() => onAnswer(option)}
            data-testid={`answer-${option}`}
          >
            <i className={cn('ph text-h5', ANSWER_ICONS[option])} aria-hidden="true" />
            {ANSWER_LABELS[option]}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-lg"
          disabled={isFirst}
          onClick={onBack}
          data-testid="question-back"
        >
          <i className="ph ph-arrow-left text-h6" aria-hidden="true" />
          Sebelumnya
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-lg text-font-secondary"
          onClick={onSkip}
          data-testid="question-skip"
        >
          Lewati pertanyaan ini
        </Button>
      </div>
    </section>
  )
}

export default QuestionStepper
