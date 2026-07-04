// === Field Report Types ===
// TODO: Replace with Prisma-generated types when database model is created

import { computeReportStats, type ReportStats } from "@/lib/reports/report-stats";

export type ReportStatus = 'APPROVED' | 'SUBMITTED' | 'REJECTED' | 'REVISION_REQUESTED' | 'DRAFT';

export type WeatherCondition =
  | "SUNNY"
  | "CLOUDY"
  | "OVERCAST"
  | "LIGHT_RAIN"
  | "HEAVY_RAIN"
  | "WINDY"
  | "STORM"
  | "OTHER";

export type ReportType = "DAILY" | "WEEKLY";

export interface ReportWorkLine {
  id: string;
  wbsItemId?: string;
  fieldProgressItemId?: string;
  categoryName?: string | null;
  code?: string | null;
  workContent: string;
  constructionCrew?: string;
  unit?: string;
  designQuantity?: number;
  quantityToday?: number;
  quantityBefore?: number;
  quantityCumulative?: number;
  approvedCumulative?: number;
  todayQuantity?: number;
  remainingQuantity?: number;
  progressPercent?: number;
  note?: string;
  issueNote?: string;
  proposalNote?: string;
}

export interface NextWeekPlan {
  id?: string;
  wbsItemId?: string;
  workContent: string;
  plannedQuantity?: number;
  unit?: string;
  resources?: string;
  materials?: string;
  assignee?: string;
  note?: string;
}


export interface ReportPhoto {
  id: string;
  url: string | null;
  caption?: string;
  createdAt?: string;
  isMissing?: boolean;
}

export interface ReportAttachment {
  id: string;
  name: string;
  url: string | null;
  type: string; // e.g. 'pdf', 'doc', 'xls'
  size: string; // e.g. '2.4 MB'
  isMissing?: boolean;
}

export interface ApprovalHistoryEntry {
  id: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'REVISION_REQUESTED';
  actor: string;
  role: string;
  timestamp: string;
  note?: string;
  detail?: string;
}

export interface FieldReport {
  id: string;
  reportNo: string; // The full database ID
  code: string;     // The short display code
  type: ReportType;
  projectId: string;
  projectName: string;
  projectStatus?: string;
  date: string;       // ISO or display string
  time: string;       // e.g. '08:30'
  
  weekStartDate?: string;
  weekEndDate?: string;
  summary?: string;

  creatorId?: string;
  creatorName: string;
  creatorRole: string;
  createdById?: string;
  
  weatherCondition: WeatherCondition;
  weatherTemperature?: number;
  
  status: ReportStatus;
  photos: ReportPhoto[];
  attachments: ReportAttachment[];
  
  // Daily specific
  workLines: ReportWorkLine[];
  
  // Weekly specific
  weeklyNote?: import('@/lib/reports/weekly-report-utils').WeeklyGeneralNote;
  
  // Backward compatibility mock data
  workContent?: string;
  progress?: string;
  
  materials: string;
  labor: string;
  quality: string;
  issues: string;
  recommendations: string;
  gpsLocation?: string;
  
  hasIssues?: boolean;
  hasNotes?: boolean;
  isSevereIssue?: boolean;
  
  approvalHistory: ApprovalHistoryEntry[];
}

export type { ReportStats };

// === Create Report Form Data ===
export interface CreateReportFormData {
  type: ReportType;
  projectId: string;
  projectName?: string; // Cache the project name
  date: string;
  time: string;
  weekStartDate?: string;
  weekEndDate?: string;
  creatorName: string;
  weatherCondition: WeatherCondition;
  weatherTemperature?: number;
  
  workLines: Omit<ReportWorkLine, 'id'>[];
  summary?: string;
  
  weeklyNote?: import('@/lib/reports/weekly-report-utils').WeeklyGeneralNote;
  
  workContent?: string; // Legacy fallback
  progress?: string;    // Legacy fallback
  
  materials: string;
  labor: string;
  quality: string;
  issues: string;
  recommendations: string;
  gpsLocation: string;
  photos: File[];
  attachments: File[];
}

export const WEATHER_OPTIONS: { value: WeatherCondition; label: string }[] = [
  { value: "SUNNY", label: "Nắng" },
  { value: "CLOUDY", label: "Có mây" },
  { value: "OVERCAST", label: "Âm u" },
  { value: "LIGHT_RAIN", label: "Mưa nhẹ" },
  { value: "HEAVY_RAIN", label: "Mưa lớn" },
  { value: "WINDY", label: "Gió mạnh" },
  { value: "STORM", label: "Bão" },
  { value: "OTHER", label: "Khác" },
];



/** Compute stats from actual reports array — never hardcode */
export function computeStats(reports: FieldReport[]): ReportStats {
  return computeReportStats(reports);
}

export function getStatusLabel(status: ReportStatus): string {
  switch (status) {
    case 'APPROVED': return 'Đã duyệt';
    case 'SUBMITTED': return 'Đã gửi - Chờ duyệt';
    case 'REVISION_REQUESTED': return 'Yêu cầu chỉnh sửa';
    case 'REJECTED': return 'Từ chối';
    case 'DRAFT': return 'Nháp';
    case 'APPROVED': return 'Đã duyệt';
    case 'SUBMITTED': return 'Chờ duyệt / Đã gửi';
    case 'REVISION_REQUESTED': return 'Yêu cầu chỉnh sửa';
    case 'REJECTED': return 'Từ chối';
    case 'DRAFT': return 'Nháp';
    default: return status;
  }
}

export function getStatusVariant(status: ReportStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'APPROVED': return 'success';
    case 'SUBMITTED': return 'warning';
    case 'REVISION_REQUESTED': return 'warning';
    case 'REJECTED': return 'danger';
    case 'DRAFT': return 'neutral';
    default: return 'neutral';
  }
}
