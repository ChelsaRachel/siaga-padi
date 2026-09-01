/**
 * Siaga Padi AI-triage domain types — mirrors `docs/api-spec-triage.md`
 * § Shared types (Sprint 05 pinned FE ↔ BE contract). All fields camelCase,
 * exactly as the contract defines them.
 *
 * The `| null` on every technical field is load-bearing, not defensive typing:
 * the server BUILDS a petani response without scores, versions or evidence
 * maps. A component that renders `calibratedScore` for a farmer renders
 * nothing, because there is nothing there — the role split is enforced
 * server-side and the types say so.
 */

/** The 4 MVP classes (FR-005). */
export type CvLabel = 'sehat' | 'blas_daun' | 'hawar_daun_bakteri' | 'bercak_coklat'

/** Calibrated confidence translated for a farmer. */
export type ConfidenceBand = 'tinggi' | 'sedang' | 'rendah'

/** "Tidak Yakin" and "Konflik" are valid RESULTS, never errors. */
export type AbstainStatus = 'yakin' | 'tidak_yakin' | 'konflik'

/** Answering is never forced — "tidak_tahu" is a first-class answer. */
export type TriageAnswer = 'ya' | 'tidak' | 'tidak_tahu'

/** Where a recommendation came from (brief 03 §5.1 "Asal keluaran"). */
export type RecommendationOrigin = 'ai_engine' | 'rule_fallback' | 'insufficient_evidence'

export interface AnalysisCandidate {
  label: CvLabel
  /** Plain-language label for display. */
  displayLabel: string
  /** Technical viewers only — null for petani. */
  calibratedScore: number | null
}

export interface AnalysisResult {
  analysisId: string
  caseId: string
  /** Petani-facing headline; null while the system abstains. */
  indication: string | null
  confidenceBand: ConfidenceBand
  abstainStatus: AbstainStatus
  /** Honest explanation, present whenever abstainStatus is not 'yakin'. */
  abstainMessage: string | null
  requiresReview: boolean
  disclaimer: string
  /** Petani receives the headline candidate only; penyuluh receives up to 3. */
  candidates: AnalysisCandidate[]
  /** Technical viewers only. */
  qualityPenalty: boolean | null
  modelVersion: string | null
  thresholdVersion: string | null
  /** Reviewer-only per-photo highlight refs — Sprint 06 renders them. */
  evidenceMaps: Array<Record<string, unknown>> | null
  createdAt: string | null
}

export interface TriageQuestion {
  questionId: string
  code: string
  text: string
  illustration: string | null
  /** Short "mengapa ditanya" note shown under the question. */
  whyAsked: string
  /** The answer already recorded for this case, when there is one. */
  answer: TriageAnswer | null
}

export interface TriageQuestionSet {
  caseId: string
  questions: TriageQuestion[]
  totalCount: number
  answeredCount: number
  questionBankVersion: string
  caseStatus: string
  caseDisplayStage: string
}

/** One actionable line plus the references that justify it. */
export interface TriageSuggestion {
  text: string
  refCodes: string[]
}

export interface RecommendationFarmerView {
  indikasi: string
  lakukan: TriageSuggestion[]
  pantau: TriageSuggestion[]
  hindari: TriageSuggestion[]
  eskalasi: string
}

export interface RecommendationTechnicalView {
  ringkasan: string
  ketidakpastian: string
  kutipan: TriageSuggestion[]
  penanda: string[]
}

export interface TriageRecommendation {
  recommendationId: string
  caseId: string
  analysisId: string
  origin: RecommendationOrigin
  farmerView: RecommendationFarmerView
  /** Technical viewers only — null for petani. */
  technicalView: RecommendationTechnicalView | null
  refCodes: string[]
  caseStatus: string
  caseDisplayStage: string
  needsHumanReview: boolean
  urgencyFlag: boolean
  modelVersion: string | null
  thresholdVersion: string | null
  questionBankVersion: string | null
  providerVersion: string | null
  createdAt: string | null
  updatedAt: string | null
}
