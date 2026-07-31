import { create } from 'zustand'
import { photosService } from '@/services/photos.service'
import type { PhotoSlotNo, PhotoUploadResult, SiagaCasePhoto } from '@/types/siaga-photo'
import { parseApiError } from '@/utils/parse-api-error'
import { fingerprintBlob } from '../utils/fingerprint'

export const MIN_ACCEPTED_PHOTOS = 2
export const MAX_PHOTO_SLOTS = 3
export const PHOTO_SLOTS: PhotoSlotNo[] = [1, 2, 3]

export type TPhotoFlowStep = 'intro' | 'camera' | 'preview' | 'hasil'

/**
 * Per-photo delivery state. Copy rule: `terkirim` is set ONLY after the
 * server confirms — never while the request is in flight. Sprint 07's
 * offline queue reuses this shape (`fingerprint` + pending states).
 */
export type TUploadState = 'idle' | 'mengirim' | 'menunggu_jaringan' | 'terkirim' | 'gagal'

export interface IPhotoSlot {
  slotNo: PhotoSlotNo
  /** Kept on-device for retry — the SAME bytes must be re-sent (dedup). */
  blob: Blob | null
  previewUrl: string | null
  fingerprint: string | null
  uploadState: TUploadState
  progress: number
  /** Server verdict for the LAST attempt on this slot. */
  result: SiagaCasePhoto | null
  error: string | null
}

interface IPendingCapture {
  blob: Blob
  previewUrl: string
}

export type TConfirmOutcome = 'uploaded' | 'duplicate' | 'failed'

interface PhotoFlowStore {
  step: TPhotoFlowStep
  activeSlot: PhotoSlotNo
  slots: Record<PhotoSlotNo, IPhotoSlot>
  pendingCapture: IPendingCapture | null
  /* Server truth (from upload/list responses) */
  acceptedCount: number
  canEscalate: boolean
  needsHumanReview: boolean
  caseStatus: string
  caseDisplayStage: string
  isEscalating: boolean
  escalateError: string | null

  setStep: (step: TPhotoFlowStep) => void
  /** Camera shutter / gallery pick → preview step. */
  capture: (blob: Blob, previewUrl: string) => void
  /** "Foto Ulang" on the preview — discard and reopen the camera. */
  discardCapture: () => void
  /**
   * "Pakai Foto Ini" — fingerprint, client-side dedup, then upload with
   * progress. Identical bytes already delivered → 'duplicate', no request.
   */
  confirmCapture: (caseId: string) => Promise<TConfirmOutcome>
  /** Re-send with the SAME blob/fingerprint (server replays, no double photo). */
  retryUpload: (caseId: string, slotNo: PhotoSlotNo) => Promise<void>
  /** Connection back → re-send everything still waiting on the device. */
  retryPendingUploads: (caseId: string) => Promise<void>
  /** Rejected result → back to the camera for the same slot. */
  goToRetake: (slotNo: PhotoSlotNo) => void
  /** FR-004 "Kirim ke Penyuluh Saja" (only after 3 failures on a slot). */
  escalate: (caseId: string) => Promise<boolean>
  /** Hydrate server state on open/reload. */
  syncFromServer: (caseId: string) => Promise<void>
  reset: () => void
}

const emptySlot = (slotNo: PhotoSlotNo): IPhotoSlot => ({
  slotNo,
  blob: null,
  previewUrl: null,
  fingerprint: null,
  uploadState: 'idle',
  progress: 0,
  result: null,
  error: null,
})

const emptySlots = (): Record<PhotoSlotNo, IPhotoSlot> => ({
  1: emptySlot(1),
  2: emptySlot(2),
  3: emptySlot(3),
})

const INITIAL_STATE = {
  step: 'intro' as TPhotoFlowStep,
  activeSlot: 1 as PhotoSlotNo,
  pendingCapture: null,
  acceptedCount: 0,
  canEscalate: false,
  needsHumanReview: false,
  caseStatus: 'DRAFT',
  caseDisplayStage: 'draf',
  isEscalating: false,
  escalateError: null,
}

const isAccepted = (photo: SiagaCasePhoto | null): boolean => photo?.qualityStatus === 'layak' || photo?.qualityStatus === 'ambang'

/** First slot without an accepted photo — where the next capture goes. */
export const selectNextSlot = (slots: Record<PhotoSlotNo, IPhotoSlot>): PhotoSlotNo | null =>
  PHOTO_SLOTS.find((slot) => !isAccepted(slots[slot].result)) ?? null

/** FR-003 gate: enough accepted photos → the case auto-continues. */
export const selectShouldAutoContinue = (acceptedCount: number): boolean => acceptedCount >= MIN_ACCEPTED_PHOTOS

/** "Foto 1 dari 2 (maks 3)" — counted by photos already accepted. */
export const buildCounterLabel = (acceptedCount: number): string => {
  const current = Math.min(acceptedCount + 1, MAX_PHOTO_SLOTS)
  return `Foto ${current} dari ${MIN_ACCEPTED_PHOTOS} (maks ${MAX_PHOTO_SLOTS})`
}

