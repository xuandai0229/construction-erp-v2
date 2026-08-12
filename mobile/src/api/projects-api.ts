import { apiRequest } from './client';
import { Project, ProjectDashboardData } from '../project/project-types';

export async function getProjectsApi(): Promise<Project[]> {
  return await apiRequest<Project[]>('/projects', {
    method: 'GET',
  });
}

export async function getProjectDetailApi(projectId: string): Promise<Project> {
  return await apiRequest<Project>(`/projects/${projectId}`, {
    method: 'GET',
  });
}

export async function getProjectDashboardApi(projectId: string): Promise<ProjectDashboardData> {
  return await apiRequest<ProjectDashboardData>(`/projects/${projectId}/dashboard`, {
    method: 'GET',
  });
}
