import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SiagaCaseEvent } from '@/types/siaga-case'
import { CaseTimeline } from './CaseTimeline'

function makeEvent(overrides: Partial<SiagaCaseEvent>): SiagaCaseEvent {
  return {
    eventId: 'evt-1',
    caseId: 'case-1',
    fromStatus: 'DRAFT',
    toStatus: 'CAPTURED',
    toDisplayStage: 'difoto',
    actorProfileId: 'profile-1',
    actorDisplayName: 'Pak Budi',
    note: null,
    createdAt: '2026-07-20T08:00:00Z',
    ...overrides,
  }
}

describe('CaseTimeline', () => {
  it('renders events chronologically with the creation event first, even when input is unsorted', () => {
    // Arrange — deliberately out of order
    const events: SiagaCaseEvent[] = [
      makeEvent({
        eventId: 'evt-later',
        fromStatus: 'CAPTURED',
        toStatus: 'QUEUED',
        toDisplayStage: 'diproses',
        createdAt: '2026-07-22T10:00:00Z',
      }),
      makeEvent({
        eventId: 'evt-creation',
        fromStatus: null,
        toStatus: 'DRAFT',
        toDisplayStage: 'draf',
        createdAt: '2026-07-20T08:00:00Z',
      }),
      makeEvent({
        eventId: 'evt-middle',
        fromStatus: 'DRAFT',
        toStatus: 'CAPTURED',
        toDisplayStage: 'difoto',
        createdAt: '2026-07-21T09:00:00Z',
      }),
    ]

    // Act
    render(<CaseTimeline events={events} />)

    // Assert — DOM order matches chronological order
    const titles = screen.getAllByTestId('timeline-item-title').map((node) => node.textContent)
    expect(titles).toEqual(['Kasus dibuat', 'Difoto', 'Diproses'])
  })

  it('labels the creation event (fromStatus null) as "Kasus dibuat"', () => {
    // Arrange
    const events = [makeEvent({ eventId: 'evt-creation', fromStatus: null, toDisplayStage: 'draf' })]

    // Act
    render(<CaseTimeline events={events} />)

    // Assert
    expect(screen.getByTestId('timeline-item-title')).toHaveTextContent('Kasus dibuat')
  })

  it('shows an empty state when there are no events', () => {
    // Act
    render(<CaseTimeline events={[]} />)

    // Assert
    expect(screen.getByText('Belum ada aktivitas pada kasus ini.')).toBeInTheDocument()
  })
})
