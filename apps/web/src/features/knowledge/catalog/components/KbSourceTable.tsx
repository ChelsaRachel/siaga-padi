import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/utils/cn'
import type { KbSourceStatus, SiagaKbSource } from '@/types/siaga-kb'
import {
  AVAILABILITY_LABELS,
  SOURCE_STATUS_LABELS,
  formatKbDate,
  labelFor,
} from '../../kb-labels'

interface KbSourceTableProps {
  sources: SiagaKbSource[]
  /** Row click → the source's chunk list (feeds the review screen). */
  onOpenChunks: (source: SiagaKbSource) => void
  onRetire: (source: SiagaKbSource) => void
  /** False for the domain reviewer: they browse, the admin curates. */
  canManage: boolean
}

const STATUS_BADGE_CLASSES: Record<KbSourceStatus, string> = {
  draf: 'border-warning-base bg-warning-light text-warning-deep',
  disetujui: 'border-success-base bg-success-light text-success-deep',
  dipensiunkan: 'border-border-primary bg-background-secondary text-font-secondary',
}

/**
 * Catalog table — the admin's working list. Every row carries the two facts a
 * curator needs at a glance: the LEGAL basis for using the document, and how
 * many of its chunks are still waiting for a reviewer.
 */
export function KbSourceTable({
  sources,
  onOpenChunks,
  onRetire,
  canManage,
}: KbSourceTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-secondary bg-card">
      <Table data-testid="kb-source-table">
        <TableHeader>
          <TableRow>
            <TableHead>Judul &amp; penerbit</TableHead>
            <TableHead>Lisensi</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Potongan</TableHead>
            <TableHead>Terakhir ditinjau</TableHead>
            <TableHead className="sr-only">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => (
            <TableRow
              key={source.sourceId}
              className="cursor-pointer"
              data-testid={`kb-source-row-${source.sourceId}`}
              onClick={() => onOpenChunks(source)}
            >
              <TableCell>
                <span className="block font-semibold text-font-primary">
                  {source.title}
                </span>
                <span className="block text-body-sm text-font-secondary">
                  {source.publisher}
                  {source.publishedDate ? ` · ${source.publishedDate}` : ''}
                  {source.editionVersion ? ` · ${source.editionVersion}` : ''}
                </span>
              </TableCell>
              <TableCell className="max-w-[220px]">
                <span className="block text-body-sm text-font-secondary">
                  {source.licenseNote}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <Badge
                    className={cn(
                      'shrink-0 rounded-lg border text-label-sm font-semibold',
                      STATUS_BADGE_CLASSES[source.status]
                    )}
                  >
                    {SOURCE_STATUS_LABELS[source.status]}
                  </Badge>
                  <span className="text-label-sm text-font-secondary">
                    {labelFor(AVAILABILITY_LABELS, source.availabilityStatus)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className="block font-semibold text-font-primary">
                  {source.chunkTotal}
                </span>
                {source.chunkPending > 0 && (
                  <span
                    className="block text-label-sm text-warning-deep"
                    data-testid={`kb-source-pending-${source.sourceId}`}
                  >
                    {source.chunkPending} menunggu review
                  </span>
                )}
              </TableCell>
              <TableCell className="text-body-sm text-font-secondary">
                {source.lastReviewedAt ? formatKbDate(source.lastReviewedAt) : 'Belum ditinjau'}
              </TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                {canManage && source.status !== 'dipensiunkan' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => onRetire(source)}
                    data-testid={`kb-source-retire-${source.sourceId}`}
                  >
                    Pensiunkan
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
