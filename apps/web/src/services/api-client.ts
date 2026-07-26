import { useAuthStore } from '@/stores/useAuthStore';
import env from '@/types/env';
import type { SiagaApiResponse } from '@/types/api';
import type { SiagaSession } from '@/types/siaga-auth';
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_ENDPOINTS } from './api-endpoints';

/**
 * API Client instance with Axios.
 *
 * Auth model (docs/api-spec.md): tokens are returned in the response BODY —
 * no cookies. The request interceptor attaches `Authorization: Bearer
 * <accessToken>` from the auth store; the 401 flow POSTs the stored
 * refreshToken to `apps/siaga/auth/refresh` and updates the store.
 *
 * When the refresh itself fails while the user is authenticated, the store is
 * marked session-expired (re-login modal) instead of hard-clearing auth —
 * local offline drafts (IndexedDB) are never touched by this flow.
 */

interface IQueuedRequest {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}

// Flag and queue for handling multiple concurrent 401 errors
let isRefreshing = false;
let failedQueue: IQueuedRequest[] = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((pendingRequest) => {
    if (error) {
      pendingRequest.reject(error);
    } else {
      pendingRequest.resolve();
    }
  });
  failedQueue = [];
};

const apiClient: AxiosInstance = axios.create({
  baseURL: env.api.baseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor — attach Bearer access token from the auth store
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().session?.accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/** Auth endpoints must never trigger the refresh flow (login 401 = wrong credentials). */
function isAuthEndpoint(url: string): boolean {
  return (
    url.includes(API_ENDPOINTS.SIAGA_AUTH.LOGIN) ||
    url.includes(API_ENDPOINTS.SIAGA_AUTH.REFRESH)
  );
}

async function refreshSession(refreshToken: string): Promise<SiagaSession> {
  // Raw axios on purpose: bypasses this client's interceptors (no Bearer
  // header, no recursive 401 handling) — refresh is a public endpoint.
  const response = await axios.post<SiagaApiResponse<{ session: SiagaSession }>>(
    `${apiClient.defaults.baseURL}/${API_ENDPOINTS.SIAGA_AUTH.REFRESH}`,
    { refreshToken }
  );
  const session = response.data?.data?.session;
  if (!session?.accessToken) {
    throw new Error('Sesi baru tidak diterima dari server.');
  }
  return session;
}

/** Normalize errors so consumers get `status`, Indonesian `message`, and `additionalInfo`. */
function toNormalizedRejection(error: AxiosError): Promise<never> {
  const { response } = error;
  const responseData = response?.data as Partial<SiagaApiResponse> | undefined;
  // Boilerplate dependencies (JWTBearer) reject with `{ detail: string }`
  // instead of the siaga envelope — read it before falling back.
  const detail = (responseData as { detail?: unknown } | undefined)?.detail;
  const errorMessage =
    responseData?.metaData?.message ||
    (responseData as { message?: string } | undefined)?.message ||
    (typeof detail === 'string' && detail.length > 0 ? detail : undefined) ||
    error.message ||
    'Terjadi kesalahan. Silakan coba lagi.';

  return Promise.reject({
    ...error,
    message: errorMessage,
    status: response?.status,
    additionalInfo: responseData?.additionalInfo ?? null,
  });
}

// Response Interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const { response } = error;
    const requestUrl = originalRequest?.url ?? '';

    // Handle Unauthorized errors (401) once per request, never for auth endpoints
    if (response?.status === 401 && !originalRequest._retry && !isAuthEndpoint(requestUrl)) {
      const refreshToken = useAuthStore.getState().session?.refreshToken;

      if (!refreshToken) {
        return toNormalizedRejection(error);
      }

      if (isRefreshing) {
        // Mark before queueing: if the retried request 401s again it must
        // reject instead of starting a second refresh (retry-storm guard).
        originalRequest._retry = true;
        // If already refreshing, add original request to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // Request interceptor re-attaches the (new) access token on retry
            return apiClient(originalRequest);
          })
          .catch((queuedError) => {
            return Promise.reject(queuedError);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const session = await refreshSession(refreshToken);
        useAuthStore.getState().setSession(session);

        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        // Session-expired UX: keep profile + drafts, show the re-login modal.
        // Never clear offline draft storage here.
        if (useAuthStore.getState().isAuthenticated) {
          useAuthStore.getState().markSessionExpired();
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return toNormalizedRejection(error);
  }
);

export default apiClient;
