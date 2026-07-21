import type { ApiResponse } from '@/types/api';
import apiClient from './api-client';

export interface IGetAllParams {
  page?: number;
  size?: number;
  search?: string;
  search_by?: string[];
  [key: string]: unknown;
}

export interface IGetOneParams {
  id: string;
}

export interface IDeleteParams {
  id: string;
}

export interface IResourceService<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  add: (data: TCreate) => Promise<ApiResponse<T>>;
  getAll: (params?: IGetAllParams) => Promise<ApiResponse<T[]>>;
  getOne: (params: IGetOneParams) => Promise<ApiResponse<T>>;
  update: (data: TUpdate & { id: string }) => Promise<ApiResponse<T>>;
  delete: (params: IDeleteParams) => Promise<ApiResponse<null>>;
}

export function createResourceService<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  basePath: string
): IResourceService<T, TCreate, TUpdate> {
  return {
    add: (data: TCreate) =>
      apiClient.post(`${basePath}/add`, data),

    getAll: (params?: IGetAllParams) =>
      apiClient.post(`${basePath}/get-all`, params ?? {}),

    getOne: (params: IGetOneParams) =>
      apiClient.get(`${basePath}/get-one`, { params }),

    update: (data: TUpdate & { id: string }) =>
      apiClient.put(`${basePath}/update`, data),

    delete: (params: IDeleteParams) =>
      apiClient.delete(`${basePath}/delete`, { params }),
  };
}
