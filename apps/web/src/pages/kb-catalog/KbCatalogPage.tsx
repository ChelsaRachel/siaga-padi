import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  KbSourceFormDialog,
  KbSourceTable,
  useKbCatalogStore,
} from '@/features/knowledge/catalog'
import {
  SOURCE_STATUS_LABELS,
  SOURCE_STATUS_ORDER,
} from '@/features/knowledge/kb-labels'
import { useAuthStore } from '@/stores/useAuthStore'
import type { KbSourceStatus, SiagaKbSource } from '@/types/siaga-kb'
import { RetireSourceDialog } from './parts/RetireSourceDialog'

const ALL_STATUS_VALUE = 'semua'

/**
 * Basis Pengetahuan — the source catalog (brief 06 §2.1).
 *
 * Admin curates (register / retire); the domain reviewer browses from here
 * into the chunk queue. The role comes from the session, not from the route:
 * one screen serves both, with the write affordances hidden for the reviewer.
 */
function KbCatalogPage() {
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.profile?.role)
  const isAdmin = role === 'admin'

  const {
    sources,
    page,
    totalPage,
    totalItem,
    filters,
    isLoading,
    error,
    lastIngest,
    setFilters,
    fetchSources,
    clearLastIngest,
  } = useKbCatalogStore()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [retireTarget, setRetireTarget] = useState<SiagaKbSource | null>(null)
  const [publisherQuery, setPublisherQuery] = useState('')

  useEffect(() => {
    fetchSources(1)
  }, [fetchSources, filters])

  const handleStatusChange = (value: string) => {
    setFilters({
      ...filters,
      status: value === ALL_STATUS_VALUE ? undefined : (value as KbSourceStatus),
    })
  }

  const handlePublisherSubmit = (event: FormEvent) => {
    event.preventDefault()
    setFilters({ ...filters, publisher: publisherQuery.trim() || undefined })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h4 font-bold text-font-primary">Basis Pengetahuan</h1>
          <p className="mt-1 text-body-md text-font-secondary">
            Sumber resmi yang boleh dirujuk mesin rekomendasi. Hanya potongan yang
            disetujui reviewer yang masuk indeks aktif.
          </p>
        </div>
        {isAdmin && (
          <Button
            type="button"
            className="rounded-xl font-semibold"
            onClick={() => setIsFormOpen(true)}
            data-testid="kb-catalog-add"
          >
            <i className="ph ph-plus" aria-hidden="true" />
            Daftarkan sumber
          </Button>
        )}
      </div>

      {lastIngest && (
        <Alert data-testid="kb-catalog-ingest-result">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {lastIngest.chunkCount} potongan dihasilkan — {lastIngest.pendingCount}{' '}
            menunggu review.
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => {
                clearLastIngest()
                navigate('/pengetahuan/review')
              }}
            >
              Buka antrean review
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <section aria-label="Filter katalog" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-label-md font-medium text-font-primary">Status</span>
          <select
            className="h-11 rounded-xl border border-border-primary bg-background-primary px-3 text-body-md text-font-primary"
            value={filters.status ?? ALL_STATUS_VALUE}
            onChange={(event) => handleStatusChange(event.target.value)}
            data-testid="kb-catalog-status-filter"
            id="kb-catalog-status"
            name="status"
            aria-label="Status sumber"
          >
            <option value={ALL_STATUS_VALUE}>Semua status</option>
            {SOURCE_STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {SOURCE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <form className="flex items-end gap-2" onSubmit={handlePublisherSubmit}>
          <div className="flex flex-col gap-1.5">
            <span className="text-label-md font-medium text-font-primary">Penerbit</span>
            <Input
              value={publisherQuery}
              onChange={(event) => setPublisherQuery(event.target.value)}
              placeholder="BB Padi"
              className="h-11 w-56 rounded-xl border-border-primary bg-background-primary text-body-md"
              data-testid="kb-catalog-publisher-filter"
            />
          </div>
          <Button type="submit" variant="outline" className="h-11 rounded-xl">
            Terapkan
          </Button>
        </form>
      </section>

      {error && (
        <Alert variant="destructive" data-testid="kb-catalog-error">
          <AlertDescription className="flex flex-col items-start gap-2">
            {error}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => fetchSources(page)}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3" data-testid="kb-catalog-loading">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : sources.length > 0 ? (
        <>
          <p className="text-body-sm text-font-secondary" data-testid="kb-catalog-count">
            {totalItem} sumber terdaftar
          </p>
          <KbSourceTable
            sources={sources}
            canManage={isAdmin}
            onOpenChunks={(source) =>
              navigate(`/pengetahuan/review?sourceId=${source.sourceId}`)
            }
            onRetire={setRetireTarget}
          />
          {totalPage > 1 && (
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={page <= 1}
                onClick={() => fetchSources(page - 1)}
              >
                Sebelumnya
              </Button>
              <span className="text-body-sm text-font-secondary">
                Halaman {page} dari {totalPage}
              </span>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={page >= totalPage}
                onClick={() => fetchSources(page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </>
      ) : (
        !error && (
          <div
            className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border-secondary bg-background-secondary px-6 py-12 text-center"
            data-testid="kb-catalog-empty"
          >
            <i className="ph ph-books text-h3 text-font-secondary" aria-hidden="true" />
            <p className="text-body-md text-font-secondary">
              Belum ada sumber yang cocok dengan filter ini.
            </p>
          </div>
        )
      )}

      {isAdmin && (
        <>
          <KbSourceFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
          <RetireSourceDialog
            source={retireTarget}
            onClose={() => setRetireTarget(null)}
          />
        </>
      )}
    </div>
  )
}

export default KbCatalogPage
