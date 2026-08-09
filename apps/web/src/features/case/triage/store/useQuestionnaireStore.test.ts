import { beforeEach, describe, expect, it } from 'vitest'
import type { TriageQuestion } from '@/types/siaga-triage'
import {
  selectAnswerPayload,
  selectCurrentQuestion,
  selectIsLastStep,
  useQuestionnaireStore,
} from './useQuestionnaireStore'

function makeQuestion(id: string, code: string): TriageQuestion {
  return {
    questionId: id,
    code,
    text: `Pertanyaan ${code}?`,
    illustration: null,
    whyAsked: 'Alasan singkat.',
    answer: null,
  }
}

const QUESTIONS = [
  makeQuestion('q1', 'QST-A'),
  makeQuestion('q2', 'QST-B'),
  makeQuestion('q3', 'QST-C'),
]

describe('useQuestionnaireStore', () => {
  beforeEach(() => {
    useQuestionnaireStore.getState().reset()
  })

  it('starts at the first question', () => {
    // Act
    useQuestionnaireStore.getState().loadQuestions(QUESTIONS)

    // Assert
    expect(selectCurrentQuestion(useQuestionnaireStore.getState())?.code).toBe('QST-A')
    expect(selectIsLastStep(useQuestionnaireStore.getState())).toBe(false)
  })

  it('preserves answers across back navigation', () => {
    // Arrange
    const store = useQuestionnaireStore.getState()
    store.loadQuestions(QUESTIONS)
    store.setAnswer('q1', 'ya')
    store.goNext()
    store.setAnswer('q2', 'tidak_tahu')

    // Act — step back to the first question
    useQuestionnaireStore.getState().goBack()

    // Assert
    const state = useQuestionnaireStore.getState()
    expect(selectCurrentQuestion(state)?.questionId).toBe('q1')
    expect(state.answers.q1).toBe('ya')
    expect(state.answers.q2).toBe('tidak_tahu')
  })

  it('seeds answers already recorded server-side', () => {
    // Arrange — a resumed questionnaire
    const answered = [{ ...QUESTIONS[0], answer: 'tidak' as const }, QUESTIONS[1]]

    // Act
    useQuestionnaireStore.getState().loadQuestions(answered)

    // Assert
    expect(useQuestionnaireStore.getState().answers).toEqual({ q1: 'tidak' })
  })

  it('builds the submission payload from answered questions only', () => {
    // Arrange
    const store = useQuestionnaireStore.getState()
    store.loadQuestions(QUESTIONS)
    store.setAnswer('q1', 'ya')
    store.setAnswer('q3', 'tidak')

    // Act
    const payload = selectAnswerPayload(useQuestionnaireStore.getState())

    // Assert — q2 was skipped on purpose and must not be submitted
    expect(payload).toEqual([
      { questionId: 'q1', answer: 'ya' },
      { questionId: 'q3', answer: 'tidak' },
    ])
  })

  it('re-answering replaces the previous choice', () => {
    // Arrange
    const store = useQuestionnaireStore.getState()
    store.loadQuestions(QUESTIONS)
    store.setAnswer('q1', 'ya')

    // Act
    useQuestionnaireStore.getState().setAnswer('q1', 'tidak')

    // Assert
    expect(useQuestionnaireStore.getState().answers.q1).toBe('tidak')
  })

  it('does not step past the last question', () => {
    // Arrange
    const store = useQuestionnaireStore.getState()
    store.loadQuestions(QUESTIONS)

    // Act
    store.goNext()
    store.goNext()
    useQuestionnaireStore.getState().goNext()

    // Assert
    const state = useQuestionnaireStore.getState()
    expect(state.stepIndex).toBe(2)
    expect(selectIsLastStep(state)).toBe(true)
  })
})
