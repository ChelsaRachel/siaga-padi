import { describe, expect, it } from 'vitest'
import { deriveStagedProgress, isReprocessingStatus } from './staged-progress'

describe('deriveStagedProgress', () => {
  it("marks 'Analisis gambar' running (and 'Foto diterima' done) for QUEUED", () => {
    // Act
    const stages = deriveStagedProgress('QUEUED')

    // Assert
    expect(stages).toEqual([
      { label: 'Foto diterima', state: 'done' },
      { label: 'Analisis gambar', state: 'running' },
      { label: 'Pertanyaan lanjutan', state: 'pending' },
      { label: 'Rekomendasi', state: 'pending' },
    ])
  })

  it("marks 'Pertanyaan lanjutan' running for NEEDS_CONTEXT with earlier stages done", () => {
    // Act
    const stages = deriveStagedProgress('NEEDS_CONTEXT')

    // Assert
    expect(stages).toEqual([
      { label: 'Foto diterima', state: 'done' },
      { label: 'Analisis gambar', state: 'done' },
      { label: 'Pertanyaan lanjutan', state: 'running' },
      { label: 'Rekomendasi', state: 'pending' },
    ])
  })

  it('marks every stage done for AUTO_TRIAGE_READY', () => {
    // Act
    const stages = deriveStagedProgress('AUTO_TRIAGE_READY')

    // Assert
    expect(stages.every((stage) => stage.state === 'done')).toBe(true)
  })

  it("keeps 'Foto diterima' running while quality is rejected (retake loop)", () => {
    // Act
    const stages = deriveStagedProgress('QUALITY_REJECTED')

    // Assert
    expect(stages[0]).toEqual({ label: 'Foto diterima', state: 'running' })
    expect(stages.slice(1).every((stage) => stage.state === 'pending')).toBe(true)
  })

  it('falls back to all-pending for unknown/failed statuses (no fake progress)', () => {
    // Act
    const stages = deriveStagedProgress('FAILED')

    // Assert
    expect(stages.every((stage) => stage.state === 'pending')).toBe(true)
  })
})

describe('isReprocessingStatus', () => {
  it('flags FAILED as reprocessing (honest note instead of endless spinner)', () => {
    expect(isReprocessingStatus('FAILED')).toBe(true)
    expect(isReprocessingStatus('QUEUED')).toBe(false)
  })
})
