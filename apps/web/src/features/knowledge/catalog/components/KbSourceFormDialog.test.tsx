import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

import { kbService } from '@/services/kb.service'
import type { SiagaApiResponse } from '@/types/api'
import { useKbCatalogStore } from '../store/useKbCatalogStore'
import { KbSourceFormDialog } from './KbSourceFormDialog'

function envelope<T>(data: T): SiagaApiResponse<T> {
  return {
    metaData: { status: true, executionTime: 1, responseCode: 200, message: 'Success' },
    data,
    additionalInfo: null,
    copyright: 'siaga-padi',
  }
}

const REGISTER_RESULT = {
  source: {
    sourceId: 'src-1',
    title: 'Pengendalian Penyakit Blas',
    publisher: 'BB Padi',
    publishedDate: '2024',
    editionVersion: 'v2',
    licenseNote: 'Dokumen publik pemerintah',
    category: null,
    sourceUrl: null,
    status: 'draf' as const,
    availabilityStatus: 'tersedia' as const,
    lastReviewedAt: null,
    retiredAt: null,
    chunkTotal: 3,
    chunkPending: 3,
    chunkApproved: 0,
    createdAt: '2026-08-08T04:12:00+00:00',
  },
  ingest: {
    sourceId: 'src-1',
    chunkCount: 3,
    pendingCount: 3,
    refCodes: ['RUJ-BLAS-001', 'RUJ-BLAS-002', 'RUJ-UMUM-001'],
  },
}

async function fillIdentityStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId('kb-source-title'), 'Pengendalian Penyakit Blas')
  await user.type(screen.getByTestId('kb-source-publisher'), 'BB Padi')
  await user.click(screen.getByTestId('kb-source-next'))
}

describe('KbSourceFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useKbCatalogStore.setState({
      sources: [],
      isSaving: false,
      error: null,
      lastIngest: null,
    })
    vi.mocked(kbService.getAllSources).mockResolvedValue(envelope([]))
  })

  it('blocks the next step while the title is missing', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<KbSourceFormDialog open onOpenChange={vi.fn()} />)

    // Act
    await user.click(screen.getByTestId('kb-source-next'))

    // Assert — still on step 1
    expect(await screen.findByText(/judul minimal 3 karakter/i)).toBeInTheDocument()
    expect(screen.getByTestId('kb-source-title')).toBeInTheDocument()
  })

  it('requires the license note before the document step', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<KbSourceFormDialog open onOpenChange={vi.fn()} />)

    // Act
    await fillIdentityStep(user)
    await user.click(screen.getByTestId('kb-source-next'))

    // Assert
    expect(
      await screen.findByText(/catatan lisensi minimal 3 karakter/i)
    ).toBeInTheDocument()
  })

  it('refuses to submit without a document to split', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<KbSourceFormDialog open onOpenChange={vi.fn()} />)

    // Act
    await fillIdentityStep(user)
    await user.type(screen.getByTestId('kb-source-license'), 'Dokumen publik pemerintah')
    await user.click(screen.getByTestId('kb-source-next'))
    await user.click(screen.getByTestId('kb-source-submit'))

    // Assert
    expect(await screen.findByTestId('kb-source-document-error')).toBeInTheDocument()
    expect(kbService.registerSource).not.toHaveBeenCalled()
  })

  it('registers the source with its license and pasted document text', async () => {
    // Arrange
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    vi.mocked(kbService.registerSource).mockResolvedValue(envelope(REGISTER_RESULT))
    render(<KbSourceFormDialog open onOpenChange={onOpenChange} />)

    // Act
    await fillIdentityStep(user)
    await user.type(screen.getByTestId('kb-source-license'), 'Dokumen publik pemerintah')
    await user.click(screen.getByTestId('kb-source-next'))
    await user.type(
      screen.getByTestId('kb-source-content'),
      'Blas daun pada fase anakan.'
    )
    await user.click(screen.getByTestId('kb-source-submit'))

    // Assert
    await waitFor(() => expect(kbService.registerSource).toHaveBeenCalledTimes(1))
    expect(kbService.registerSource).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Pengendalian Penyakit Blas',
        publisher: 'BB Padi',
        licenseNote: 'Dokumen publik pemerintah',
        content: 'Blas daun pada fase anakan.',
      })
    )
    expect(useKbCatalogStore.getState().lastIngest?.pendingCount).toBe(3)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
