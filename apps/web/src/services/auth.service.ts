import type { ApiResponse } from '@/types/api';
import type { User } from '@/types/models';
import apiClient from './api-client';
import { API_ENDPOINTS } from './api-endpoints';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export const authService = {
  login: (data: LoginPayload): Promise<ApiResponse<User>> =>
    apiClient.post(API_ENDPOINTS.AUTH.LOGIN, data),

  logout: (): Promise<ApiResponse<null>> =>
    apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {}),

  register: (data: RegisterPayload): Promise<ApiResponse<User>> =>
    apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data),

  me: (): Promise<ApiResponse<User>> =>
    apiClient.get(API_ENDPOINTS.AUTH.ME),

  forgotPassword: (data: ForgotPasswordPayload): Promise<ApiResponse<null>> =>
    apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data),

  resetPassword: (data: ResetPasswordPayload): Promise<ApiResponse<null>> =>
    apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, data),
};
