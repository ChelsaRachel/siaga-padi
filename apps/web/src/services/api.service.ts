import type { ApiResponse } from '@/types/api';
import {
  PWA_DRAFT_QUEUE_HEADER,
  PWA_DRAFT_QUEUE_HEADER_VALUE,
  PWA_IDEMPOTENCY_HEADER,
} from '@/config/pwa-config';
import apiClient from './api-client';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface RequestOptions<TBody = unknown> {
  path: string;
  method: HttpMethod;
  data?: TBody;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface QueueableRequestOptions<TBody = unknown> extends RequestOptions<TBody> {
  idempotencyKey?: string;
}

interface QueueableUploadOptions {
  idempotencyKey?: string;
  onProgress?: (percent: number) => void;
}

function createIdempotencyKey(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getQueueHeaders(
  idempotencyKey?: string,
  headers?: Record<string, string>
): Record<string, string> {
  return {
    ...headers,
    [PWA_DRAFT_QUEUE_HEADER]: PWA_DRAFT_QUEUE_HEADER_VALUE,
    [PWA_IDEMPOTENCY_HEADER]: idempotencyKey ?? createIdempotencyKey(),
  };
}

export function request<TResponse = unknown, TBody = unknown>(
  options: RequestOptions<TBody>
): Promise<ApiResponse<TResponse>> {
  const { path, method, data, params, headers } = options;

  return apiClient.request({
    url: path,
    method,
    data,
    params,
    headers,
  });
}

/**
 * Opt-in mutation helper for case/photo drafts that may be queued by the
 * service worker. Read-only, auth, and destructive requests must use request().
 */
export function queueableRequest<TResponse = unknown, TBody = unknown>(
  options: QueueableRequestOptions<TBody>
): Promise<ApiResponse<TResponse>> {
  const { idempotencyKey, headers, ...requestOptions } = options;

  return request<TResponse, TBody>({
    ...requestOptions,
    headers: getQueueHeaders(idempotencyKey, headers),
  });
}

export function uploadRequest<TResponse = unknown>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<ApiResponse<TResponse>> {
  return apiClient.post(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
}

export function queueableUploadRequest<TResponse = unknown>(
  path: string,
  formData: FormData,
  options: QueueableUploadOptions = {}
): Promise<ApiResponse<TResponse>> {
  return apiClient.post(path, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...getQueueHeaders(options.idempotencyKey),
    },
    onUploadProgress: (event) => {
      if (options.onProgress && event.total) {
        options.onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
}
