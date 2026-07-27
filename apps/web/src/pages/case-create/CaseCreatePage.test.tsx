import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/cases.service', () => ({
  casesService: {
    create: vi.fn(),
    getAll: vi.fn(),
    getOne: vi.fn(),
    getTimeline: vi.fn(),
  },
}))
vi.mock('@/services/farmer-profile.service', () => ({
  farmerProfileService: {
    updateProfile: vi.fn(),
    createField: vi.fn(),
    updateField: vi.fn(),
    getFields: vi.fn(),
    requestDeletion: vi.fn(),
    getDeletionRequest: vi.fn(),
  },
}))

import { useCaseWizardStore } from '@/features/case/create'
import { useFieldsStore } from '@/features/case/fields'
import { casesService } from '@/services/cases.service'
import { farmerProfileService } from '@/services/farmer-profile.service'
import { useAssistedStore } from '@/stores/useAssistedStore'
import type { SiagaApiResponse } from '@/types/api'
import type { SiagaCase, SiagaField } from '@/types/siaga-case'
import CaseCreatePage from './CaseCreatePage'

function envelope<T>(data: T): SiagaApiResponse<T> {
  return {
    metaData: { status: true, executionTime: 1, responseCode: 200, message: 'Success' },
    data,
    additionalInfo: null,
    copyright: 'siaga-padi',
  }
}

const FIELD_FIXTURE: SiagaField = {
  fieldId: 'field-1',
  ownerProfileId: 'profile-1',
  name: 'Sawah belakang rumah',
  areaKabupaten: 'Karawang',
  areaKecamatan: 'Rengasdengklok',
  coords: null,
  lastGrowthStage: 'VEGETATIVE',
  caseCount: 2,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
}

const CREATED_CASE: SiagaCase = {
  caseId: 'case-1',
  caseCode: 'KS-2026-000123',
  ownerProfileId: 'profile-1',
  ownerDisplayName: 'Pak Budi',
  createdByProfileId: 'profile-1',
  createdByDisplayName: 'Pak Budi',
  assistedSessionId: null,
  fieldId: 'field-1',
  fieldName: 'Sawah belakang rumah',
  growthStage: 'UNKNOWN',
  locationMode: 'NONE',
  areaKabupaten: null,
  areaKecamatan: null,
  status: 'DRAFT',
  displayStage: 'draf',
  notes: null,
  observedAt: '2026-07-26T01:40:00Z',
  createdAt: '2026-07-26T01:41:00Z',
  updatedAt: '2026-07-26T01:41:00Z',
}

type GeolocationErrorCallback = (error: {
  code: number
  message: string
  PERMISSION_DENIED: number
  POSITION_UNAVAILABLE: number
  TIMEOUT: number
}) => void

type GeolocationSuccessCallback = (position: {
  coords: { latitude: number; longitude: number }
}) => void

function mockGeolocation(behavior: 'denied' | 'granted') {
  const getCurrentPosition = vi.fn(
    (onSuccess: GeolocationSuccessCallback, onError: GeolocationErrorCallback) => {
      if (behavior === 'granted') {
        onSuccess({ coords: { latitude: -6.2, longitude: 107.1 } })
      } else {
        onError({
          code: 1,
          message: 'User denied Geolocation',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        })
      }
    }
  )
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  })
  return getCurrentPosition
}

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/periksa-tanaman']}>
      <Routes>
        <Route path="/periksa-tanaman" element={<CaseCreatePage />} />
        <Route path="/kasus/:caseId/foto" element={<div data-testid="photo-placeholder-route" />} />
      </Routes>
    </MemoryRouter>
  )
}

/** Walks step 1 (pick existing lahan) → step 2. */
async function completeStepOne(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId('lahan-option-field-1'))
  await user.click(screen.getByRole('button', { name: /lanjut/i }))
  await screen.findByTestId('gps-optional-banner')
}

