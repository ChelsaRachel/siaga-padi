import type { SiagaApiResponse } from '@/types/api'
import type { AnalysisResult, TriageAnswer, TriageQuestionSet, TriageRecommendation } from '@/types/siaga-triage'
import apiClient from './api-client'
import { API_ENDPOINTS } from './api-endpoints'

/**
 * Triage service — typed 1:1 against docs/api-spec-triage.md.
 *
 * NOTE: the sprint task file names this file `triage.ts`; it is
 * `triage.service.ts` to follow the mandatory `{module}.service.ts` naming
 * convention — the same deliberate, documented deviation as `cases.service.ts`
 * and `kb.service.ts`.
 *
 * `runAnalysis` and `composeRecommendation` are POSTs that are safe to repeat:
 * the server returns the existing frozen result rather than producing a second
 * one, so a retry after a dropped connection costs nothing and cannot create a
 * conflicting verdict.
 */

export interface ISubmitAnswersPayload {
  answers: Array<{ questionId: string; answer: TriageAnswer }>
  /** Assisted mode: records the penyuluh as the filler. */
  assistedSessionId?: string
}

export const triageService = {
  /** POST apps/cases/{id}/analysis — idempotent; runs the CV pipeline once. */
  runAnalysis: (caseId: string): Promise<SiagaApiResponse<AnalysisResult>> => apiClient.post(API_ENDPOINTS.TRIAGE.ANALYSIS(caseId), {}),

  /** GET apps/cases/{id}/analysis — 404 until the pipeline has run. */
  getAnalysis: (caseId: string): Promise<SiagaApiResponse<AnalysisResult>> => apiClient.get(API_ENDPOINTS.TRIAGE.ANALYSIS(caseId)),

  /** GET apps/cases/{id}/questions — the ≤5 selected questions + answers. */
  getQuestions: (caseId: string): Promise<SiagaApiResponse<TriageQuestionSet>> => apiClient.get(API_ENDPOINTS.TRIAGE.QUESTIONS(caseId)),

  /** POST apps/cases/{id}/answers — partial submissions are allowed. */
  submitAnswers: (caseId: string, payload: ISubmitAnswersPayload): Promise<SiagaApiResponse<TriageQuestionSet>> =>
    apiClient.post(API_ENDPOINTS.TRIAGE.ANSWERS(caseId), payload),

  /** POST apps/cases/{id}/recommendation — idempotent; composes once. */
  composeRecommendation: (caseId: string): Promise<SiagaApiResponse<TriageRecommendation>> => apiClient.post(API_ENDPOINTS.TRIAGE.RECOMMENDATION(caseId), {}),

  /** GET apps/cases/{id}/recommendation — 404 until it is composed. */
  getRecommendation: (caseId: string): Promise<SiagaApiResponse<TriageRecommendation>> => apiClient.get(API_ENDPOINTS.TRIAGE.RECOMMENDATION(caseId)),
}
