import { create } from 'zustand'
import type { TriageAnswer, TriageQuestion } from '@/types/siaga-triage'

/**
 * Questionnaire flow state — the loaded questions, the answers held locally,
 * and the current step.
 *
 * Answers live in the store rather than in the page so that BACK NAVIGATION
 * preserves them: a farmer stepping back to re-read question 2 must find their
 * answer still selected. They are submitted in one call at the end, which also
 * makes the flow resilient to a dropped connection mid-questionnaire.
 */

interface QuestionnaireStore {
  questions: TriageQuestion[]
  /** questionId → answer. Absent = deliberately unanswered. */
  answers: Record<string, TriageAnswer>
  stepIndex: number
  loadQuestions: (questions: TriageQuestion[]) => void
  setAnswer: (questionId: string, answer: TriageAnswer) => void
  goNext: () => void
  goBack: () => void
  reset: () => void
}

export const selectCurrentQuestion = (
  state: QuestionnaireStore
): TriageQuestion | null => state.questions[state.stepIndex] ?? null

export const selectIsLastStep = (state: QuestionnaireStore): boolean =>
  state.questions.length > 0 && state.stepIndex >= state.questions.length - 1

export const selectAnsweredCount = (state: QuestionnaireStore): number =>
  Object.keys(state.answers).length

/** The payload shape `triageService.submitAnswers` expects. */
export const selectAnswerPayload = (
  state: QuestionnaireStore
): Array<{ questionId: string; answer: TriageAnswer }> =>
  Object.entries(state.answers).map(([questionId, answer]) => ({
    questionId,
    answer,
  }))

export const useQuestionnaireStore = create<QuestionnaireStore>()((set) => ({
  questions: [],
  answers: {},
  stepIndex: 0,

  loadQuestions: (questions) =>
    set({
      questions,
      // Answers already recorded server-side seed the local state, so a
      // resumed questionnaire opens with the previous choices selected.
      answers: questions.reduce<Record<string, TriageAnswer>>((acc, question) => {
        if (question.answer) acc[question.questionId] = question.answer
        return acc
      }, {}),
      stepIndex: 0,
    }),

  setAnswer: (questionId, answer) =>
    set((state) => ({ answers: { ...state.answers, [questionId]: answer } })),

  goNext: () =>
    set((state) => ({
      stepIndex: Math.min(
        state.stepIndex + 1,
        Math.max(state.questions.length - 1, 0)
      ),
    })),

  goBack: () => set((state) => ({ stepIndex: Math.max(state.stepIndex - 1, 0) })),

  reset: () => set({ questions: [], answers: {}, stepIndex: 0 }),
}))
