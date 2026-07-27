import type { WidgetFilterMap } from '@/modules/dynamic-filter'
import type { ICaseListFilters } from '@/services/cases.service'
import type { DisplayStage } from '@/types/siaga-case'
import { DISPLAY_STAGE_ORDER } from '@/features/case/case-labels'

/**
 * Filter map for the Riwayat page (dynamic-filter module, Type 1 + Type 2):
 * - URL preset `?fieldId=` from the profile lahan gallery → `useUrlFilters()`
 * - `filter-lahan` (Filter select), `filter-periode` (DateRange),
 *   `filter-status` (ChipGroup) — all scope "all"
 * - `case-list` is the single receiver widget.
 */
export const caseHistoryFilterMap: WidgetFilterMap = {
  'filter-lahan': { scope: 'all' },
  'filter-periode': { scope: 'all' },
  'filter-status': { scope: 'all' },
  'case-list': {},
}

/** Sentinel for "Semua lahan" — mapped to "no fieldId filter" (overrides URL preset). */
export const ALL_FIELDS_VALUE = '__semua__'

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asDisplayStage(value: unknown): DisplayStage | undefined {
  return typeof value === 'string' && (DISPLAY_STAGE_ORDER as string[]).includes(value)
    ? (value as DisplayStage)
    : undefined
}

/**
 * Maps resolved filter params (untrusted: URL-sourced values included) to the
 * exact contract FindDTO `filters` object — validating every value before use.
 */
export function toCaseListFilters(params: Record<string, unknown>): ICaseListFilters {
  const fieldId = asNonEmptyString(params.fieldId)
  const displayStage = asDisplayStage(params.displayStage)
  const dateFrom = asNonEmptyString(params.dateFrom)
  const dateTo = asNonEmptyString(params.dateTo)

  return {
    ...(fieldId && fieldId !== ALL_FIELDS_VALUE ? { fieldId } : {}),
    ...(displayStage ? { displayStage } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  }
}
