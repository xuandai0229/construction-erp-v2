// === Field Report Types ===
// TODO: Replace with Prisma-generated types when database model is created

export type ReportStatus = 'APPROVED' | 'SUBMITTED' | 'REJECTED' | 'DRAFT';

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
  workContent: string;
  constructionCrew?: string;
  unit?: string;
  quantityToday?: number;
  quantityCumulative?: number;
  note?: string;
}

export interface ReportPhoto {
  id: string;
  url: string;
  caption?: string;
  createdAt?: string;
}

export interface ReportAttachment {
  id: string;
  name: string;
  url: string;
  type: string; // e.g. 'pdf', 'doc', 'xls'
  size: string; // e.g. '2.4 MB'
}

export interface ApprovalHistoryEntry {
  id: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RETURNED';
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
  
  // Backward compatibility mock data
  workContent?: string;
  progress?: string;
  
  materials: string;
  labor: string;
  quality: string;
  issues: string;
  recommendations: string;
  gpsLocation?: string;
  approvalHistory: ApprovalHistoryEntry[];
}

export interface ReportStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  approvalRate: number; // percentage
}

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
  const total = reports.length;
  const approved = reports.filter((r) => r.status === 'APPROVED').length;
  const pending = reports.filter((r) => r.status === 'SUBMITTED').length;
  const rejected = reports.filter((r) => r.status === 'REJECTED').length;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  return { total, approved, pending, rejected, approvalRate };
}

export function getStatusLabel(status: ReportStatus): string {
  switch (status) {
    case 'APPROVED': return 'Đã duyệt';
    case 'SUBMITTED': return 'Chờ duyệt / Đã gửi';
    case 'REJECTED': return 'Từ chối';
    case 'DRAFT': return 'Nháp';
    default: return status;
  }
}

export function getStatusVariant(status: ReportStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'APPROVED': return 'success';
    case 'SUBMITTED': return 'warning';
    case 'REJECTED': return 'danger';
    case 'DRAFT': return 'neutral';
    default: return 'neutral';
  }
}
