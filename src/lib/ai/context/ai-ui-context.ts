import { AIUIContextCandidate } from "../types";

export const AI_MODULE_LABELS: Record<string, string> = {
  DASHBOARD: "Tổng quan",
  PROJECTS: "Công trình",
  MATERIALS: "Vật tư",
  REPORTS: "Báo cáo",
  SUPERVISION: "Giám sát",
  APPROVALS: "Phê duyệt",
  DOCUMENTS: "Tài liệu",
  HR: "Nhân sự",
  SETTINGS: "Cài đặt",
  OTHER: "Khu vực khác",
};

const MODULE_BY_SEGMENT: Record<string, string> = {
  dashboard: "DASHBOARD",
  projects: "PROJECTS",
  materials: "MATERIALS",
  reports: "REPORTS",
  supervision: "SUPERVISION",
  approvals: "APPROVALS",
  documents: "DOCUMENTS",
  hr: "HR",
  settings: "SETTINGS",
};

const SAFE_RECORD_ID = /^[a-zA-Z0-9_-]{1,128}$/;

export interface ValidatedAIUIContext {
  route: string;
  module: string;
  recordType?: string;
  recordId?: string;
}

export function deriveAIUIContext(pathname: string | null | undefined): ValidatedAIUIContext {
  const safePath = typeof pathname === "string" && pathname.startsWith("/")
    ? pathname.split("?")[0].slice(0, 240)
    : "/dashboard";
  const segments = safePath.split("/").filter(Boolean);
  const moduleName = MODULE_BY_SEGMENT[segments[0] || "dashboard"] || "OTHER";

  if (segments[0] === "projects" && segments[1] && SAFE_RECORD_ID.test(segments[1])) {
    return { route: safePath, module: moduleName, recordType: "PROJECT", recordId: segments[1] };
  }
  if (segments[0] === "reports" && segments[2] && SAFE_RECORD_ID.test(segments[2])) {
    return { route: safePath, module: moduleName, recordType: "FIELD_REPORT", recordId: segments[2] };
  }

  return { route: safePath, module: moduleName };
}

export function validateAIUIContextCandidate(candidate?: AIUIContextCandidate): ValidatedAIUIContext {
  const derived = deriveAIUIContext(candidate?.route);
  return {
    ...derived,
    ...(candidate?.recordType && candidate.recordId && SAFE_RECORD_ID.test(candidate.recordId)
      ? {
          recordType: candidate.recordType.replace(/[^A-Z_]/gi, "").toUpperCase().slice(0, 40),
          recordId: candidate.recordId,
        }
      : {}),
  };
}

export function getAIModuleLabel(moduleName: string): string {
  return AI_MODULE_LABELS[moduleName] || AI_MODULE_LABELS.OTHER;
}
