import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { PhotoUploadResult, SiagaCasePhoto } from '@/types/siaga-photo'
import { photosService } from '@/services/photos.service'
import { buildCounterLabel, selectNextSlot, selectShouldAutoContinue, usePhotoFlowStore } from './usePhotoFlowStore'

vi.mock('@/services/photos.service', () => ({
  photosService: {
    upload: vi.fn(),
    getAll: vi.fn(),
    escalate: vi.fn(),
  },
}))

const mockedUpload = vi.mocked(photosService.upload)
const mockedEscalate = vi.mocked(photosService.escalate)

function makePhoto(overrides: Partial<SiagaCasePhoto> = {}): SiagaCasePhoto {
  return {
    photoId: 'photo-1',
    caseId: 'case-1',
    slotNo: 1,
    qualityStatus: 'layak',
    rejectReasons: [],
    retakeCount: 0,
    exifStripped: true,
    signedUrl: 'https://signed.example/p.jpg',
    createdAt: '2026-07-29T00:00:00Z',
    ...overrides,
  }
}

function makeUploadResult(overrides: Partial<PhotoUploadResult> = {}): { data: PhotoUploadResult } {
  return {
    data: {
      photo: makePhoto(),
      replayed: false,
      acceptedCount: 1,
      canEscalate: false,
      caseStatus: 'DRAFT',
      caseDisplayStage: 'draf',
      ...overrides,
    },
  }
}

async function captureAndConfirm(blobContent = 'foto-a') {
  const store = usePhotoFlowStore.getState()
  store.capture(new Blob([blobContent]), 'blob:preview')
  return usePhotoFlowStore.getState().confirmCapture('case-1')
}

beforeEach(() => {
  usePhotoFlowStore.getState().reset()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePhotoFlowStore — upload transitions', () => {
  test('confirmCapture uploads and lands on terkirim with the server verdict', async () => {
    // Arrange
    mockedUpload.mockResolvedValue(makeUploadResult() as never)

    // Act
    const outcome = await captureAndConfirm()

    // Assert
    const state = usePhotoFlowStore.getState()
    expect(outcome).toBe('uploaded')
    expect(state.slots[1].uploadState).toBe('terkirim')
    expect(state.slots[1].result?.qualityStatus).toBe('layak')
    expect(state.acceptedCount).toBe(1)
    expect(state.step).toBe('hasil')
  })

  test('failure while online marks the slot gagal and keeps the blob', async () => {
    mockedUpload.mockRejectedValue(new Error('server down') as never)

    const outcome = await captureAndConfirm()

    const slot = usePhotoFlowStore.getState().slots[1]
    expect(outcome).toBe('failed')
    expect(slot.uploadState).toBe('gagal')
    expect(slot.blob).not.toBeNull()
  })

  test('failure while offline marks the slot menunggu_jaringan (photo kept)', async () => {
    mockedUpload.mockRejectedValue(new Error('network') as never)
    vi.stubGlobal('navigator', { onLine: false })

    await captureAndConfirm()

    const slot = usePhotoFlowStore.getState().slots[1]
    expect(slot.uploadState).toBe('menunggu_jaringan')
    expect(slot.blob).not.toBeNull()
  })

  test('retry re-sends the SAME blob and fingerprint after a failure', async () => {
    mockedUpload.mockRejectedValueOnce(new Error('flaky') as never)
    await captureAndConfirm()
    const failedSlot = usePhotoFlowStore.getState().slots[1]

    mockedUpload.mockResolvedValue(makeUploadResult() as never)
    await usePhotoFlowStore.getState().retryUpload('case-1', 1)

    const retriedSlot = usePhotoFlowStore.getState().slots[1]
    expect(mockedUpload).toHaveBeenCalledTimes(2)
    expect(mockedUpload.mock.calls[1][1]).toBe(failedSlot.blob)
    expect(retriedSlot.fingerprint).toBe(failedSlot.fingerprint)
    expect(retriedSlot.uploadState).toBe('terkirim')
  })

  test('identical bytes already delivered are blocked client-side', async () => {
    mockedUpload.mockResolvedValue(makeUploadResult() as never)
    await captureAndConfirm('foto-sama')

    const outcome = await captureAndConfirm('foto-sama')

    expect(outcome).toBe('duplicate')
    expect(mockedUpload).toHaveBeenCalledTimes(1)
  })
})

describe('usePhotoFlowStore — counter, auto-continue, escalation', () => {
  test('next slot skips slots that already hold an accepted photo', async () => {
    mockedUpload.mockResolvedValue(makeUploadResult() as never)
    await captureAndConfirm('foto-satu')

    const next = selectNextSlot(usePhotoFlowStore.getState().slots)

    expect(next).toBe(2)
  })

  test('counter follows the minimum-2 / max-3 rule', () => {
    expect(buildCounterLabel(0)).toBe('Foto 1 dari 2 (maks 3)')
    expect(buildCounterLabel(1)).toBe('Foto 2 dari 2 (maks 3)')
    expect(buildCounterLabel(2)).toBe('Foto 3 dari 2 (maks 3)')
    expect(buildCounterLabel(3)).toBe('Foto 3 dari 2 (maks 3)')
  })

  test('auto-continue fires only at 2 accepted photos', () => {
    expect(selectShouldAutoContinue(0)).toBe(false)
    expect(selectShouldAutoContinue(1)).toBe(false)
    expect(selectShouldAutoContinue(2)).toBe(true)
  })

  test('escalate flags the case for human review and clears canEscalate', async () => {
    mockedEscalate.mockResolvedValue({
      data: {
        caseId: 'case-1',
        needsHumanReview: true,
        caseStatus: 'CAPTURED',
        caseDisplayStage: 'difoto',
      },
    } as never)

    const isEscalated = await usePhotoFlowStore.getState().escalate('case-1')

    const state = usePhotoFlowStore.getState()
    expect(isEscalated).toBe(true)
    expect(state.needsHumanReview).toBe(true)
    expect(state.canEscalate).toBe(false)
    expect(state.caseStatus).toBe('CAPTURED')
  })
})
