import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/kb.service', () => ({
  kbService: {
    registerSource: vi.fn(),
    getAllSources: vi.fn(),
    getSource: vi.fn(),
    updateSource: vi.fn(),
    ingestSource: vi.fn(),
    retireSource: vi.fn(),
    getAllChunks: vi.fn(),
    getChunkByRef: vi.fn(),
    getChunkDiff: vi.fn(),
    approveChunk: vi.fn(),
    rejectChunk: vi.fn(),
    reviseChunk: vi.fn(),
    retrievalTest: vi.fn(),
  },
}))

import { useKbCatalogStore } from '@/features/knowledge/catalog'
import { kbService } from '@/services/kb.service'
import { useAuthStore } from '@/stores/useAuthStore'
import type { SiagaApiResponse } from '@/types/api'
import type { SiagaKbSource } from '@/types/siaga-kb'
import KbCatalogPage from './KbCatalogPage'

function envelope<T>(data: T, totalElements = 1): SiagaApiResponse<T> {
  return {
    metaData: {
      status: true,
      executionTime: 1,
      responseCode: 200,
      message: 'Success',
      pagination: { size: 10, totalElements, totalPages: 1 },
    },
    data,
    additionalInfo: null,
    copyright: 'siaga-padi',
  }
}

const SOURCE: SiagaKbSource = {
  sourceId: 'src-1',
  title: 'Pengendalian Penyakit Blas',
  publisher: 'BB Padi',
  publishedDate: '2024',
  editionVersion: 'v2',
  licenseNote: 'Dokumen publik pemerintah',
  category: 'panduan',
  sourceUrl: null,
  status: 'draf',
  availabilityStatus: 'tersedia',
  lastReviewedAt: null,
  retiredAt: null,
  chunkTotal: 3,
  chunkPending: 3,
  chunkApproved: 0,
  createdAt: '2026-08-08T04:12:00+00:00',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/pengetahuan']}>
      <KbCatalogPage />
    </MemoryRouter>
  )
}

describe('KbCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useKbCatalogStore.setState({
      sources: [],
      page: 1,
      totalPage: 1,
      totalItem: 0,
      filters: {},
      isLoading: false,
      isSaving: false,
      error: null,
      lastIngest: null,
    })
    useAuthStore.setState({
      profile: {
        profileId: 'profile-admin-1',
        displayName: 'Sari Admin',
        role: 'admin',
      } as never,
      isAuthenticated: true,
    })
    vi.mocked(kbService.getAllSources).mockResolvedValue(envelope([SOURCE]))
  })

  it('lists sources with their license note and pending tally', async () => {
    // Arrange & Act
    renderPage()

    // Assert
    expect(await screen.findByTestId('kb-source-row-src-1')).toHaveTextContent(
      'Dokumen publik pemerintah'
    )
    expect(screen.getByTestId('kb-source-pending-src-1')).toHaveTextContent(
      '3 menunggu review'
    )
  })

  it('refetches with the status filter the admin picks', async () => {
    // Arrange
    const user = userEvent.setup()
    renderPage()
    await screen.findByTestId('kb-source-row-src-1')

    // Act
    await user.selectOptions(
      screen.getByTestId('kb-catalog-status-filter'),
      'disetujui'
    )

    // Assert
    await waitFor(() =>
      expect(kbService.getAllSources).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, filters: { status: 'disetujui' } })
      )
    )
  })

  it('hides the registration action from a domain reviewer', async () => {
    // Arrange
    useAuthStore.setState({
      profile: {
        profileId: 'profile-reviewer-1',
        displayName: 'Rudi Reviewer',
        role: 'domain_reviewer',
      } as never,
    })

    // Act
    renderPage()
    await screen.findByTestId('kb-source-row-src-1')

    // Assert
    expect(screen.queryByTestId('kb-catalog-add')).not.toBeInTheDocument()
  })
})
