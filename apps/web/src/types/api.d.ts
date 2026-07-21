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
