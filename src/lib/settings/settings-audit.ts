import type { SessionUser } from "@/lib/auth";
import { sanitizeAuditData } from "@/lib/audit-sanitizer";

export const SETTINGS_FIELD_LABELS: Record<string, string> = {
  companyName: "Tên doanh nghiệp",
  taxCode: "Mã số thuế",
  hotline: "Hotline nội bộ",
  maxUploadSizeMb: "Dung lượng tải lên tối đa",
  allowedExtensions: "Định dạng tệp được phép",
  enforceNamingConvention: "Bắt buộc chuẩn đặt tên hồ sơ",
  autoVersioning: "Tự động tạo phiên bản",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên hệ thống",
  DIRECTOR: "Giám đốc điều hành",
  DEPUTY_DIRECTOR: "Phó giám đốc",
  CHIEF_COMMANDER: "Chỉ huy trưởng",
  MANAGER: "Quản lý",
  ENGINEER: "Kỹ sư",
  STAFF: "Nhân viên",
  SUPERVISION_HEAD: "Trưởng ban giám sát",
  CONSTRUCTION_SUPERVISOR: "Cán bộ giám sát công trình",
};

export type SettingsAuditSection = "company" | "documents";

export type SettingsAuditPayload = {
  schemaVersion: 1;
  section: SettingsAuditSection;
  batchId: string;
  changedFields: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  actor: { userId: string; displayName: string; email: string; role: string };
  environment: "PRODUCTION_LIKE" | "QA";
  source: "USER_INTERFACE" | "AUTOMATED_TEST";
};

function auditEnvironment(): SettingsAuditPayload["environment"] {
  return process.env.SETTINGS_AUDIT_ENVIRONMENT === "QA" ? "QA" : "PRODUCTION_LIKE";
}

function auditSource(): SettingsAuditPayload["source"] {
  return process.env.SETTINGS_AUDIT_SOURCE === "AUTOMATED_TEST" ? "AUTOMATED_TEST" : "USER_INTERFACE";
}

export function createSettingsAuditPayload(input: {
  section: SettingsAuditSection;
  batchId: string;
  changedFields: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  actor: SessionUser;
}): SettingsAuditPayload {
  return sanitizeAuditData({
    schemaVersion: 1,
    section: input.section,
    batchId: input.batchId,
    changedFields: input.changedFields,
    before: input.before,
    after: input.after,
    actor: { userId: input.actor.id, displayName: input.actor.name, email: input.actor.email, role: input.actor.role },
    environment: auditEnvironment(),
    source: auditSource(),
  }) as SettingsAuditPayload;
}

export function parseSettingsAuditPayload(raw: string | null): Partial<SettingsAuditPayload> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed.schemaVersion === 1 && typeof parsed.section === "string" ? parsed as Partial<SettingsAuditPayload> : null;
  } catch {
    return null;
  }
}

export function getSettingsFieldLabel(field: string) {
  return SETTINGS_FIELD_LABELS[field] ?? "Trường cấu hình chưa được đặt tên";
}

export function getSettingsRoleLabel(role: string | null | undefined) {
  return role ? (ROLE_LABELS[role] ?? "Vai trò không xác định") : null;
}
