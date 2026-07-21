/**
 * API Endpoint Constants
 * Centralized paths for all backend services.
 */
const SUFFIX_BASE = 'apps';
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
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
