/**
 * API Endpoint Constants
 * Centralized paths for all backend services.
 */
const SUFFIX_BASE = 'apps'
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${SUFFIX_BASE}/auth/login`,
    LOGOUT: `${SUFFIX_BASE}/auth/logout`,
    REGISTER: `${SUFFIX_BASE}/auth/register`,
    REFRESH: `${SUFFIX_BASE}/auth/refresh`,
    ME: `${SUFFIX_BASE}/auth/me`,
    FORGOT_PASSWORD: `${SUFFIX_BASE}/auth/forgot-password`,
    RESET_PASSWORD: `${SUFFIX_BASE}/auth/reset-password`,
  },
  // Siaga Padi Sprint 01 contract — docs/api-spec.md
  SIAGA_AUTH: {
    LOGIN: `${SUFFIX_BASE}/siaga/auth/login`,
    REFRESH: `${SUFFIX_BASE}/siaga/auth/refresh`,
    ME: `${SUFFIX_BASE}/siaga/auth/me`,
  },
  ASSISTED: {
    SEARCH: `${SUFFIX_BASE}/assisted/search`,
    START: `${SUFFIX_BASE}/assisted/start`,
    END: `${SUFFIX_BASE}/assisted/end`,
  },
  // Siaga Padi Sprint 02 contract — docs/api-spec-case.md
  CASES: {
    CREATE: `${SUFFIX_BASE}/cases`,
    GET_ALL: `${SUFFIX_BASE}/cases/get-all`,
    DETAIL: (caseId: string) => `${SUFFIX_BASE}/cases/${caseId}`,
    TIMELINE: (caseId: string) => `${SUFFIX_BASE}/cases/${caseId}/timeline`,
  },
  // Siaga Padi Sprint 03 contract — docs/api-spec-photo.md
  PHOTOS: {
    UPLOAD: (caseId: string) => `${SUFFIX_BASE}/cases/${caseId}/photos`,
    LIST: (caseId: string) => `${SUFFIX_BASE}/cases/${caseId}/photos`,
    ESCALATE: (caseId: string) => `${SUFFIX_BASE}/cases/${caseId}/photos/escalate`,
  },
  // Siaga Padi Sprint 04 contract — docs/api-spec-kb.md
  KB: {
    SOURCES: `${SUFFIX_BASE}/kb/sources`,
    SOURCES_GET_ALL: `${SUFFIX_BASE}/kb/sources/get-all`,
    SOURCE_DETAIL: (sourceId: string) => `${SUFFIX_BASE}/kb/sources/${sourceId}`,
    SOURCE_INGEST: (sourceId: string) => `${SUFFIX_BASE}/kb/sources/${sourceId}/ingest`,
    SOURCE_RETIRE: (sourceId: string) => `${SUFFIX_BASE}/kb/sources/${sourceId}/retire`,
    CHUNKS_GET_ALL: `${SUFFIX_BASE}/kb/chunks/get-all`,
    CHUNK_DETAIL: (chunkId: string) => `${SUFFIX_BASE}/kb/chunks/${chunkId}`,
    CHUNK_BY_REF: (refCode: string) => `${SUFFIX_BASE}/kb/chunks/ref/${refCode}`,
    CHUNK_DIFF: (refCode: string) => `${SUFFIX_BASE}/kb/chunks/ref/${refCode}/diff`,
    CHUNK_APPROVE: (chunkId: string) => `${SUFFIX_BASE}/kb/chunks/${chunkId}/approve`,
    CHUNK_REJECT: (chunkId: string) => `${SUFFIX_BASE}/kb/chunks/${chunkId}/reject`,
    CHUNK_REVISE: (chunkId: string) => `${SUFFIX_BASE}/kb/chunks/${chunkId}/revise`,
    RETRIEVAL_TEST: `${SUFFIX_BASE}/kb/retrieval-test`,
  },
  // Siaga Padi Sprint 05 contract — docs/api-spec-triage.md
  TRIAGE: {
    ANALYSIS: (caseId: string) => `${SUFFIX_BASE}/cases/${caseId}/analysis`,
    QUESTIONS: (caseId: string) => `${SUFFIX_BASE}/cases/${caseId}/questions`,
    ANSWERS: (caseId: string) => `${SUFFIX_BASE}/cases/${caseId}/answers`,
    RECOMMENDATION: (caseId: string) => `${SUFFIX_BASE}/cases/${caseId}/recommendation`,
  },
  FARMER_PROFILE: {
    UPDATE: `${SUFFIX_BASE}/farmer/profile`,
    FIELDS: `${SUFFIX_BASE}/farmer/profile/fields`,
    FIELDS_GET_ALL: `${SUFFIX_BASE}/farmer/profile/fields/get-all`,
    DELETION_REQUEST: `${SUFFIX_BASE}/farmer/profile/deletion-request`,
  },
  USER: {
    BASE: `${SUFFIX_BASE}/users`,
    PROFILE: `${SUFFIX_BASE}/users/profile`,
    UPDATE: `${SUFFIX_BASE}/users/update`,
  },
  // Example for future modules
  FINANCE: {
    TRANSACTIONS: `${SUFFIX_BASE}/finance/transactions`,
    REPORTS: `${SUFFIX_BASE}/finance/reports`,
  },
} as const

export type ApiEndpoints = typeof API_ENDPOINTS
