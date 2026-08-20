import { UserRole } from "@prisma/client";
import { ToolPolicyRule } from "./ai-policy-types";

export const ALL_ROLES: UserRole[] = [
  "ADMIN",
  "DIRECTOR",
  "DEPUTY_DIRECTOR",
  "SUPERVISION_HEAD",
  "CONSTRUCTION_SUPERVISOR",
  "CHIEF_COMMANDER",
  "MANAGER",
  "ENGINEER",
  "STAFF",
];

export const COMPANY_ADMIN_ROLES: UserRole[] = [
  "ADMIN",
  "DIRECTOR",
  "DEPUTY_DIRECTOR",
];

export const PROJECT_OPERATIONAL_ROLES: UserRole[] = [
  "ADMIN",
  "DIRECTOR",
  "DEPUTY_DIRECTOR",
  "SUPERVISION_HEAD",
  "CONSTRUCTION_SUPERVISOR",
  "CHIEF_COMMANDER",
  "MANAGER",
  "ENGINEER",
  "STAFF",
];

/**
 * Authoritative Policy Rules Table
 *
 * Any tool NOT listed here will fail closed and evaluate to FORBIDDEN.
 */
export const AI_TOOL_POLICY_RULES: Record<string, ToolPolicyRule> = {
  // --- Allowed Phase 1 Read Tools ---
  get_my_projects: {
    toolName: "get_my_projects",
    allowedRoles: ALL_ROLES,
    policyType: "AUTO_READ",
    riskLevel: "READ_SAFE",
    requiresProjectScope: false, // Scoping is done inside the query
    maxLimit: 100,
    description: "Lấy danh sách các công trình mà người dùng hiện tại được phép xem.",
  },
  get_project_summary: {
    toolName: "get_project_summary",
    allowedRoles: ALL_ROLES,
    policyType: "AUTO_READ",
    riskLevel: "READ_SAFE",
    requiresProjectScope: true,
    description: "Lấy thông tin tổng hợp và trạng thái của một công trình cụ thể.",
  },
  get_latest_field_reports: {
    toolName: "get_latest_field_reports",
    allowedRoles: PROJECT_OPERATIONAL_ROLES,
    policyType: "AUTO_READ",
    riskLevel: "READ_SAFE",
    requiresProjectScope: true,
    maxLimit: 50,
    description: "Lấy danh sách nhật ký thi công hiện trường gần nhất của công trình.",
  },
  get_project_material_summary: {
    toolName: "get_project_material_summary",
    allowedRoles: PROJECT_OPERATIONAL_ROLES,
    policyType: "AUTO_READ",
    riskLevel: "READ_SAFE",
    requiresProjectScope: true,
    maxLimit: 100,
    description: "Lấy bảng tổng hợp tồn kho và luân chuyển vật tư của công trình.",
  },
  get_pending_items: {
    toolName: "get_pending_items",
    allowedRoles: ALL_ROLES,
    policyType: "AUTO_READ",
    riskLevel: "READ_SAFE",
    requiresProjectScope: false, // Scoped per user role/memberships inside
    maxLimit: 50,
    description: "Lấy danh sách các công việc, phê duyệt hoặc báo cáo đang chờ xử lý.",
  },

  // --- Explicitly Prohibited Operations (Defense in Depth) ---
  raw_sql: {
    toolName: "raw_sql",
    allowedRoles: [],
    policyType: "FORBIDDEN",
    riskLevel: "SECURITY_ADMIN",
    requiresProjectScope: false,
    description: "Cấm tuyệt đối: Chạy câu lệnh SQL trực tiếp.",
  },
  delete_project: {
    toolName: "delete_project",
    allowedRoles: [],
    policyType: "FORBIDDEN",
    riskLevel: "DESTRUCTIVE",
    requiresProjectScope: true,
    description: "Cấm tuyệt đối: Xóa dữ liệu công trình.",
  },
  delete_user: {
    toolName: "delete_user",
    allowedRoles: [],
    policyType: "FORBIDDEN",
    riskLevel: "DESTRUCTIVE",
    requiresProjectScope: false,
    description: "Cấm tuyệt đối: Xóa tài khoản người dùng.",
  },
  delete_employee: {
    toolName: "delete_employee",
    allowedRoles: [],
    policyType: "FORBIDDEN",
    riskLevel: "DESTRUCTIVE",
    requiresProjectScope: false,
    description: "Cấm tuyệt đối: Xóa hồ sơ nhân sự.",
  },
  update_user_role: {
    toolName: "update_user_role",
    allowedRoles: [],
    policyType: "FORBIDDEN",
    riskLevel: "SECURITY_ADMIN",
    requiresProjectScope: false,
    description: "Cấm tuyệt đối: Thay đổi vai trò người dùng.",
  },
  grant_access: {
    toolName: "grant_access",
    allowedRoles: [],
    policyType: "FORBIDDEN",
    riskLevel: "SECURITY_ADMIN",
    requiresProjectScope: false,
    description: "Cấm tuyệt đối: Cấp quyền hệ thống.",
  },
  change_system_settings: {
    toolName: "change_system_settings",
    allowedRoles: [],
    policyType: "FORBIDDEN",
    riskLevel: "SECURITY_ADMIN",
    requiresProjectScope: false,
    description: "Cấm tuyệt đối: Thay đổi cấu hình hệ thống.",
  },
};
