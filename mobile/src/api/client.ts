import { API_V1_BASE_URL, API_TIMEOUT_MS } from '../constants/config';
import { getToken } from '../auth/secure-token';
import { ApiResponse, ApiError } from './types';

let unauthorizedHandler: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
  skipAuth?: boolean;
}

/**
 * Central HTTP API Client for REST V1 Endpoints.
 */
export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, timeoutMs = API_TIMEOUT_MS, skipAuth = false } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_V1_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };

  if (!skipAuth) {
    const token = await getToken();
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let result: ApiResponse<T>;
    try {
      result = await response.json();
    } catch {
      if (response.status === 401) {
        if (unauthorizedHandler) unauthorizedHandler();
        throw new ApiError('UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
      }
      throw new ApiError('INVALID_RESPONSE', 'Phản hồi từ máy chủ không hợp lệ.', response.status);
    }

    if (!response.ok || !result.success) {
      const errObj = 'error' in result && result.error ? result.error : { code: 'UNKNOWN_ERROR', message: 'Lỗi không xác định.' };

      if (response.status === 401) {
        if (unauthorizedHandler) unauthorizedHandler();
        throw new ApiError('UNAUTHORIZED', errObj.message || 'Phiên đăng nhập không hợp lệ.', 401);
      }

      if (response.status === 403) {
        throw new ApiError('FORBIDDEN', errObj.message || 'Bạn không có quyền thực hiện thao tác này.', 403);
      }

      if (response.status >= 500) {
        throw new ApiError('SERVER_ERROR', 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.', response.status);
      }

      throw new ApiError(errObj.code || 'API_ERROR', errObj.message || 'Thao tác không thành công.', response.status);
    }

    return result.data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError('NETWORK_TIMEOUT', 'Kết nối máy chủ quá thời gian. Vui lòng kiểm tra lại mạng.', 0);
    }

    throw new ApiError('NETWORK_ERROR', 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.', 0);
  }
}
