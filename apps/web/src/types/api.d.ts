export interface ApiPagination {
  size: number;
  totalElements: number;
  totalPages: number;
  scrollId: string;
}

export interface ApiMetaData {
  pagination: ApiPagination;
  status: boolean;
  executionTime: number;
  responseCode: number;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  metaData?: ApiMetaData;
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

/* ── Siaga Padi envelope (docs/api-spec.md § Response envelope) ──────────── */

/**
 * Boilerplate pagination envelope as actually emitted by the backend
 * (`models/pagination.py` → `{ size, totalElements, totalPages, scrollId }`),
 * pinned in `docs/api-spec-case.md`. Do NOT rename these to
 * currentPage/totalPage/totalItem — the server does not send those keys and
 * the mismatch silently disables load-more.
 */
export interface SiagaPagination {
  size: number;
  totalElements: number;
  totalPages: number;
  scrollId?: string;
}

export interface SiagaMetaData {
  pagination?: SiagaPagination;
  status: boolean;
  executionTime: number;
  responseCode: number;
  /** User-presentable Indonesian message. */
  message: string;
}

/**
 * Envelope returned by every Siaga backend endpoint. `apiClient`'s response
 * interceptor unwraps `AxiosResponse.data`, so services resolve to this type.
 */
export interface SiagaApiResponse<T = unknown> {
  metaData: SiagaMetaData;
  data: T;
  /** e.g. `{ retryAfterSeconds, lockedUntil }` on HTTP 423 lockout. */
  additionalInfo: Record<string, unknown> | null;
  copyright: string;
}
