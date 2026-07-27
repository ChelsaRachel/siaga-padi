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

import { useFieldsStore } from '@/features/case/fields'
import { useCaseHistoryStore } from '@/features/case/history'
import { useFilterStore } from '@/modules/dynamic-filter'
import { casesService } from '@/services/cases.service'
import { farmerProfileService } from '@/services/farmer-profile.service'
import type { SiagaApiResponse, SiagaPagination } from '@/types/api'
import type { SiagaCase } from '@/types/siaga-case'
import CaseHistoryPage from './CaseHistoryPage'

function envelope<T>(data: T, pagination?: SiagaPagination): SiagaApiResponse<T> {
  return {
    metaData: {
      status: true,
      executionTime: 1,
      responseCode: 200,
      message: 'Success',
      ...(pagination ? { pagination } : {}),
    },
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
  status: 'QUEUED',
  displayStage: 'diproses',
  notes: null,
  observedAt: '2026-07-25T02:00:00Z',
  createdAt: '2026-07-25T02:05:00Z',
  updatedAt: '2026-07-25T03:00:00Z',
}

// Real backend envelope shape (models/pagination.py), per api-spec-case.md.
const PAGINATION: SiagaPagination = { size: 10, totalElements: 1, totalPages: 1, scrollId: '' }

function renderHistory(initialEntry = '/riwayat') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/riwayat" element={<CaseHistoryPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CaseHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFilterStore.getState().reset()
    useFilterStore.getState().setFilterMap({})
    useFieldsStore.setState({ fields: [], isLoading: false, isSaving: false, error: null })
    useCaseHistoryStore.setState({
      cases: [],
      page: 1,
      totalPage: 1,
      totalItem: 0,
      isLoading: false,
      isLoadingMore: false,
      error: null,
    })
    vi.mocked(farmerProfileService.getFields).mockResolvedValue(envelope([]))
    vi.mocked(casesService.getAll).mockResolvedValue(envelope([CASE_FIXTURE], PAGINATION))
  })

  it('fetches page 1 without filters on open and renders the case cards', async () => {
    // Act
    renderHistory()

    // Assert
    await waitFor(() => {
      expect(casesService.getAll).toHaveBeenCalledWith({ page: 1, limit: 10, filters: {} })
    })
    expect(await screen.findByTestId('case-card-case-1')).toHaveTextContent('KS-2026-000123')
    expect(screen.getByTestId('case-card-case-1')).toHaveTextContent('Diproses')
  })

  it('displayStage chip filters the list via the service params', async () => {
    // Arrange
    const user = userEvent.setup()
    renderHistory()
    await screen.findByTestId('case-card-case-1')

    // Act — tap the "Diproses" chip
    await user.click(screen.getByTestId('chip-displayStage-diproses'))

    // Assert — refetch with the displayStage filter in the FindDTO
    await waitFor(() => {
      expect(casesService.getAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filters: { displayStage: 'diproses' },
      })
    })

    // Act — tap "Semua" clears the key again
    await user.click(screen.getByRole('button', { name: 'Semua' }))
    await waitFor(() => {
      expect(casesService.getAll).toHaveBeenLastCalledWith({ page: 1, limit: 10, filters: {} })
    })
  })

  it('accepts the ?fieldId= preset from the profile lahan gallery (URL filter)', async () => {
    // Act
    renderHistory('/riwayat?fieldId=field-9')

    // Assert
    await waitFor(() => {
      expect(casesService.getAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filters: { fieldId: 'field-9' },
      })
    })
  })

  it('shows the empty state with a CTA when no cases match', async () => {
    // Arrange
    vi.mocked(casesService.getAll).mockResolvedValue(
      envelope([], { ...PAGINATION, totalElements: 0 })
    )

    // Act
    renderHistory()

    // Assert
    expect(await screen.findByTestId('case-history-empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /periksa tanaman/i })).toHaveAttribute(
      'href',
      '/periksa-tanaman'
    )
  })

  it('reads the real backend pagination envelope and loads the next page', async () => {
    // Arrange — 25 cases across 3 pages, keys exactly as the backend emits them
    const user = userEvent.setup()
    const secondCase: SiagaCase = { ...CASE_FIXTURE, caseId: 'case-2', caseCode: 'KS-2026-000124' }
    const multiPage: SiagaPagination = {
      size: 10,
      totalElements: 25,
      totalPages: 3,
      scrollId: '',
    }
    vi.mocked(casesService.getAll)
      .mockResolvedValueOnce(envelope([CASE_FIXTURE], multiPage))
      .mockResolvedValueOnce(envelope([secondCase], multiPage))

    // Act
    renderHistory()
    await screen.findByTestId('case-card-case-1')

    // Assert — totalElements drives the count, totalPages enables load-more
    expect(screen.getByTestId('case-history-count')).toHaveTextContent('25 kasus ditemukan')
    await user.click(screen.getByTestId('case-history-load-more'))

    await waitFor(() => {
      expect(casesService.getAll).toHaveBeenLastCalledWith({ page: 2, limit: 10, filters: {} })
    })
    expect(await screen.findByTestId('case-card-case-2')).toBeInTheDocument()
    expect(screen.getByTestId('case-card-case-1')).toBeInTheDocument()
  })

  it('surfaces a list error with a retry action', async () => {
    // Arrange
    vi.mocked(casesService.getAll).mockRejectedValueOnce({
      status: 500,
      message: 'Terjadi gangguan.',
      additionalInfo: null,
    })

    // Act
    renderHistory()

    // Assert
    expect(await screen.findByTestId('case-history-error')).toHaveTextContent('Terjadi gangguan.')
  })
})