export const usePhotoFlowStore = create<PhotoFlowStore>((set, get) => ({
  ...INITIAL_STATE,
  slots: emptySlots(),

  setStep: (step) => set({ step }),

  capture: (blob, previewUrl) => set({ pendingCapture: { blob, previewUrl }, step: 'preview' }),

  discardCapture: () => set({ pendingCapture: null, step: 'camera' }),

  confirmCapture: async (caseId) => {
    const { pendingCapture, slots } = get()
    if (!pendingCapture) {
      return 'failed'
    }
    const fingerprint = await fingerprintBlob(pendingCapture.blob)
    const isAlreadyDelivered = PHOTO_SLOTS.some((slot) => slots[slot].fingerprint === fingerprint && slots[slot].uploadState === 'terkirim')
    if (isAlreadyDelivered) {
      // Client-side anti-duplicate: identical bytes already on the case.
      set({ pendingCapture: null, step: 'camera' })
      return 'duplicate'
    }
    const slotNo = selectNextSlot(slots) ?? get().activeSlot
    set((state) => ({
      pendingCapture: null,
      step: 'hasil',
      activeSlot: slotNo,
      slots: {
        ...state.slots,
        [slotNo]: {
          ...emptySlot(slotNo),
          blob: pendingCapture.blob,
          previewUrl: pendingCapture.previewUrl,
          fingerprint,
        },
      },
    }))
    return get()
      .retryUpload(caseId, slotNo)
      .then(() => {
        const { slots: after } = get()
        return after[slotNo].uploadState === 'terkirim' ? 'uploaded' : 'failed'
      })
  },

  retryUpload: async (caseId, slotNo) => {
    const slot = get().slots[slotNo]
    if (!slot.blob || slot.uploadState === 'mengirim') {
      return
    }
    const patchSlot = (patch: Partial<IPhotoSlot>) =>
      set((state) => ({
        slots: {
          ...state.slots,
          [slotNo]: { ...state.slots[slotNo], ...patch },
        },
      }))
    patchSlot({ uploadState: 'mengirim', progress: 0, error: null })
    try {
      const response = await photosService.upload(caseId, slot.blob, slotNo, (percent) => patchSlot({ progress: percent }))
      const result = response?.data as PhotoUploadResult
      patchSlot({
        uploadState: 'terkirim',
        progress: 100,
        result: result.photo,
      })
      set({
        acceptedCount: result.acceptedCount,
        canEscalate: result.canEscalate,
        caseStatus: result.caseStatus,
        caseDisplayStage: result.caseDisplayStage,
      })
    } catch (uploadError: unknown) {
      // Connection loss keeps the photo on-device, visibly pending
      // (full offline queue arrives in Sprint 07).
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
      patchSlot({
        uploadState: isOffline ? 'menunggu_jaringan' : 'gagal',
        error: parseApiError(uploadError).message,
      })
    }
  },

  retryPendingUploads: async (caseId) => {
    const { slots } = get()
    const pendingSlots = PHOTO_SLOTS.filter((slot) => ['menunggu_jaringan', 'gagal'].includes(slots[slot].uploadState))
    for (const slotNo of pendingSlots) {
      await get().retryUpload(caseId, slotNo)
    }
  },

  goToRetake: (slotNo) => set({ activeSlot: slotNo, step: 'camera' }),

  escalate: async (caseId) => {
    set({ isEscalating: true, escalateError: null })
    try {
      const response = await photosService.escalate(caseId)
      set({
        needsHumanReview: response?.data?.needsHumanReview ?? true,
        caseStatus: response?.data?.caseStatus ?? get().caseStatus,
        caseDisplayStage: response?.data?.caseDisplayStage ?? get().caseDisplayStage,
        canEscalate: false,
      })
      return true
    } catch (escalateError: unknown) {
      set({ escalateError: parseApiError(escalateError).message })
      return false
    } finally {
      set({ isEscalating: false })
    }
  },

  syncFromServer: async (caseId) => {
    try {
      const response = await photosService.getAll(caseId)
      const data = response?.data
      if (!data) {
        return
      }
      set((state) => {
        const slots = { ...state.slots }
        for (const photo of data.photos) {
          // Latest attempt per slot wins (list is createdAt ascending).
          slots[photo.slotNo] = {
            ...slots[photo.slotNo],
            uploadState: 'terkirim',
            progress: 100,
            result: photo,
          }
        }
        return {
          slots,
          acceptedCount: data.acceptedCount,
          canEscalate: data.canEscalate,
          needsHumanReview: data.needsHumanReview,
          caseStatus: data.caseStatus,
          caseDisplayStage: data.caseDisplayStage,
        }
      })
    } catch {
      // Hydration is best-effort: the flow still works from a cold start.
    }
  },

  reset: () => set({ ...INITIAL_STATE, slots: emptySlots() }),
}))
