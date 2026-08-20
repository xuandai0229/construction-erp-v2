import { FieldPolicyContext } from "./ai-field-policy";

export interface FieldReportRawData {
  id: string;
  reportNo: string;
  reportDate: Date;
  status: string;
  weather: string | null;
  weatherCondition: string | null;
  createdAt: Date;
  createdBy?: {
    name: string;
    username: string | null;
  } | null;
  _count?: {
    lines: number;
    photos: number;
  };
}

export interface FieldReportRoleSafeDTO {
  id: string;
  reportNo: string;
  reportDate: string;
  status: string;
  weather?: string;
  author?: string;
  workItemsCount: number;
  photosCount: number;
}

export function applyReportFieldPolicy(
  rawReports: FieldReportRawData[],
  _context: FieldPolicyContext
): FieldReportRoleSafeDTO[] {
  return rawReports.map((r) => {
    const dto: FieldReportRoleSafeDTO = {
      id: r.id,
      reportNo: r.reportNo,
      reportDate: r.reportDate.toISOString().split("T")[0],
      status: r.status,
      workItemsCount: r._count?.lines || 0,
      photosCount: r._count?.photos || 0,
    };
    if (r.weather || r.weatherCondition) {
      dto.weather = r.weatherCondition || r.weather || undefined;
    }
    if (r.createdBy?.name) {
      dto.author = r.createdBy.name;
    }
    return dto;
  });
}
