import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GROWTH_STAGE_LABELS } from '@/features/case/case-labels'
import type { SiagaField } from '@/types/siaga-case'

interface FieldCardProps {
  field: SiagaField
  /** Opens the edit form; the card body itself links to the lahan's riwayat. */
  onEdit: (field: SiagaField) => void
}

function formatArea(field: SiagaField): string {
  const parts = [field.areaKecamatan, field.areaKabupaten].filter(
    (part): part is string => typeof part === 'string' && part.length > 0
  )
  return parts.length > 0 ? parts.join(', ') : 'Area belum diisi'
}

/**
 * Lahan gallery card — nama, area, fase terakhir, jumlah kasus.
 * Tapping the card opens the lahan's case history (preset filter, Task 03).
 */
export function FieldCard({ field, onEdit }: FieldCardProps) {
  const caseCount = field.caseCount ?? 0

  return (
    <div
      data-testid={`field-card-${field.fieldId}`}
      className="flex flex-col gap-3 rounded-2xl border border-border-primary bg-card p-4 shadow-sm transition-shadow hover:shadow-lg"
    >
      <Link
        to={`/riwayat?fieldId=${encodeURIComponent(field.fieldId)}`}
        className="flex min-h-11 flex-col gap-2"
        aria-label={`Lihat riwayat kasus lahan ${field.name}`}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-deep">
            <i className="ph-fill ph-plant text-h5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-body-lg font-semibold text-font-primary">{field.name}</p>
            <p className="truncate text-body-sm text-font-secondary">{formatArea(field)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {field.lastGrowthStage && (
            <Badge className="rounded-lg border-primary-soft bg-primary-light text-label-sm font-medium text-primary-deep">
              Fase: {GROWTH_STAGE_LABELS[field.lastGrowthStage]}
            </Badge>
          )}
          <Badge className="rounded-lg border-neutral-soft bg-neutral-light text-label-sm font-medium text-font-primary">
            {caseCount} kasus
          </Badge>
        </div>
      </Link>
      <Button
        type="button"
        variant="outline"
        size="md"
        className="w-full rounded-xl"
        onClick={() => onEdit(field)}
      >
        <i className="ph ph-pencil-simple text-h6" aria-hidden="true" />
        Ubah Lahan
      </Button>
    </div>
  )
}
