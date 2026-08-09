import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { APPROVAL_STATUS_LABELS } from '@/features/knowledge/kb-labels'
import {
  ChunkDecisionBar,
  ChunkDiffView,
  ChunkPreviewCard,
  RetrievalTestPanel,
  useKbReviewStore,
} from '@/features/knowledge/review'
import { useAuthStore } from '@/stores/useAuthStore'
import type { KbApprovalStatus } from '@/types/siaga-kb'
import { ChunkQueueList } from './parts/ChunkQueueList'

const QUEUE_STATUSES: KbApprovalStatus[] = ['menunggu', 'disetujui', 'ditolak']

/**
 * Reviewer workspace: queue → preview → decision, plus the version diff and
 * the retrieval test (brief 06 §2.2–2.3).
 *
 * `?sourceId=` arrives from a catalog row click, so "open this document's
 * chunks" and "work the global queue" are the same screen with one filter
 * difference — the reviewer never loses the decision bar by navigating.
 */
function KbReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sourceId = searchParams.get('sourceId') ?? undefined
  const role = useAuthStore((state) => state.profile?.role)
  const canDecide = role === 'domain_reviewer'

  const {
    chunks,
    totalItem,
    selectedChunkId,
    filters,
    diff,
    isLoading,
    error,
    setFilters,
    selectChunk,
    fetchChunks,
    fetchDiff,
    clearDiff,
  } = useKbReviewStore()

  useEffect(() => {
    setFilters({ approvalStatus: 'menunggu', sourceId })
  }, [setFilters, sourceId])

  useEffect(() => {
    fetchChunks(1)
    clearDiff()
  }, [fetchChunks, clearDiff, filters])

  const selectedChunk = useMemo(
    () => chunks.find((chunk) => chunk.chunkId === selectedChunkId) ?? null,
    [chunks, selectedChunkId]
  )

  const handleStatusChange = (status: KbApprovalStatus) => {
    setFilters({ ...filters, approvalStatus: status })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div>
        <h1 className="text-h4 font-bold text-font-primary">Antrean Potongan Rujukan</h1>
        <p className="mt-1 text-body-md text-font-secondary">
          Tinjau tiap potongan sebelum masuk indeks aktif. Konten dosis/merek wajib
          diberi penanda kebijakan.
        </p>
      </div>

      <section aria-label="Filter antrean" className="flex flex-wrap items-center gap-2">
        {QUEUE_STATUSES.map((status) => (
          <Button
            key={status}
            type="button"
            variant={filters.approvalStatus === status ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
            aria-pressed={filters.approvalStatus === status}
            onClick={() => handleStatusChange(status)}
            data-testid={`kb-review-filter-${status}`}
          >
            {APPROVAL_STATUS_LABELS[status]}
          </Button>
        ))}
        {sourceId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => setSearchParams({})}
            data-testid="kb-review-clear-source"
          >
            Tampilkan semua sumber
          </Button>
        )}
      </section>

      {error && (
        <Alert variant="destructive" data-testid="kb-review-error">
          <AlertDescription className="flex flex-col items-start gap-2">
            {error}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => fetchChunks(1)}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside aria-label="Daftar potongan">
          {isLoading ? (
            <div className="flex flex-col gap-2" data-testid="kb-review-loading">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : (
            <ChunkQueueList
              chunks={chunks}
              totalItem={totalItem}
              selectedChunkId={selectedChunkId}
              onSelect={selectChunk}
            />
          )}
        </aside>

        <div className="flex flex-col gap-4">
          {selectedChunk ? (
            <>
              <ChunkPreviewCard chunk={selectedChunk} />
              {canDecide ? (
                <ChunkDecisionBar chunk={selectedChunk} />
              ) : (
                <Alert data-testid="kb-review-readonly">
                  <AlertDescription>
                    Keputusan setujui/tolak dilakukan oleh domain reviewer.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => fetchDiff(selectedChunk.refCode)}
                  data-testid="kb-review-compare"
                >
                  Bandingkan versi
                </Button>
                {diff && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl"
                    onClick={clearDiff}
                  >
                    Tutup banding
                  </Button>
                )}
              </div>
              {diff && <ChunkDiffView diff={diff} />}
            </>
          ) : (
            !isLoading && (
              <div
                className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border-secondary bg-background-secondary px-6 py-12 text-center"
                data-testid="kb-review-empty"
              >
                <i
                  className="ph ph-list-checks text-h3 text-font-secondary"
                  aria-hidden="true"
                />
                <p className="text-body-md text-font-secondary">
                  Tidak ada potongan pada filter ini.
                </p>
              </div>
            )
          )}

          <RetrievalTestPanel />
        </div>
      </div>
    </div>
  )
}

export default KbReviewPage
