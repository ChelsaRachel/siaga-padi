import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@/services/cases.service', () => ({
  casesService: {
    create: vi.fn(),
    getAll: vi.fn(),
    getOne: vi.fn(),
    getTimeline: vi.fn(),
  },
}))

import { casesService } from '@/services/cases.service'
import type { SiagaApiResponse } from '@/types/api'
import type { SiagaCase } from '@/types/siaga-case'
import CaseDetailPage from './CaseDetailPage'

function envelope<T>(data: T): SiagaApiResponse<T> {
  return {
    metaData: { status: true, executionTime: 1, responseCode: 200, message: 'Success' },
    data,
    additionalInfo: null,
    copyright: 'siaga-padi',
  }
}

const CASE_FIXTURE: SiagaCase = {
  caseId: 'case-1',
  caseCode: 'KS-2026-000123',
  ownerProfileId: 'profile-1',
  ownerDisplayName: 'Pak Budi',
  createdByProfileId: 'profile-1',
  createdByDisplayName: 'Pak Budi',
  assistedSessionId: null,
  fieldId: 'field-1',
  fieldName: 'Sawah belakang rumah',
  growthStage: 'VEGETATIVE',
  locationMode: 'AREA_ONLY',
  areaKabupaten: 'Karawang',
  areaKecamatan: 'Rengasdengklok',
  status: 'DRAFT',
  displayStage: 'draf',
  notes: null,
  observedAt: '2026-07-25T02:00:00Z',
  createdAt: '2026-07-25T02:05:00Z',
  updatedAt: '2026-07-25T03:00:00Z',
}

function renderDetail(overrides: Partial<SiagaCase> = {}) {
  vi.mocked(casesService.getOne).mockResolvedValue(envelope({ ...CASE_FIXTURE, ...overrides }))
  vi.mocked(casesService.getTimeline).mockResolvedValue(envelope([]))
  return render(
    <MemoryRouter initialEntries={['/kasus/case-1']}>
      <Routes>
        <Route path="/kasus/:caseId" element={<CaseDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CaseDetailPage — resuming the photo flow', () => {
  test('a draft case offers a way back into the photo flow', async () => {
    // Act
    renderDetail({ status: 'DRAFT', displayStage: 'draf' })

    // Assert — a farmer who left mid-capture can return to the camera.
    const link = await screen.findByRole('link', { name: /lanjutkan foto/i })
    expect(link).toHaveAttribute('href', '/kasus/case-1/foto')
  })

  test('a quality-rejected case offers the retake path', async () => {
    renderDetail({ status: 'QUALITY_REJECTED', displayStage: 'draf' })

    const link = await screen.findByRole('link', { name: /foto ulang/i })
    expect(link).toHaveAttribute('href', '/kasus/case-1/foto')
  })

  test('a case sent back for revision offers the retake path', async () => {
    renderDetail({ status: 'REVISION_REQUIRED', displayStage: 'revisi' })

    expect(await screen.findByRole('link', { name: /foto ulang/i })).toBeInTheDocument()
  })

  test('a case past the photo stage does not offer the photo flow', async () => {
    renderDetail({ status: 'REVIEWED', displayStage: 'selesai' })

    // Wait for the loaded state before asserting absence.
    expect(await screen.findByTestId('case-detail-header')).toBeInTheDocument()
    expect(screen.queryByTestId('resume-photo-card')).not.toBeInTheDocument()
  })
})
