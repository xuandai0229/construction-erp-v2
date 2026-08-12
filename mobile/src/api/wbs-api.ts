import { apiRequest } from './client';
import { ApiResponse } from './types';
import { WbsItem } from '../wbs/wbs-types';

export async function getWbsApi(projectId: string): Promise<WbsItem[]> {
  const response = await apiRequest<ApiResponse<WbsItem[]>>(`/projects/${projectId}/wbs`);
  return response.data || [];
}
