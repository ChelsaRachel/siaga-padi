import {
  PWA_DRAFT_QUEUE_HEADER,
  PWA_DRAFT_QUEUE_HEADER_VALUE,
  PWA_IDEMPOTENCY_HEADER,
} from '@/config/pwa-config'
import type { SiagaApiResponse } from '@/types/api'
import type {
  DisplayStage,
  GrowthStage,
  LocationMode,
  SiagaCase,
  SiagaCaseEvent,
  SiagaCoords,
} from '@/types/siaga-case'
import apiClient from './api-client'
import { API_ENDPOINTS } from './api-endpoints'

/**
 * Case service — typed 1:1 against docs/api-spec-case.md.
 *
 * NOTE: the sprint task file names this file `cases.ts`; it is
 * `cases.service.ts` to follow the mandatory `{module}.service.ts` naming
 * convention (skills/reactjs-architecture — deliberate, documented deviation).
 */

export interface ICaseNewFieldPayload {
  /** 2–100 chars, free naming. */
  name: string
  areaKabupaten?: string
  areaKecamatan?: string
}

export interface ICaseCreatePayload {
  /** Mutually exclusive with `newField`. */
  fieldId?: string
  /** Mutually exclusive with `fieldId`. */
  newField?: ICaseNewFieldPayload
  locationMode: LocationMode
  /** Only with EXACT_GPS (opt-in). */
  coords?: SiagaCoords
  /** Required for AREA_ONLY; optional otherwise. */
  areaKabupaten?: string
  areaKecamatan?: string
  growthStage: GrowthStage
  /** ISO 8601, ≤ now + 10 min skew. */
  observedAt: string
  /** Optional, ≤500 chars. */
  notes?: string
  /** Penyuluh assisted mode only — must be an OPEN session owned by the caller. */
  assistedSessionId?: string
}

export interface ICaseCreateResult {
  case: SiagaCase
  /** True when the Idempotency-Key was replayed — same case, never a duplicate. */
  replayed: boolean
  /** Discriminant against `ICaseQueuedResult` — absent on a real create. */
  queued?: false
}

/**
 * HTTP 202 acknowledgement from the FR-014 service-worker queue: the draft is
 * stored on the device and will be delivered by background sync. No case exists
 * server-side yet, so `case` is absent — callers MUST branch on `queued`
 * before reading it.
 */
export interface ICaseQueuedResult {
  queued: true
  idempotencyKey: string
  case?: never
  replayed?: never
}

export type TCaseCreateResponse = ICaseCreateResult | ICaseQueuedResult

export interface ICaseListFilters {
  fieldId?: string
  /** Expanded server-side to its status set. */
  displayStage?: DisplayStage
  status?: string
  /** yyyy-MM-dd */
  dateFrom?: string
  /** yyyy-MM-dd */
  dateTo?: string
}

export interface ICaseListPayload {
  page: number
  limit: number
  filters?: ICaseListFilters
}

export const casesService = {
  /**
   * POST apps/cases — the `Idempotency-Key` header is REQUIRED by the
   * contract; retries MUST reuse the same key (replay returns the same case,
   * HTTP 200 `replayed: true`). The offline-queue marker header opts this
   * draft mutation into the FR-014 service-worker queue.
   */
  create: (
    data: ICaseCreatePayload,
    idempotencyKey: string
  ): Promise<SiagaApiResponse<TCaseCreateResponse>> =>
    apiClient.post(API_ENDPOINTS.CASES.CREATE, data, {
      headers: {
        [PWA_IDEMPOTENCY_HEADER]: idempotencyKey,
        [PWA_DRAFT_QUEUE_HEADER]: PWA_DRAFT_QUEUE_HEADER_VALUE,
      },
    }),

  /** POST apps/cases/get-all — role scoping is server-side; pagination in metaData. */
  getAll: (data: ICaseListPayload): Promise<SiagaApiResponse<SiagaCase[]>> =>
    apiClient.post(API_ENDPOINTS.CASES.GET_ALL, data),

  /** GET apps/cases/{id} — 404 when not visible to the caller (no enumeration). */
  getOne: (caseId: string): Promise<SiagaApiResponse<SiagaCase>> =>
    apiClient.get(API_ENDPOINTS.CASES.DETAIL(caseId)),

  /** GET apps/cases/{id}/timeline — events ascending by createdAt, creation first. */
  getTimeline: (caseId: string): Promise<SiagaApiResponse<SiagaCaseEvent[]>> =>
    apiClient.get(API_ENDPOINTS.CASES.TIMELINE(caseId)),
}
