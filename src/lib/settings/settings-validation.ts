import { z } from "zod";

const MAX_UPLOAD_SIZE_MB = 100;

export function normalizeAllowedExtensions(value: string): string {
  const extensions = value
    .split(",")
    .map((extension) => extension.trim().toLowerCase().replace(/^\.+/, ""))
    .filter(Boolean);

  return [...new Set(extensions)].join(", ");
}

export const companyProfileSchema = z.object({
  companyName: z.string().trim().min(1, "Tên doanh nghiệp không được để trống").max(200, "Tên doanh nghiệp không được quá 200 ký tự"),
  taxCode: z.string().trim().max(50, "Mã số thuế không được quá 50 ký tự"),
  hotline: z.string().trim().max(50, "Hotline nội bộ không được quá 50 ký tự"),
}).strict();

export const documentPolicySchema = z.object({
  maxUploadSizeMb: z.coerce.number().int("Dung lượng phải là số nguyên").min(1, "Dung lượng tối thiểu là 1 MB").max(MAX_UPLOAD_SIZE_MB, `Dung lượng tối đa là ${MAX_UPLOAD_SIZE_MB} MB`),
  allowedExtensions: z.string().transform(normalizeAllowedExtensions).refine((value) => value.length > 0, "Cần có ít nhất một định dạng tệp được phép"),
  enforceNamingConvention: z.boolean(),
  autoVersioning: z.boolean(),
}).strict();

export const settingsUpdateEnvelopeSchema = z.object({
  expectedVersion: z.number().int().min(0),
}).strict();

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
export type DocumentPolicyInput = z.infer<typeof documentPolicySchema>;
export type CompanyProfileUpdateInput = CompanyProfileInput & z.infer<typeof settingsUpdateEnvelopeSchema>;
export type DocumentPolicyUpdateInput = DocumentPolicyInput & z.infer<typeof settingsUpdateEnvelopeSchema>;

export const DEFAULT_COMPANY_PROFILE: CompanyProfileInput = {
  companyName: "",
  taxCode: "",
  hotline: "",
};

export const DEFAULT_DOCUMENT_POLICIES: DocumentPolicyInput = {
  maxUploadSizeMb: 50,
  allowedExtensions: "pdf, doc, docx, xls, xlsx, dwg, dxf, jpg, jpeg, png, heic, webp, xml",
  enforceNamingConvention: true,
  autoVersioning: true,
};

/**
 * Defaults only support an in-memory read when no singleton row exists.
 * They deliberately contain no company identity and must never be written by a read path.
 */
export const DEFAULT_SYSTEM_SETTINGS = {
  ...DEFAULT_COMPANY_PROFILE,
  timezone: "Asia/Bangkok",
  currency: "VND",
  requireTwoFactorForAdmins: true,
  sessionTimeoutMinutes: 60,
  passwordRotationDays: 90,
  allowedIpMode: "restricted",
  trustedDeviceReviewDays: 30,
  auditSensitiveActions: true,
  materialRequestApproval: true,
  reportLockAfterApproval: true,
  ...DEFAULT_DOCUMENT_POLICIES,
  documentRetentionYears: 10,
  emailDailyDigest: false,
  approvalEscalation: true,
  fieldReportReminder: true,
  reminderTime: "17:30",
  escalationHours: 24,
  automaticBackup: true,
  backupFrequency: "daily",
  retentionYears: 7,
  exportRequiresApproval: true,
  maintenanceWindow: "22:00 - 23:00",
} as const;

export type SystemSettingsInput = typeof DEFAULT_SYSTEM_SETTINGS;
