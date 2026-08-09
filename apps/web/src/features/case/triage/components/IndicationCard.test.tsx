import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/types/siaga-triage'
import { IndicationCard } from './IndicationCard'

/**
 * The card is the farmer's whole view of the model's verdict, so these tests
 * are mostly about what must NOT appear: no score, no forced label when the
 * system abstained, and never a missing disclaimer.
 */

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    analysisId: 'analysis-1',
    caseId: 'case-1',
    indication: 'Blas Daun',
    confidenceBand: 'tinggi',
    abstainStatus: 'yakin',
    abstainMessage: null,
    requiresReview: false,
    disclaimer: 'Ini indikasi awal, bukan diagnosis final.',
    candidates: [
      { label: 'blas_daun', displayLabel: 'Blas Daun', calibratedScore: null },
    ],
    qualityPenalty: null,
    modelVersion: null,
    thresholdVersion: null,
    evidenceMaps: null,
    createdAt: '2026-08-09T08:00:00Z',
    ...overrides,
  }
}

describe('IndicationCard', () => {
  it('shows the indication, the band and the disclaimer for a confident result', () => {
    // Act
    render(<IndicationCard result={makeResult()} />)

    // Assert
    expect(screen.getByTestId('indication-headline')).toHaveTextContent('Blas Daun')
    expect(screen.getByTestId('confidence-band')).toHaveTextContent('Keyakinan tinggi')
    expect(
      screen.getByText('Ini indikasi awal, bukan diagnosis final.')
    ).toBeInTheDocument()
  })

  it('never renders a raw score for a petani payload', () => {
    // Act
    const { container } = render(<IndicationCard result={makeResult()} />)

    // Assert — a petani response carries no score, so no percentage may appear
    expect(container.textContent).not.toMatch(/\d+%/)
  })

  it('shows the honest "Tidak Yakin" copy and no forced label when abstaining', () => {
    // Arrange
    const result = makeResult({
      indication: null,
      abstainStatus: 'tidak_yakin',
      abstainMessage: 'Sistem belum yakin dengan foto ini.',
      confidenceBand: 'rendah',
      requiresReview: true,
      candidates: [],
    })

    // Act
    render(<IndicationCard result={result} />)

    // Assert
    expect(screen.getByTestId('indication-headline')).toHaveTextContent('Tidak Yakin')
    expect(screen.getByTestId('abstain-message')).toHaveTextContent('belum yakin')
    expect(screen.getByTestId('review-note')).toHaveTextContent('antrean review')
    expect(screen.queryByTestId('confidence-band')).not.toBeInTheDocument()
  })

  it('renders the conflict badge for contradicting photos', () => {
    // Arrange
    const result = makeResult({
      indication: null,
      abstainStatus: 'konflik',
      abstainMessage: 'Foto-foto Anda mengarah ke dugaan yang berbeda.',
      requiresReview: true,
    })

    // Act
    render(<IndicationCard result={result} />)

    // Assert
    expect(screen.getByTestId('indication-card')).toHaveAttribute(
      'data-abstain',
      'konflik'
    )
    expect(screen.getByTestId('indication-headline')).toHaveTextContent('Konflik')
  })
})
