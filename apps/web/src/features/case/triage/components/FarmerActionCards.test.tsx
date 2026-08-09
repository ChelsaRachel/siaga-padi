import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TriageRecommendation } from '@/types/siaga-triage'
import { FarmerActionCards } from './FarmerActionCards'

function makeRecommendation(
  overrides: Partial<TriageRecommendation> = {}
): TriageRecommendation {
  return {
    recommendationId: 'rec-1',
    caseId: 'case-1',
    analysisId: 'analysis-1',
    origin: 'ai_engine',
    farmerView: {
      indikasi: 'Kemungkinan Blas Daun.',
      lakukan: [
        { text: 'Kurangi genangan air.', refCodes: ['RUJ-BLAS-004'] },
        { text: 'Bersihkan gulma di pematang.', refCodes: ['RUJ-UMUM-001'] },
      ],
      pantau: [{ text: 'Amati daun muda.', refCodes: ['RUJ-UMUM-001'] }],
      hindari: [],
      eskalasi: 'Hubungi penyuluh bila gejala meluas.',
    },
    technicalView: null,
    refCodes: ['RUJ-BLAS-004', 'RUJ-UMUM-001'],
    caseStatus: 'AUTO_TRIAGE_READY',
    caseDisplayStage: 'hasil_siap',
    needsHumanReview: false,
    urgencyFlag: false,
    modelVersion: null,
    thresholdVersion: null,
    questionBankVersion: null,
    providerVersion: null,
    createdAt: '2026-08-09T08:00:00Z',
    updatedAt: '2026-08-09T08:05:00Z',
    ...overrides,
  }
}

describe('FarmerActionCards', () => {
  it('numbers the "lakukan sekarang" actions and renders the escalation card', () => {
    // Act
    render(
      <FarmerActionCards
        recommendation={makeRecommendation()}
        onOpenReferences={vi.fn()}
      />
    )

    // Assert
    const doSection = screen.getByTestId('farmer-section-lakukan')
    expect(doSection).toHaveTextContent('Kurangi genangan air.')
    expect(doSection.querySelector('ol')).not.toBeNull()
    expect(screen.getByTestId('farmer-section-eskalasi')).toHaveTextContent(
      'Hubungi penyuluh'
    )
  })

  it('omits a section that has no suggestions', () => {
    // Act
    render(
      <FarmerActionCards
        recommendation={makeRecommendation()}
        onOpenReferences={vi.fn()}
      />
    )

    // Assert — `hindari` is empty in the fixture
    expect(screen.queryByTestId('farmer-section-hindari')).not.toBeInTheDocument()
  })

  it('passes the suggestion own ref codes to the drawer', async () => {
    // Arrange
    const user = userEvent.setup()
    const onOpenReferences = vi.fn()
    render(
      <FarmerActionCards
        recommendation={makeRecommendation()}
        onOpenReferences={onOpenReferences}
      />
    )

    // Act — the first suggestion cites RUJ-BLAS-004 only
    await user.click(screen.getAllByTestId('suggestion-refs')[0])

    // Assert
    expect(onOpenReferences).toHaveBeenCalledWith(['RUJ-BLAS-004'])
  })

  it('shows the limited-mode badge for a rule fallback', () => {
    // Act
    render(
      <FarmerActionCards
        recommendation={makeRecommendation({ origin: 'rule_fallback' })}
        onOpenReferences={vi.fn()}
      />
    )

    // Assert
    expect(screen.getByTestId('origin-badge')).toHaveTextContent('Mode terbatas')
  })

  it('states plainly that there is no safe advice when evidence was insufficient', () => {
    // Arrange
    const recommendation = makeRecommendation({
      origin: 'insufficient_evidence',
      farmerView: {
        indikasi: 'Bukti rujukan belum cukup.',
        lakukan: [],
        pantau: [],
        hindari: [],
        eskalasi: 'Kasus Anda diteruskan ke penyuluh.',
      },
    })

    // Act
    render(
      <FarmerActionCards recommendation={recommendation} onOpenReferences={vi.fn()} />
    )

    // Assert
    expect(screen.getByTestId('origin-badge')).toHaveTextContent('Bukti tidak cukup')
    expect(screen.getByTestId('no-actions-notice')).toHaveTextContent(
      'Belum ada saran tindakan'
    )
  })
})
