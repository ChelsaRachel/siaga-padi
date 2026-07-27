import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DISPLAY_STAGE_BADGE_CLASSES,
  DISPLAY_STAGE_LABELS,
  GROWTH_STAGE_LABELS,
} from '@/features/case/case-labels'
import type { SiagaCase } from '@/types/siaga-case'
import { cn } from '@/utils/cn'

interface CaseDetailHeaderProps {
  caseData: SiagaCase
  onRefresh: () => void
  isRefreshing: boolean
}

/** Header kasus: caseCode, badge displayStage, lahan, fase, waktu pengamatan. */
export function CaseDetailHeader({ caseData, onRefresh, isRefreshing }: CaseDetailHeaderProps) {
  const observedLabel = new Date(caseData.observedAt).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return (
    <Card className="rounded-3xl border-border-primary" data-testid="case-detail-header">
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-h5 font-bold text-font-primary">{caseData.caseCode}</h1>
            {caseData.ownerDisplayName && (
              <p className="text-body-sm text-font-secondary">Milik {caseData.ownerDisplayName}</p>
            )}
          </div>
          <Badge
            data-testid="case-detail-stage-badge"
            className={cn(
              'shrink-0 rounded-lg border text-label-sm font-semibold',
              DISPLAY_STAGE_BADGE_CLASSES[caseData.displayStage]
            )}
          >
            {DISPLAY_STAGE_LABELS[caseData.displayStage]}
          </Badge>
        </div>

        <dl className="grid grid-cols-1 gap-2 text-body-md sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <i className="ph ph-plant text-h6 text-primary-base" aria-hidden="true" />
            <dt className="sr-only">Lahan</dt>
            <dd className="truncate text-font-primary">{caseData.fieldName ?? 'Tanpa lahan'}</dd>
          </div>
          <div className="flex items-center gap-2">
            <i className="ph ph-leaf text-h6 text-primary-base" aria-hidden="true" />
            <dt className="sr-only">Fase pertumbuhan</dt>
            <dd className="truncate text-font-primary">{GROWTH_STAGE_LABELS[caseData.growthStage]}</dd>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <i className="ph ph-clock text-h6 text-primary-base" aria-hidden="true" />
            <dt className="sr-only">Waktu pengamatan</dt>
            <dd className="text-font-primary">Diamati {observedLabel}</dd>
          </div>
        </dl>

        <Button
          type="button"
          variant="outline"
          size="md"
          className="w-full rounded-xl font-semibold sm:w-auto sm:self-start"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <i
            className={cn('ph ph-arrows-clockwise text-h6', isRefreshing && 'animate-spin')}
            aria-hidden="true"
          />
          Perbarui Status
        </Button>
      </CardContent>
    </Card>
  )
}
