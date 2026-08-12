import { apiRequest } from './client';
import { ApiResponse } from './types';
import { DailyProgressEntry, CreateDailyProgressPayload } from '../progress/progress-types';

export async function getDailyProgressApi(
  projectId: string,
  page = 1,
  pageSize = 20
): Promise<{ items: DailyProgressEntry[]; total: number }> {
  const response = await apiRequest<ApiResponse<DailyProgressEntry[]>>(
    `/projects/${projectId}/progress/daily?page=${page}&pageSize=${pageSize}`
  );
  if (response.success) {
    return {
      items: response.data || [],
      total: response.meta?.total || (response.data?.length || 0),
    };
  }
  return { items: [], total: 0 };
}

export async function createDailyProgressApi(
  projectId: string,
  payload: CreateDailyProgressPayload
): Promise<DailyProgressEntry> {
  const response = await apiRequest<ApiResponse<DailyProgressEntry>>(
    `/projects/${projectId}/progress/daily`,
    {
      method: 'POST',
      body: payload,
    }
  );
  if (!response.success || !response.data) {
    throw new Error(response.success === false ? response.error.message : 'Không thể tạo bản ghi nhật ký tiến độ.');
  }
  return response.data;
}
