import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import type { KbApprovalStatus, SiagaKbChunk } from '@/types/siaga-kb'
import {
  ACTION_TYPE_LABELS,
  APPROVAL_STATUS_LABELS,
  AUDIENCE_LABELS,
  DISEASE_LABELS,
  PHASE_LABELS,
  POLICY_FLAG_LABELS,
  RISK_LABELS,
  formatKbDate,
  labelFor,
} from '../../kb-labels'

interface ChunkPreviewCardProps {
  chunk: SiagaKbChunk
  /** True on the shareable read-only route (no decision affordances). */
  isReadOnly?: boolean
}

const APPROVAL_BADGE_CLASSES: Record<KbApprovalStatus, string> = {
  menunggu: 'border-warning-base bg-warning-light text-warning-deep',
  disetujui: 'border-success-base bg-success-light text-success-deep',
  ditolak: 'border-error-base bg-error-light text-error-deep',
}

const SUPERSEDED_MESSAGE =
  'Versi lama — sudah diperbarui atau sumbernya dipensiunkan. Isi di bawah adalah rujukan historis.'

/**
 * Chunk preview — the reviewer's reading surface and the citation target of
 * the Sprint 05 reference drawer.
 *
 * Two banners carry the safety story and are never collapsed away: the policy
 * flag (this text must not be narrated to petani) and the superseded notice
 * (this is a historical version).
 */
export function ChunkPreviewCard({ chunk, isReadOnly = false }: ChunkPreviewCardProps) {
  return (
    <article
      className="flex flex-col gap-3 rounded-2xl border border-border-primary bg-card p-4"
      data-testid={`kb-chunk-preview-${chunk.chunkId}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-body-lg font-semibold text-font-primary">{chunk.refCode}</p>
          <p className="text-body-sm text-font-secondary">
            {chunk.sourceTitle ?? 'Sumber tidak diketahui'}
            {chunk.location ? ` · ${chunk.location}` : ''}
            {` · versi ${chunk.version}`}
          </p>
        </div>
        <Badge
          className={cn(
            'shrink-0 rounded-lg border text-label-sm font-semibold',
            APPROVAL_BADGE_CLASSES[chunk.approvalStatus]
          )}
        >
          {APPROVAL_STATUS_LABELS[chunk.approvalStatus]}
        </Badge>
      </header>

      {!chunk.isCurrent && (
        <Alert data-testid="kb-chunk-superseded">
          <AlertDescription>{SUPERSEDED_MESSAGE}</AlertDescription>
        </Alert>
      )}

      {chunk.policyFlag && (
        <Alert variant="destructive" data-testid="kb-chunk-policy-flag">
          <AlertDescription>{POLICY_FLAG_LABELS[chunk.policyFlag]}</AlertDescription>
        </Alert>
      )}

      {!chunk.policyFlag && chunk.requiredPolicyFlag && !isReadOnly && (
        <Alert data-testid="kb-chunk-policy-required">
          <AlertDescription>
            Isi potongan terdeteksi memuat dosis/merek — beri penanda kebijakan
            sebelum menyetujui.
          </AlertDescription>
        </Alert>
      )}

      <p className="whitespace-pre-wrap text-body-md text-font-primary">
        {chunk.content}
      </p>

      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-font-secondary">
        <div>
          <dt className="text-label-sm">Penyakit</dt>
          <dd className="text-font-primary">
            {chunk.diseaseTags.length > 0
              ? chunk.diseaseTags.map((tag) => labelFor(DISEASE_LABELS, tag)).join(', ')
              : 'Umum'}
          </dd>
        </div>
        <div>
          <dt className="text-label-sm">Fase</dt>
          <dd className="text-font-primary">
            {chunk.phaseTags.length > 0
              ? chunk.phaseTags.map((tag) => labelFor(PHASE_LABELS, tag)).join(', ')
              : 'Semua fase'}
          </dd>
        </div>
        <div>
          <dt className="text-label-sm">Jenis tindakan</dt>
          <dd className="text-font-primary">
            {labelFor(ACTION_TYPE_LABELS, chunk.actionType)}
          </dd>
        </div>
        <div>
          <dt className="text-label-sm">Audiens</dt>
          <dd className="text-font-primary">{AUDIENCE_LABELS[chunk.audience]}</dd>
        </div>
        <div>
          <dt className="text-label-sm">Risiko</dt>
          <dd className="text-font-primary">{RISK_LABELS[chunk.risk]}</dd>
        </div>
        <div>
          <dt className="text-label-sm">Ditambahkan</dt>
          <dd className="text-font-primary">{formatKbDate(chunk.createdAt)}</dd>
        </div>
      </dl>

      {chunk.rejectReason && (
        <p className="text-body-sm text-error-deep" data-testid="kb-chunk-reject-reason">
          Alasan penolakan: {chunk.rejectReason}
        </p>
      )}
    </article>
  )
}
