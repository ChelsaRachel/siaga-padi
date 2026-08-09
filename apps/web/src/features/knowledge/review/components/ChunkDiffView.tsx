import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import type { KbChunkDiff, KbDiffOp } from '@/types/siaga-kb'
import { APPROVAL_STATUS_LABELS } from '../../kb-labels'

interface ChunkDiffViewProps {
  diff: KbChunkDiff
}

const OP_CLASSES: Record<KbDiffOp, string> = {
  '=': 'text-font-secondary',
  '-': 'bg-error-light text-error-deep line-through',
  '+': 'bg-success-light text-success-deep',
}

const FIELD_LABELS: Record<string, string> = {
  content: 'Isi teks',
  disease_tags: 'Penanda penyakit',
  phase_tags: 'Penanda fase',
  action_type: 'Jenis tindakan',
  audience: 'Audiens',
  risk: 'Risiko',
  policy_flag: 'Penanda kebijakan',
  approval_status: 'Status persetujuan',
}

/**
 * Version comparison (brief 06 §2.2 — tampilan banding versi).
 *
 * Line-level, not character-level, on purpose: a reviewer decides on whole
 * sentences of agronomic guidance, and a word-diff of Indonesian prose reads
 * as noise. Removed lines keep their strike-through so nothing looks deleted
 * by accident — the old version still exists and still resolves.
 */
export function ChunkDiffView({ diff }: ChunkDiffViewProps) {
  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-border-primary bg-card p-4"
      aria-label={`Banding versi ${diff.refCode}`}
      data-testid="kb-diff-view"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-lg font-semibold text-font-primary">
          {diff.refCode} — versi {diff.base.version} → {diff.compare.version}
        </p>
        <div className="flex gap-2">
          <Badge className="rounded-lg border border-border-primary bg-background-secondary text-label-sm text-font-secondary">
            v{diff.base.version}: {APPROVAL_STATUS_LABELS[diff.base.approvalStatus]}
          </Badge>
          <Badge className="rounded-lg border border-border-primary bg-background-secondary text-label-sm text-font-secondary">
            v{diff.compare.version}:{' '}
            {APPROVAL_STATUS_LABELS[diff.compare.approvalStatus]}
          </Badge>
        </div>
      </header>

      {diff.changedFields.length > 0 ? (
        <p className="text-body-sm text-font-secondary" data-testid="kb-diff-fields">
          Berubah:{' '}
          {diff.changedFields.map((field) => FIELD_LABELS[field] ?? field).join(', ')}
        </p>
      ) : (
        <p className="text-body-sm text-font-secondary" data-testid="kb-diff-fields">
          Tidak ada perbedaan antar versi ini.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border-secondary bg-background-primary">
        <pre className="min-w-full p-3 text-body-sm">
          {diff.contentDiff.map((line, index) => (
            <code
              key={`${line.op}-${index}`}
              className={cn('block whitespace-pre-wrap px-1', OP_CLASSES[line.op])}
              data-testid={`kb-diff-line-${line.op}`}
            >
              {line.op === '=' ? '  ' : `${line.op} `}
              {line.text}
            </code>
          ))}
        </pre>
      </div>
    </section>
  )
}
