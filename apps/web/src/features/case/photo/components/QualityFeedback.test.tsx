import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { SiagaCasePhoto } from '@/types/siaga-photo'
import EscalateSection from './EscalateSection'
import QualityResultCard from './QualityResultCard'
import RetakeTipsPanel from './RetakeTipsPanel'

function makePhoto(overrides: Partial<SiagaCasePhoto> = {}): SiagaCasePhoto {
  return {
    photoId: 'photo-1',
    caseId: 'case-1',
    slotNo: 1,
    qualityStatus: 'ditolak',
    rejectReasons: ['buram', 'gelap'],
    retakeCount: 1,
    exifStripped: true,
    signedUrl: null,
    createdAt: '2026-07-29T00:00:00Z',
    ...overrides,
  }
}

describe('QualityResultCard', () => {
  test('rejected photo shows simple reasons — never technical scores', () => {
    render(<QualityResultCard photo={makePhoto()} />)

    expect(screen.getByTestId('quality-status')).toHaveTextContent('Perlu Foto Ulang')
    expect(screen.getByText('Foto buram')).toBeInTheDocument()
    expect(screen.getByText('Kurang cahaya')).toBeInTheDocument()
    expect(document.body.textContent?.toLowerCase()).not.toMatch(/skor|score|\d+\.\d+/)
  })

  test('ambang photo shows the accepted-with-warning copy', () => {
    render(
      <QualityResultCard
        photo={makePhoto({ qualityStatus: 'ambang', rejectReasons: [] })}
      />
    )

    expect(screen.getByTestId('quality-status')).toHaveTextContent(
      'Diterima dengan Catatan'
    )
    expect(screen.getByTestId('ambang-note')).toBeInTheDocument()
  })
})

describe('RetakeTipsPanel', () => {
  test('maps each rejection reason to its specific tip with before/after', () => {
    render(<RetakeTipsPanel reasons={['terlalu_jauh']} onRetake={vi.fn()} />)

    expect(screen.getByTestId('retake-tips-panel')).toHaveTextContent(
      /Dekatkan kamera/
    )
    expect(screen.getByText('Sebelum')).toBeInTheDocument()
    expect(screen.getByText('Sesudah')).toBeInTheDocument()
  })

  test('retake button returns the user to the camera', () => {
    const onRetake = vi.fn()
    render(<RetakeTipsPanel reasons={['buram']} onRetake={onRetake} />)

    fireEvent.click(screen.getByTestId('retake-button'))

    expect(onRetake).toHaveBeenCalledTimes(1)
  })
})

describe('EscalateSection — FR-004 3-failure reveal', () => {
  test('hidden until canEscalate is true', () => {
    render(
      <EscalateSection
        isVisible={false}
        isEscalating={false}
        error={null}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.queryByTestId('escalate-section')).not.toBeInTheDocument()
  })

  test('visible after 3 failures; confirming fires the escalation', () => {
    const onConfirm = vi.fn()
    render(
      <EscalateSection
        isVisible
        isEscalating={false}
        error={null}
        onConfirm={onConfirm}
      />
    )

    fireEvent.click(screen.getByTestId('escalate-button'))
    // Honest copy shown in the open confirmation: no auto-diagnosis promised.
    expect(screen.getByText(/TIDAK dianalisis otomatis/)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('escalate-confirm'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
