import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { KbChunkDiff, KbChunkVersion } from '@/types/siaga-kb'
import { ChunkDiffView } from './ChunkDiffView'

const BASE_VERSION: KbChunkVersion = {
  chunkId: 'chk-1',
  version: 1,
  content: 'Teks lama.',
  diseaseTags: ['blas_daun'],
  phaseTags: ['vegetatif'],
  actionType: 'pencegahan',
  audience: 'penyuluh',
  risk: 'aman',
  policyFlag: null,
  approvalStatus: 'disetujui',
  isCurrent: false,
  createdAt: '2026-08-01T00:00:00+00:00',
}

const DIFF: KbChunkDiff = {
  refCode: 'RUJ-BLAS-004',
  base: BASE_VERSION,
  compare: {
    ...BASE_VERSION,
    chunkId: 'chk-2',
    version: 2,
    content: 'Teks baru edisi 2025.',
    approvalStatus: 'menunggu',
    isCurrent: true,
    createdAt: '2026-08-08T04:12:00+00:00',
  },
  changedFields: ['approval_status', 'content'],
  contentDiff: [
    { op: '-', text: 'Teks lama.' },
    { op: '+', text: 'Teks baru edisi 2025.' },
  ],
}

describe('ChunkDiffView', () => {
  it('shows both versions of the same ref code', () => {
    // Arrange & Act
    render(<ChunkDiffView diff={DIFF} />)

    // Assert
    expect(screen.getByTestId('kb-diff-view')).toHaveTextContent(
      'RUJ-BLAS-004 — versi 1 → 2'
    )
  })

  it('names the changed fields in Indonesian', () => {
    // Arrange & Act
    render(<ChunkDiffView diff={DIFF} />)

    // Assert
    expect(screen.getByTestId('kb-diff-fields')).toHaveTextContent(
      /status persetujuan, isi teks/i
    )
  })

  it('renders removed and added lines distinctly', () => {
    // Arrange & Act
    render(<ChunkDiffView diff={DIFF} />)

    // Assert
    expect(screen.getByTestId('kb-diff-line--')).toHaveTextContent('Teks lama.')
    expect(screen.getByTestId('kb-diff-line-+')).toHaveTextContent(
      'Teks baru edisi 2025.'
    )
  })

  it('states plainly when two versions do not differ', () => {
    // Arrange
    const identical: KbChunkDiff = {
      ...DIFF,
      changedFields: [],
      contentDiff: [{ op: '=', text: 'Teks lama.' }],
    }

    // Act
    render(<ChunkDiffView diff={identical} />)

    // Assert
    expect(screen.getByTestId('kb-diff-fields')).toHaveTextContent(
      /tidak ada perbedaan/i
    )
  })
})
