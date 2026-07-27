import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  DISPLAY_STAGE_BADGE_CLASSES,
  DISPLAY_STAGE_LABELS,
  GROWTH_STAGE_LABELS,
} from '@/features/case/case-labels'
import type { SiagaCase } from '@/types/siaga-case'
import { cn } from '@/utils/cn'

interface CaseCardProps {
  caseItem: SiagaCase
}

/** Riwayat card — ringkasan dulu, detail di balik ketukan (Tani Ramah rule #2). */
export function CaseCard({ caseItem }: CaseCardProps) {
  const observedLabel = new Date(caseItem.observedAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Link
      to={`/kasus/${caseItem.caseId}`}
      data-testid={`case-card-${caseItem.caseId}`}
      className="flex min-h-11 flex-col gap-2 rounded-2xl border border-border-primary bg-card p-4 shadow-sm transition-shadow hover:shadow-lg"
      aria-label={`Buka detail kasus ${caseItem.caseCode}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-body-lg font-semibold text-font-primary">{caseItem.caseCode}</p>
        <Badge
          className={cn(
            'shrink-0 rounded-lg border text-label-sm font-semibold',
            DISPLAY_STAGE_BADGE_CLASSES[caseItem.displayStage]
          )}
        >
          {DISPLAY_STAGE_LABELS[caseItem.displayStage]}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-font-secondary">
        <span className="flex items-center gap-1">
          <i className="ph ph-plant" aria-hidden="true" />
          {caseItem.fieldName ?? 'Tanpa lahan'}
        </span>
        <span className="flex items-center gap-1">
          <i className="ph ph-leaf" aria-hidden="true" />
          {GROWTH_STAGE_LABELS[caseItem.growthStage]}
        </span>
        <span className="flex items-center gap-1">
          <i className="ph ph-calendar-blank" aria-hidden="true" />
          {observedLabel}
        </span>
      </div>

      {caseItem.ownerDisplayName && caseItem.createdByProfileId !== caseItem.ownerProfileId && (
        <p className="flex items-center gap-1 text-body-sm text-font-secondary">
          <i className="ph ph-handshake" aria-hidden="true" />
          Atas nama {caseItem.ownerDisplayName}
        </p>
      )}
    </Link>
  )
}
