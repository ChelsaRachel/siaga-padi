/**
 * Staged-progress derivation — implements the contract table
 * (docs/api-spec-case.md § Staged progress) exactly. Driven by the canonical
 * `status`; `displayStage` only decides WHETHER the view is shown.
 */

export type TStageState = 'done' | 'running' | 'pending'

export interface IStagedProgressItem {
  label: string
  state: TStageState
}

/**
 * Rank a status for "reached/passed" comparisons. Unknown statuses (FAILED,
 * CANCELLED, future values) have no rank — every stage falls back to pending
 * and the caller shows the honest reprocessing note where applicable.
 */
const STATUS_RANK: Record<string, number> = {
  DRAFT: 0,
  CAPTURED: 1,
  QUALITY_REJECTED: 1,
  QUEUED: 2,
  PROCESSING_CV: 2,
  NEEDS_CONTEXT: 3,
  GENERATING_RECOMMENDATION: 4,
  AUTO_TRIAGE_READY: 5,
  NEEDS_REVIEW: 5,
  REVISION_REQUIRED: 5,
  REVIEWED: 5,
  CLOSED: 5,
  ARCHIVED: 5,
}

interface IStageDefinition {
  label: string
  /** Status values for which this stage is the one currently running. */
  runningStatuses: string[]
  /** Stage is done once the case status rank reaches this threshold. */
  doneFromRank: number
}

/** Contract § Staged progress — named stages, never a bare spinner. */
const STAGE_DEFINITIONS: IStageDefinition[] = [
  { label: 'Foto diterima', runningStatuses: ['CAPTURED', 'QUALITY_REJECTED'], doneFromRank: 2 },
  { label: 'Analisis gambar', runningStatuses: ['QUEUED', 'PROCESSING_CV'], doneFromRank: 3 },
  { label: 'Pertanyaan lanjutan', runningStatuses: ['NEEDS_CONTEXT'], doneFromRank: 4 },
  { label: 'Rekomendasi', runningStatuses: ['GENERATING_RECOMMENDATION'], doneFromRank: 5 },
]

export function deriveStagedProgress(status: string): IStagedProgressItem[] {
  const rank = STATUS_RANK[status]

  return STAGE_DEFINITIONS.map((stage) => {
    if (stage.runningStatuses.includes(status)) {
      return { label: stage.label, state: 'running' as const }
    }
    if (rank !== undefined && rank >= stage.doneFromRank) {
      return { label: stage.label, state: 'done' as const }
    }
    return { label: stage.label, state: 'pending' as const }
  })
}

/** FAILED shows an honest "sedang diproses ulang" note — never an endless spinner. */
export function isReprocessingStatus(status: string): boolean {
  return status === 'FAILED'
}
