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
import type { SiagaKbChunk } from '@/types/siaga-kb'
import { useKbReviewStore } from '../store/useKbReviewStore'
import { ChunkDecisionBar } from './ChunkDecisionBar'

function envelope<T>(data: T): SiagaApiResponse<T> {
  return {
    metaData: { status: true, executionTime: 1, responseCode: 200, message: 'Success' },
    data,
    additionalInfo: null,
    copyright: 'siaga-padi',
  }
}

const DOSAGE_CHUNK: SiagaKbChunk = {
  chunkId: 'chk-1',
  refCode: 'RUJ-HDB-002',
  sourceId: 'src-1',
  sourceTitle: 'Materi Perlindungan Tanaman',
  sourceVersion: 'v1',
  location: 'Hal. 12',
  content: 'Bakterisida dengan dosis 2 g/l untuk hawar daun bakteri.',
  diseaseTags: ['hawar_daun_bakteri'],
  phaseTags: [],
  actionType: 'kimiawi',
  audience: 'penyuluh',
  risk: 'aman',
  policyFlag: null,
  requiredPolicyFlag: 'memuat_dosis',
  approvalStatus: 'menunggu',
  rejectReason: null,
  version: 1,
  isCurrent: true,
  validUntil: null,
  decidedAt: null,
  createdAt: '2026-08-08T04:12:00+00:00',
}

const SAFE_CHUNK: SiagaKbChunk = {
  ...DOSAGE_CHUNK,
  chunkId: 'chk-2',
  refCode: 'RUJ-BLAS-004',
  content: 'Gunakan varietas tahan blas daun dan atur jarak tanam.',
  diseaseTags: ['blas_daun'],
  actionType: 'pencegahan',
  requiredPolicyFlag: null,
}

describe('ChunkDecisionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useKbReviewStore.setState({
      chunks: [],
      isDeciding: false,
      decisionError: null,
      page: 1,
      filters: { approvalStatus: 'menunggu' },
    })
    vi.mocked(kbService.getAllChunks).mockResolvedValue(envelope([]))
  })

  it('pre-selects the policy flag the content requires', () => {
    // Arrange & Act
    render(<ChunkDecisionBar chunk={DOSAGE_CHUNK} />)

    // Assert
    expect(screen.getByTestId('kb-decision-policy-flag')).toHaveValue('memuat_dosis')
  })

  it('warns while a required policy flag is cleared', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<ChunkDecisionBar chunk={DOSAGE_CHUNK} />)

    // Act
    await user.selectOptions(screen.getByTestId('kb-decision-policy-flag'), 'tidak_ada')

    // Assert
    expect(screen.getByTestId('kb-decision-flag-hint')).toBeInTheDocument()
  })

  it('sends the policy flag with the approval', async () => {
    // Arrange
    const user = userEvent.setup()
    vi.mocked(kbService.approveChunk).mockResolvedValue(
      envelope({ ...DOSAGE_CHUNK, approvalStatus: 'disetujui' as const })
    )
    render(<ChunkDecisionBar chunk={DOSAGE_CHUNK} />)

    // Act
    await user.click(screen.getByTestId('kb-decision-approve'))

    // Assert
    await waitFor(() => expect(kbService.approveChunk).toHaveBeenCalledTimes(1))
    expect(kbService.approveChunk).toHaveBeenCalledWith(
      'chk-1',
      expect.objectContaining({ policyFlag: 'memuat_dosis' })
    )
  })

  it('keeps the reject button disabled until a reason is written', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<ChunkDecisionBar chunk={SAFE_CHUNK} />)

    // Act
    await user.click(screen.getByTestId('kb-decision-reject'))

    // Assert
    expect(screen.getByTestId('kb-decision-reject-confirm')).toBeDisabled()
    expect(screen.getByTestId('kb-decision-reason-hint')).toBeInTheDocument()
  })

  it('rejects with the reason once one is given', async () => {
    // Arrange
    const user = userEvent.setup()
    vi.mocked(kbService.rejectChunk).mockResolvedValue(
      envelope({ ...SAFE_CHUNK, approvalStatus: 'ditolak' as const })
    )
    render(<ChunkDecisionBar chunk={SAFE_CHUNK} />)

    // Act
    await user.click(screen.getByTestId('kb-decision-reject'))
    await user.type(screen.getByTestId('kb-decision-reason'), 'Memuat merek dagang')
    await user.click(screen.getByTestId('kb-decision-reject-confirm'))

    // Assert
    await waitFor(() =>
      expect(kbService.rejectChunk).toHaveBeenCalledWith('chk-2', 'Memuat merek dagang')
    )
  })

  it('surfaces the API refusal when the flag is still missing', async () => {
    // Arrange
    const user = userEvent.setup()
    vi.mocked(kbService.approveChunk).mockRejectedValue({
      response: {
        status: 400,
        data: {
          metaData: {
            status: false,
            responseCode: 400,
            message:
              'Potongan memuat dosis/merek — wajib diberi penanda kebijakan sebelum disetujui.',
          },
        },
      },
    })
    render(<ChunkDecisionBar chunk={DOSAGE_CHUNK} />)

    // Act
    await user.selectOptions(screen.getByTestId('kb-decision-policy-flag'), 'tidak_ada')
    await user.click(screen.getByTestId('kb-decision-approve'))

    // Assert
    expect(await screen.findByTestId('kb-decision-error')).toHaveTextContent(
      /penanda kebijakan/i
    )
  })
})
