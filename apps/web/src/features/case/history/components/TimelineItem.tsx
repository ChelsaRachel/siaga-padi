import { DISPLAY_STAGE_LABELS } from '@/features/case/case-labels'
import type { SiagaCaseEvent } from '@/types/siaga-case'
import { cn } from '@/utils/cn'

interface TimelineItemProps {
  event: SiagaCaseEvent
  isLast: boolean
}

function eventTitle(event: SiagaCaseEvent): string {
  if (event.fromStatus === null) {
    return 'Kasus dibuat'
  }
  return DISPLAY_STAGE_LABELS[event.toDisplayStage] ?? event.toStatus
}

/** Satu titik pada linimasa kronologis kasus (creation event first). */
export function TimelineItem({ event, isLast }: TimelineItemProps) {
  const isCreation = event.fromStatus === null
  const timestamp = new Date(event.createdAt).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return (
    <li className="flex items-start gap-3" data-testid={`timeline-item-${event.eventId}`}>
      <div className="flex flex-col items-center self-stretch">
        <i
          className={cn(
            'text-h6',
            isCreation ? 'ph-fill ph-flag text-primary-base' : 'ph-fill ph-circle text-primary-soft'
          )}
          aria-hidden="true"
        />
        {!isLast && <span className="my-0.5 w-0.5 flex-1 rounded-full bg-border-secondary" aria-hidden="true" />}
      </div>
      <div className="min-w-0 pb-4">
        <p className="text-body-md font-semibold text-font-primary" data-testid="timeline-item-title">
          {eventTitle(event)}
        </p>
        <p className="text-body-sm text-font-secondary">{timestamp}</p>
        {event.actorDisplayName && (
          <p className="text-body-sm text-font-secondary">oleh {event.actorDisplayName}</p>
        )}
        {event.note && <p className="mt-1 text-body-sm text-font-primary">{event.note}</p>}
      </div>
    </li>
  )
}
