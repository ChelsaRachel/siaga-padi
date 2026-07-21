import type { ApiResponse } from '@/types/api';
import apiClient from './api-client';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface RequestOptions<TBody = unknown> {
  path: string;
  method: HttpMethod;
  data?: TBody;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
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
