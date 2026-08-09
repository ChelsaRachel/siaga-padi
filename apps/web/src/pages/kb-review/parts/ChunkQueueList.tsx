import { PerfectScrollArea } from '@/components/wrappers/PerfectScrollArea'
import { cn } from '@/utils/cn'
import type { SiagaKbChunk } from '@/types/siaga-kb'

interface ChunkQueueListProps {
  chunks: SiagaKbChunk[]
  totalItem: number
  selectedChunkId: string | null
  onSelect: (chunkId: string) => void
}

/**
 * The queue rail. A bounded scroll region, so it uses PerfectScrollArea per the
 * project scroll rule. Each row leads with the ref code because that is the
 * identifier a reviewer quotes when discussing a decision.
 */
export function ChunkQueueList({
  chunks,
  totalItem,
  selectedChunkId,
  onSelect,
}: ChunkQueueListProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm text-font-secondary" data-testid="kb-review-count">
        {totalItem} potongan
      </p>
      <PerfectScrollArea className="max-h-[60vh] pr-1">
        <ul className="flex flex-col gap-2" data-testid="kb-review-queue">
          {chunks.map((chunk) => (
            <li key={chunk.chunkId}>
              <button
                type="button"
                onClick={() => onSelect(chunk.chunkId)}
                aria-current={chunk.chunkId === selectedChunkId}
                data-testid={`kb-review-queue-item-${chunk.chunkId}`}
                className={cn(
                  'flex min-h-11 w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors',
                  chunk.chunkId === selectedChunkId
                    ? 'border-primary-base bg-primary-light'
                    : 'border-border-secondary bg-card hover:bg-background-secondary'
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-body-md font-semibold text-font-primary">
                    {chunk.refCode}
                  </span>
                  {(chunk.policyFlag || chunk.requiredPolicyFlag) && (
                    <i
                      className="ph ph-warning-circle text-warning-deep"
                      aria-label="Memuat dosis/merek"
                    />
                  )}
                </span>
                <span className="text-label-sm text-font-secondary">
                  {chunk.location ?? 'Tanpa lokasi'} · versi {chunk.version}
                </span>
                <span className="text-body-sm text-font-secondary">{chunk.content}</span>
              </button>
            </li>
          ))}
        </ul>
      </PerfectScrollArea>
    </div>
  )
}
