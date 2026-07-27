import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StagedProgress } from './StagedProgress'

describe('StagedProgress', () => {
  it("renders 'Analisis gambar' as the running named stage for QUEUED", () => {
    // Act
    render(<StagedProgress status="QUEUED" />)

    // Assert — named stages, never a bare spinner
    expect(screen.getByTestId('stage-0')).toHaveAttribute('data-state', 'done')
    expect(screen.getByTestId('stage-1')).toHaveAttribute('data-state', 'running')
    expect(screen.getByTestId('stage-1')).toHaveTextContent('Analisis gambar')
    expect(screen.getByTestId('stage-1')).toHaveTextContent('sedang berjalan')
    expect(screen.getByTestId('stage-2')).toHaveAttribute('data-state', 'pending')
    expect(screen.getByTestId('stage-3')).toHaveAttribute('data-state', 'pending')
  })

  it("renders 'Pertanyaan lanjutan' running for NEEDS_CONTEXT", () => {
    // Act
    render(<StagedProgress status="NEEDS_CONTEXT" />)

    // Assert
    expect(screen.getByTestId('stage-0')).toHaveAttribute('data-state', 'done')
    expect(screen.getByTestId('stage-1')).toHaveAttribute('data-state', 'done')
    expect(screen.getByTestId('stage-2')).toHaveAttribute('data-state', 'running')
    expect(screen.getByTestId('stage-2')).toHaveTextContent('Pertanyaan lanjutan')
  })

  it('renders all stages done for AUTO_TRIAGE_READY', () => {
    // Act
    render(<StagedProgress status="AUTO_TRIAGE_READY" />)

    // Assert
    for (const index of [0, 1, 2, 3]) {
      expect(screen.getByTestId(`stage-${index}`)).toHaveAttribute('data-state', 'done')
    }
  })

  it('shows the honest reprocessing note for FAILED', () => {
    // Act
    render(<StagedProgress status="FAILED" />)

    // Assert
    expect(screen.getByTestId('stage-reprocessing-note')).toHaveTextContent('sedang diproses ulang')
  })
})
