import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DISPLAY_STAGE_LABELS, DISPLAY_STAGE_ORDER } from '@/features/case/case-labels'
import { useFieldsStore } from '@/features/case/fields'
import { CaseCard, useCaseHistoryStore } from '@/features/case/history'
import { useFilterStore, useResolvedFilterParams, useUrlFilters } from '@/modules/dynamic-filter'
import { ChipGroup, DateRange, Filter } from '@/modules/dynamic-filter/components'
import {
  ALL_FIELDS_VALUE,
  caseHistoryFilterMap,
  toCaseListFilters,
} from './config/case-history.filter-map'

const CASE_LIST_WIDGET_ID = 'case-list'

const STATUS_CHIP_OPTIONS = DISPLAY_STAGE_ORDER.map((stage) => ({
  value: stage,
  label: DISPLAY_STAGE_LABELS[stage],
}))

/**
 * Riwayat — filterable case card list (lahan / rentang waktu / status
 * displayStage) via the dynamic-filter module; `?fieldId=` preset from the
 * profile lahan gallery arrives through `useUrlFilters()` (Type 1).
 */
function CaseHistoryPage() {
  useUrlFilters()

  const setFilterMap = useFilterStore((s) => s.setFilterMap)
  useEffect(() => {
    setFilterMap(caseHistoryFilterMap)
    return () => setFilterMap({})
  }, [setFilterMap])

  const { fields, fetchFields } = useFieldsStore()
  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const filterParams = useResolvedFilterParams(CASE_LIST_WIDGET_ID)
  const listFilters = useMemo(
    () => toCaseListFilters(filterParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(filterParams)]
  )

  const { cases, page, totalPage, totalItem, isLoading, isLoadingMore, error, fetchCases, fetchMore } =
    useCaseHistoryStore()

  useEffect(() => {
    fetchCases(listFilters)
  }, [listFilters, fetchCases])

  const lahanOptions = useMemo(
    () => [
      { label: 'Semua lahan', value: ALL_FIELDS_VALUE },
      ...fields.map((field) => ({ label: field.name, value: field.fieldId })),
    ],
    [fields]
  )

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-h4 font-bold text-font-primary">Riwayat</h1>
        <p className="mt-1 text-body-md text-font-secondary">
          Hasil pemeriksaan tanaman Anda sebelumnya.
        </p>
      </div>

      <section aria-label="Filter riwayat" className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1.5">
            <span className="text-label-md font-medium text-font-primary">Lahan</span>
            <Filter
              id="filter-lahan"
              filterKey="fieldId"
              options={lahanOptions}
              config={caseHistoryFilterMap['filter-lahan']}
              placeholder="Semua lahan"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-label-md font-medium text-font-primary">Rentang waktu</span>
            <DateRange
              id="filter-periode"
              filterKeyFrom="dateFrom"
              filterKeyTo="dateTo"
              config={caseHistoryFilterMap['filter-periode']}
              placeholder="Semua waktu"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-label-md font-medium text-font-primary">Status</span>
          <ChipGroup
            id="filter-status"
            filterKey="displayStage"
            options={STATUS_CHIP_OPTIONS}
            config={caseHistoryFilterMap['filter-status']}
            allLabel="Semua"
          />
        </div>
      </section>

      {error && (
        <Alert variant="destructive" data-testid="case-history-error">
          <AlertDescription className="flex flex-col items-start gap-2">
            {error}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => fetchCases(listFilters)}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3" aria-label="Memuat riwayat kasus" data-testid="case-history-loading">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : cases.length > 0 ? (
        <>
          <p className="text-body-sm text-font-secondary" data-testid="case-history-count">
            {totalItem} kasus ditemukan
          </p>
          <div className="flex flex-col gap-3" data-testid="case-history-list">
            {cases.map((caseItem) => (
              <CaseCard key={caseItem.caseId} caseItem={caseItem} />
            ))}
          </div>
          {page < totalPage && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full rounded-xl font-semibold"
              onClick={() => fetchMore(listFilters)}
              disabled={isLoadingMore}
              data-testid="case-history-load-more"
            >
              {isLoadingMore ? (
                <>
                  <i className="ph ph-circle-notch animate-spin text-h6" aria-hidden="true" />
                  Memuat…
                </>
              ) : (
                'Muat lebih banyak'
              )}
            </Button>
          )}
        </>
      ) : (
        !error && (
          <div
            className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border-secondary bg-background-secondary px-6 py-12 text-center"
            data-testid="case-history-empty"
          >
            <i className="ph ph-clock-counter-clockwise text-h3 text-font-secondary" aria-hidden="true" />
            <p className="text-body-md text-font-secondary">
              Belum ada kasus yang cocok. Mulai periksa tanaman Anda sekarang.
            </p>
            <Link
              to="/periksa-tanaman"
              className="flex min-h-11 items-center gap-2 rounded-xl bg-primary-base px-5 py-2.5 text-body-md font-semibold text-font-on-accent transition-colors hover:bg-primary-bold"
            >
              <i className="ph ph-camera" aria-hidden="true" />
              Periksa Tanaman
            </Link>
          </div>
        )
      )}
    </div>
  )
}

export default CaseHistoryPage
