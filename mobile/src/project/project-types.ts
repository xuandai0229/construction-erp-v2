/**
 * Project Types
 */

export interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  investor?: string | null;
  location?: string | null;
}

export interface ProjectDashboardMetrics {
  totalWbsItems: number;
  totalDailyLogs: number;
  pendingProposals: number;
  pendingApprovals: number;
  activePersonnel: number;
}

export interface ProjectDashboardData {
  project: Project;
  metrics: ProjectDashboardMetrics;
}