describe('CaseCreatePage (wizard)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCaseWizardStore.getState().resetAfterSuccess()
    useCaseWizardStore.getState().dismissQueuedNotice()
    useFieldsStore.setState({ fields: [], isLoading: false, isSaving: false, error: null })
    useAssistedStore.getState().clearSession()
    vi.mocked(farmerProfileService.getFields).mockResolvedValue(envelope([FIELD_FIXTURE]))
  })

  it('GPS denied → automatic fallback to the manual AREA_ONLY form', async () => {
    // Arrange
    const user = userEvent.setup()
    const getCurrentPosition = mockGeolocation('denied')
    renderWizard()
    await completeStepOne(user)

    // Act — explicit tap only
    await user.click(screen.getByTestId('location-option-gps'))

    // Assert — refusal notice + manual kabupaten→kecamatan inputs shown
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(await screen.findByTestId('gps-refused-notice')).toBeInTheDocument()
    expect(screen.getByTestId('area-manual-form')).toBeInTheDocument()
    expect(screen.getByTestId('location-option-area')).toHaveAttribute('aria-pressed', 'true')
  })

  it('failed submit keeps input and retries with the SAME idempotency key; success regenerates it', async () => {
    // Arrange — create rejects once, then succeeds
    const user = userEvent.setup()
    vi.mocked(casesService.create)
      .mockRejectedValueOnce({ status: 503, message: 'Gangguan jaringan.', additionalInfo: null })
      .mockResolvedValueOnce(envelope({ case: CREATED_CASE, replayed: false }))
    renderWizard()
    const initialKey = useCaseWizardStore.getState().idempotencyKey

    await completeStepOne(user)

    // Step 2 — "belum tahu" location + "belum tahu" growth stage
    await user.click(screen.getByTestId('location-option-none'))
    await user.click(screen.getByTestId('growth-stage-UNKNOWN'))
    await user.click(screen.getByRole('button', { name: /lanjut/i }))

    // Step 3 — first submit fails
    await user.click(await screen.findByTestId('wizard-submit-button'))
    expect(await screen.findByTestId('wizard-submit-error')).toHaveTextContent('Gangguan jaringan.')

    // Input preserved: summary still shows the chosen lahan
    expect(screen.getByTestId('wizard-summary-card')).toHaveTextContent('Sawah belakang rumah')

    // Act — retry
    await user.click(screen.getByTestId('wizard-submit-button'))

    // Assert — same key sent twice, then a fresh key after success
    await waitFor(() => {
      expect(casesService.create).toHaveBeenCalledTimes(2)
    })
    const [firstCall, secondCall] = vi.mocked(casesService.create).mock.calls
    expect(firstCall[1]).toBe(initialKey)
    expect(secondCall[1]).toBe(initialKey)
    expect(await screen.findByTestId('photo-placeholder-route')).toBeInTheDocument()
    expect(useCaseWizardStore.getState().idempotencyKey).not.toBe(initialKey)
  })

  it('offline queue acknowledgement (202) is reported as saved, not as a failure', async () => {
    // Arrange — the service worker queued the draft instead of reaching the API
    const user = userEvent.setup()
    const initialKeyBefore = useCaseWizardStore.getState().idempotencyKey
    vi.mocked(casesService.create).mockResolvedValue(
      envelope({ queued: true as const, idempotencyKey: initialKeyBefore })
    )
    renderWizard()

    await completeStepOne(user)
    await user.click(screen.getByTestId('location-option-none'))
    await user.click(screen.getByTestId('growth-stage-UNKNOWN'))
    await user.click(screen.getByRole('button', { name: /lanjut/i }))

    // Act
    await user.click(await screen.findByTestId('wizard-submit-button'))

    // Assert — honest "stored on device" notice, never the failure alert
    expect(await screen.findByTestId('wizard-submit-queued')).toHaveTextContent(
      /otomatis terkirim saat Anda kembali online/i
    )
    expect(screen.queryByTestId('wizard-submit-error')).not.toBeInTheDocument()
    // A NEW key is minted so editing + resubmitting cannot silently replay
    // (and thus discard) the already-queued draft.
    expect(useCaseWizardStore.getState().idempotencyKey).not.toBe(initialKeyBefore)
  })

  it('"belum tahu" branch submits locationMode NONE without coords or area', async () => {
    // Arrange
    const user = userEvent.setup()
    vi.mocked(casesService.create).mockResolvedValue(envelope({ case: CREATED_CASE, replayed: false }))
    renderWizard()

    await completeStepOne(user)
    await user.click(screen.getByTestId('location-option-none'))
    await user.click(screen.getByTestId('growth-stage-UNKNOWN'))
    await user.click(screen.getByRole('button', { name: /lanjut/i }))

    // Act
    await user.click(await screen.findByTestId('wizard-submit-button'))

    // Assert — exact "belum tahu" payload shape
    await waitFor(() => {
      expect(casesService.create).toHaveBeenCalledTimes(1)
    })
    const [payload] = vi.mocked(casesService.create).mock.calls[0]
    expect(payload.locationMode).toBe('NONE')
    expect(payload.fieldId).toBe('field-1')
    expect(payload.growthStage).toBe('UNKNOWN')
    expect(payload).not.toHaveProperty('coords')
    expect(payload).not.toHaveProperty('areaKabupaten')
    expect(payload).not.toHaveProperty('areaKecamatan')
    expect(payload).not.toHaveProperty('assistedSessionId')
  })

  it('assisted mode shows the "atas nama" context and sends assistedSessionId', async () => {
    // Arrange — active assisted session (penyuluh flow)
    const user = userEvent.setup()
    useAssistedStore.getState().setActiveSession({
      sessionId: 'assist-1',
      subject: { profileId: 'profile-9', displayName: 'Bu Sari' },
      consentMethod: 'lisan',
      startedAt: '2026-07-26T00:00:00Z',
    })
    vi.mocked(casesService.create).mockResolvedValue(envelope({ case: CREATED_CASE, replayed: false }))
    renderWizard()

    // Assert — subject context visible, existing-lahan list hidden (own lahan ≠ subject's)
    expect(await screen.findByTestId('wizard-assisted-context')).toHaveTextContent('atas nama Bu Sari')
    expect(screen.queryByTestId('lahan-option-field-1')).not.toBeInTheDocument()

    // Act — new lahan for the subject, then belum tahu + fase, then submit
    await user.click(screen.getByTestId('lahan-option-new'))
    await user.type(screen.getByLabelText('Nama lahan'), 'Sawah Bu Sari')
    await user.click(screen.getByRole('button', { name: /lanjut/i }))
    await screen.findByTestId('gps-optional-banner')
    await user.click(screen.getByTestId('location-option-none'))
    await user.click(screen.getByTestId('growth-stage-SEEDLING'))
    await user.click(screen.getByRole('button', { name: /lanjut/i }))
    await user.click(await screen.findByTestId('wizard-submit-button'))

    // Assert
    await waitFor(() => {
      expect(casesService.create).toHaveBeenCalledTimes(1)
    })
    const [payload] = vi.mocked(casesService.create).mock.calls[0]
    expect(payload.assistedSessionId).toBe('assist-1')
    expect(payload.newField).toEqual({ name: 'Sawah Bu Sari' })
    expect(payload).not.toHaveProperty('fieldId')
  })
})
