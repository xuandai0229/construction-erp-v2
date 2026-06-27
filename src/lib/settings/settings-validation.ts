import { z } from "zod";

export const systemSettingsSchema = z.object({
  // Organization
  companyName: z.string().min(1, "Tên doanh nghiệp không được để trống").max(200, "Tên quá dài"),
  taxCode: z.string().max(50, "Mã số thuế quá dài").optional().nullable(),
  hotline: z.string().max(50, "Hotline quá dài").optional().nullable(),
  timezone: z.string().min(1, "Múi giờ không được để trống").max(100),
  currency: z.string().min(1, "Tiền tệ không được để trống").max(10),
  fiscalYearStartMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "Tháng tài chính không hợp lệ"),

  // Security
  requireTwoFactorForAdmins: z.boolean(),
  sessionTimeoutMinutes: z.number().int().min(15, "Thời gian timeout tối thiểu 15 phút").max(1440, "Thời gian timeout tối đa 24h"),
  passwordRotationDays: z.number().int().min(30, "Xoay vòng mật khẩu tối thiểu 30 ngày").max(365, "Xoay vòng mật khẩu tối đa 365 ngày"),
  allowedIpMode: z.enum(["restricted", "open"]),
  trustedDeviceReviewDays: z.number().int().min(1, "Tối thiểu 1 ngày").max(365, "Tối đa 365 ngày"),
  auditSensitiveActions: z.boolean(),

  // Workflow
  requireProjectCodeBeforeSpending: z.boolean(),
  materialRequestApproval: z.boolean(),
  paymentTwoStepApproval: z.boolean(),
  reportLockAfterApproval: z.boolean(),
  contractValueThreshold: z.number().min(0, "Ngưỡng không được âm"),

  // Documents
  enforceNamingConvention: z.boolean(),
  autoVersioning: z.boolean(),
  allowedExtensions: z.string().transform(s => s.toLowerCase().trim()),
  documentRetentionYears: z.number().int().min(1, "Tối thiểu 1 năm").max(50, "Tối đa 50 năm"),

  // Notifications
  emailDailyDigest: z.boolean(),
  approvalEscalation: z.boolean(),
  fieldReportReminder: z.boolean(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Định dạng giờ phải là HH:mm"),
  escalationHours: z.number().int().min(1, "Tối thiểu 1 giờ").max(720, "Tối đa 720 giờ (30 ngày)"),

  // Data
  automaticBackup: z.boolean(),
  backupFrequency: z.enum(["daily", "weekly"]),
  retentionYears: z.number().int().min(1, "Tối thiểu 1 năm").max(50, "Tối đa 50 năm"),
  exportRequiresApproval: z.boolean(),
  maintenanceWindow: z.string().max(100),
});

export type SystemSettingsInput = z.infer<typeof systemSettingsSchema>;

export const DEFAULT_SYSTEM_SETTINGS = {
  companyName: "CT2 Hanoi Construction",
  taxCode: "0109998888",
  hotline: "024 3868 2026",
  timezone: "Asia/Bangkok",
  currency: "VND",
  fiscalYearStartMonth: "01",
  requireTwoFactorForAdmins: true,
  sessionTimeoutMinutes: 60,
  passwordRotationDays: 90,
  allowedIpMode: "restricted" as const,
  trustedDeviceReviewDays: 30,
  auditSensitiveActions: true,
  requireProjectCodeBeforeSpending: true,
  materialRequestApproval: true,
  paymentTwoStepApproval: true,
  reportLockAfterApproval: true,
  contractValueThreshold: 500000000,
  enforceNamingConvention: true,
  autoVersioning: true,
  allowedExtensions: "pdf, doc, docx, xls, xlsx, dwg, dxf, jpg, jpeg, png, heic, webp, xml",
  documentRetentionYears: 10,
  emailDailyDigest: false,
  approvalEscalation: true,
  fieldReportReminder: true,
  reminderTime: "17:30",
  escalationHours: 24,
  automaticBackup: true,
  backupFrequency: "daily" as const,
  retentionYears: 7,
  exportRequiresApproval: true,
  maintenanceWindow: "22:00 - 23:00",
};
