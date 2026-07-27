import { create } from 'zustand'
import type { GrowthStage, LocationMode, SiagaCoords } from '@/types/siaga-case'

export type TWizardStep = 1 | 2 | 3

export type TFieldChoiceMode = 'existing' | 'new'

export interface ICaseWizardDraft {
  /* Step 1 — lahan */
  fieldMode: TFieldChoiceMode
  fieldId: string | null
  /** Display name of the chosen lahan, for the summary card. */
  fieldName: string | null
  newFieldName: string
  newFieldKabupaten: string
  newFieldKecamatan: string
  /* Step 2 — lokasi & fase */
  locationMode: LocationMode | null
  coords: SiagaCoords | null
  areaKabupaten: string
  areaKecamatan: string
  growthStage: GrowthStage | null
  /** `datetime-local` input value (local time, no timezone). */
  observedAt: string
}

interface CaseWizardStore {
  step: TWizardStep
  /**
   * Generated ONCE per wizard session, reused across submit retries so the
   * backend replays the same case (FR-002 ERR-003), regenerated only after a
   * successful create. Deliberately NOT persisted: a fresh app start is a
   * fresh wizard session.
   */
  idempotencyKey: string
  draft: ICaseWizardDraft
  /**
   * True after the service worker stored the submission locally (HTTP 202).
   * Lives in the store — not in the summary step — because the wizard resets
   * to step 1 on queueing, which would unmount any step-local notice.
   */
  isQueuedNoticeVisible: boolean
  setStep: (step: TWizardStep) => void
  /** Immutable partial update — always produces a new draft object. */
  updateDraft: (patch: Partial<ICaseWizardDraft>) => void
  /** Clears every input and mints a NEW idempotency key (post-success only). */
  resetAfterSuccess: () => void
  /** Marks the draft as queued for background delivery (offline submit). */
  markQueued: () => void
  /** Dismisses the queued notice so a new case can be started cleanly. */
  dismissQueuedNotice: () => void
}

const EMPTY_DRAFT: ICaseWizardDraft = {
  fieldMode: 'existing',
  fieldId: null,
  fieldName: null,
  newFieldName: '',
  newFieldKabupaten: '',
  newFieldKecamatan: '',
  locationMode: null,
  coords: null,
  areaKabupaten: '',
  areaKecamatan: '',
  growthStage: null,
  observedAt: '',
}

function createIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Case wizard state — Zustand (not local state) so back navigation between
 * steps preserves every input, a failed submit loses nothing, and the Sprint
 * 03 photo flow can keep extending the same store.
 */
export const useCaseWizardStore = create<CaseWizardStore>((set) => ({
  step: 1,
  idempotencyKey: createIdempotencyKey(),
  draft: EMPTY_DRAFT,
  isQueuedNoticeVisible: false,

  setStep: (step) => set({ step }),

  updateDraft: (patch) =>
    set((state) => ({
      draft: { ...state.draft, ...patch },
    })),

  resetAfterSuccess: () =>
    set({
      step: 1,
      idempotencyKey: createIdempotencyKey(),
      draft: EMPTY_DRAFT,
    }),

  markQueued: () => set({ isQueuedNoticeVisible: true }),

  dismissQueuedNotice: () => set({ isQueuedNoticeVisible: false }),
}))
