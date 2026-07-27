import { useMemo } from 'react'
import type { SiagaCaseEvent } from '@/types/siaga-case'
import { TimelineItem } from './TimelineItem'

interface CaseTimelineProps {
  events: SiagaCaseEvent[]
}

/**
 * Linimasa kronologis (dibuat → … → selesai). The contract returns events
 * ascending by createdAt; we sort defensively (immutably) so the creation
 * event is always first even if a caller passes unsorted data.
 */
export function CaseTimeline({ events }: CaseTimelineProps) {
  const orderedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [events]
  )

  if (orderedEvents.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border-secondary bg-background-secondary p-4 text-body-md text-font-secondary">
        Belum ada aktivitas pada kasus ini.
      </p>
    )
  }

  return (
    <ol className="flex flex-col" data-testid="case-timeline" aria-label="Linimasa kasus">
      {orderedEvents.map((event, index) => (
        <TimelineItem key={event.eventId} event={event} isLast={index === orderedEvents.length - 1} />
      ))}
    </ol>
  )
}
