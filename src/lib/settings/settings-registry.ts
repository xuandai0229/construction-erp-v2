import type { SystemSettingsInput } from "./settings-validation";

export type SettingCategory =
  | "company"
  | "documents"
  | "system"
  | "security"
  | "approvals"
  | "notifications"
  | "data";
export type SettingLifecycle = "active" | "deferred";

export type SettingDefinition = {
  key: keyof SystemSettingsInput;
  category: SettingCategory;
  label: string;
  lifecycle: SettingLifecycle;
  runtimeConsumer: string | null;
  owner: string;
  reason?: string;
};

/**
 * Contract register, not a UI menu. Only `active` fields may appear on /settings.
 * Deferred columns are retained for compatibility but deliberately have no editor.
 */
export const SETTINGS_REGISTRY: readonly SettingDefinition[] = [
  { key: "companyName", category: "company", label: "Tên doanh nghiệp", lifecycle: "active", runtimeConsumer: "Company profile service (export integration in progress)", owner: "Settings" },
  { key: "taxCode", category: "company", label: "Mã số thuế", lifecycle: "active", runtimeConsumer: "Company profile service", owner: "Settings" },
  { key: "hotline", category: "company", label: "Hotline nội bộ", lifecycle: "active", runtimeConsumer: "Company profile service", owner: "Settings" },
  { key: "maxUploadSizeMb", category: "documents", label: "Dung lượng tải lên tối đa", lifecycle: "active", runtimeConsumer: "POST /api/documents/upload", owner: "Documents" },
  { key: "allowedExtensions", category: "documents", label: "Định dạng tệp cho phép", lifecycle: "active", runtimeConsumer: "POST /api/documents/upload", owner: "Documents" },
  { key: "enforceNamingConvention", category: "documents", label: "Quy tắc đặt tên", lifecycle: "active", runtimeConsumer: "POST /api/documents/upload", owner: "Documents" },
  { key: "autoVersioning", category: "documents", label: "Tự động tạo phiên bản", lifecycle: "active", runtimeConsumer: "POST /api/documents/upload", owner: "Documents" },

  { key: "timezone", category: "system", label: "Múi giờ", lifecycle: "deferred", runtimeConsumer: null, owner: "Architecture", reason: "Chưa có consumer nghiệp vụ toàn hệ thống." },
  { key: "currency", category: "system", label: "Tiền tệ", lifecycle: "deferred", runtimeConsumer: null, owner: "Architecture", reason: "Chưa có consumer nghiệp vụ toàn hệ thống." },
  { key: "requireTwoFactorForAdmins", category: "security", label: "Bắt buộc MFA", lifecycle: "deferred", runtimeConsumer: null, owner: "Identity & Security", reason: "Không có flow MFA để thực thi." },
  { key: "sessionTimeoutMinutes", category: "security", label: "Thời hạn phiên", lifecycle: "deferred", runtimeConsumer: null, owner: "Identity & Security", reason: "Session không đọc cột này." },
  { key: "passwordRotationDays", category: "security", label: "Chu kỳ mật khẩu", lifecycle: "deferred", runtimeConsumer: null, owner: "Identity & Security", reason: "Không có password rotation." },
  { key: "allowedIpMode", category: "security", label: "Giới hạn IP", lifecycle: "deferred", runtimeConsumer: null, owner: "Identity & Security", reason: "Không có IP allowlist enforcement." },
  { key: "trustedDeviceReviewDays", category: "security", label: "Rà soát thiết bị", lifecycle: "deferred", runtimeConsumer: null, owner: "Identity & Security", reason: "Không có device registry." },
  { key: "auditSensitiveActions", category: "security", label: "Audit hành động nhạy cảm", lifecycle: "deferred", runtimeConsumer: null, owner: "Identity & Security", reason: "Không được dùng làm feature flag." },
  { key: "materialRequestApproval", category: "approvals", label: "Duyệt yêu cầu vật tư", lifecycle: "deferred", runtimeConsumer: null, owner: "Approval Center", reason: "Approval Center là chủ sở hữu nghiệp vụ." },
  { key: "reportLockAfterApproval", category: "approvals", label: "Khóa báo cáo sau duyệt", lifecycle: "deferred", runtimeConsumer: null, owner: "Approval Center", reason: "Approval Center là chủ sở hữu nghiệp vụ." },
  { key: "documentRetentionYears", category: "documents", label: "Thời hạn lưu hồ sơ", lifecycle: "deferred", runtimeConsumer: null, owner: "Documents", reason: "Chưa có job retention." },
  { key: "emailDailyDigest", category: "notifications", label: "Email tổng hợp", lifecycle: "deferred", runtimeConsumer: null, owner: "Notifications", reason: "Chưa có delivery job/SMTP contract." },
  { key: "approvalEscalation", category: "notifications", label: "Leo thang phê duyệt", lifecycle: "deferred", runtimeConsumer: null, owner: "Approval Center", reason: "Chưa có scheduler enforcement." },
  { key: "fieldReportReminder", category: "notifications", label: "Nhắc báo cáo hiện trường", lifecycle: "deferred", runtimeConsumer: null, owner: "Notifications", reason: "Chưa có delivery job." },
  { key: "reminderTime", category: "notifications", label: "Giờ nhắc", lifecycle: "deferred", runtimeConsumer: null, owner: "Notifications", reason: "Phụ thuộc tính năng reminder chưa thực thi." },
  { key: "escalationHours", category: "notifications", label: "Thời gian leo thang", lifecycle: "deferred", runtimeConsumer: null, owner: "Approval Center", reason: "Phụ thuộc scheduler chưa thực thi." },
  { key: "automaticBackup", category: "data", label: "Backup tự động", lifecycle: "deferred", runtimeConsumer: null, owner: "Platform", reason: "Không có backup provider/job." },
  { key: "backupFrequency", category: "data", label: "Chu kỳ backup", lifecycle: "deferred", runtimeConsumer: null, owner: "Platform", reason: "Không có backup provider/job." },
  { key: "retentionYears", category: "data", label: "Lưu giữ backup", lifecycle: "deferred", runtimeConsumer: null, owner: "Platform", reason: "Không có backup provider/job." },
  { key: "exportRequiresApproval", category: "data", label: "Duyệt xuất dữ liệu", lifecycle: "deferred", runtimeConsumer: null, owner: "Platform", reason: "Không có export approval enforcement." },
  { key: "maintenanceWindow", category: "data", label: "Khung bảo trì", lifecycle: "deferred", runtimeConsumer: null, owner: "Platform", reason: "Không có maintenance scheduler." },
];

export const ACTIVE_SETTINGS = SETTINGS_REGISTRY.filter((setting) => setting.lifecycle === "active");
export const DEFERRED_SETTINGS = SETTINGS_REGISTRY.filter((setting) => setting.lifecycle === "deferred");
