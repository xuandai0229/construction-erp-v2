import { AIRiskLevel } from "../types";

export interface ToolCatalogItem {
  name: string;
  sourceService: string;
  operation: "READ" | "WRITE" | "DELETE" | "ADMIN";
  permission: string;
  scope: "GLOBAL" | "PROJECT_SCOPE" | "OWN_RECORDS";
  riskLevel: AIRiskLevel;
  confirmation: "NONE" | "USER_CONFIRM" | "ADMIN_CONFIRM" | "NEVER";
  aiAllowed: boolean;
  notes: string;
}

/**
 * Comprehensive Backend Capability & AI Tool Catalog
 */
export const AI_TOOL_CATALOG: ToolCatalogItem[] = [
  // --- Phase 1 Read Tools (AI ALLOWED) ---
  {
    name: "get_my_projects",
    sourceService: "src/lib/project-context.ts",
    operation: "READ",
    permission: "projects.view",
    scope: "PROJECT_SCOPE",
    riskLevel: "READ_SAFE",
    confirmation: "NONE",
    aiAllowed: true,
    notes: "Trả về danh sách công trình người dùng được phân quyền.",
  },
  {
    name: "get_project_summary",
    sourceService: "src/app/api/v1/projects/[projectId]",
    operation: "READ",
    permission: "projects.view",
    scope: "PROJECT_SCOPE",
    riskLevel: "READ_SAFE",
    confirmation: "NONE",
    aiAllowed: true,
    notes: "Tổng quan trạng thái, tiến độ, số lượng báo cáo công trình.",
  },
  {
    name: "get_latest_field_reports",
    sourceService: "src/app/(dashboard)/reports/actions.ts",
    operation: "READ",
    permission: "reports.view",
    scope: "PROJECT_SCOPE",
    riskLevel: "READ_SAFE",
    confirmation: "NONE",
    aiAllowed: true,
    notes: "Danh sách nhật ký thi công gần nhất (tối đa 50 bản ghi).",
  },
  {
    name: "get_project_material_summary",
    sourceService: "src/lib/materials/ledger.ts",
    operation: "READ",
    permission: "materials.view",
    scope: "PROJECT_SCOPE",
    riskLevel: "READ_SAFE",
    confirmation: "NONE",
    aiAllowed: true,
    notes: "Bảng tổng hợp tồn kho và nhập xuất vật tư công trình.",
  },
  {
    name: "get_pending_items",
    sourceService: "src/lib/approvals/approval-policy.ts",
    operation: "READ",
    permission: "approvals.view",
    scope: "PROJECT_SCOPE",
    riskLevel: "READ_SAFE",
    confirmation: "NONE",
    aiAllowed: true,
    notes: "Danh sách việc cần làm / chờ duyệt theo vai trò người dùng.",
  },

  // --- Read Sensitive Tools (Not exposed in Phase 1) ---
  {
    name: "get_employee_directory",
    sourceService: "src/lib/hr/employee-service.ts",
    operation: "READ",
    permission: "hr.employees.view",
    scope: "GLOBAL",
    riskLevel: "READ_SENSITIVE",
    confirmation: "NONE",
    aiAllowed: false,
    notes: "Danh bạ nhân sự — yêu cầu kiểm soát PII nghiêm ngặt.",
  },
  {
    name: "get_audit_logs",
    sourceService: "src/lib/audit.ts",
    operation: "READ",
    permission: "audit.view_global",
    scope: "GLOBAL",
    riskLevel: "READ_SENSITIVE",
    confirmation: "ADMIN_CONFIRM",
    aiAllowed: false,
    notes: "Nhật ký hệ thống — chỉ dành cho Quản trị viên.",
  },

  // --- Draft Write Tools (Planned Phase 4) ---
  {
    name: "create_site_report_draft",
    sourceService: "src/app/(dashboard)/reports/actions.ts",
    operation: "WRITE",
    permission: "reports.create",
    scope: "PROJECT_SCOPE",
    riskLevel: "DRAFT_WRITE",
    confirmation: "USER_CONFIRM",
    aiAllowed: false,
    notes: "Tạo bản nháp báo cáo hiện trường — bắt buộc xác nhận người dùng.",
  },
  {
    name: "create_material_proposal_draft",
    sourceService: "src/lib/material-proposals/actions.ts",
    operation: "WRITE",
    permission: "materials.request",
    scope: "PROJECT_SCOPE",
    riskLevel: "DRAFT_WRITE",
    confirmation: "USER_CONFIRM",
    aiAllowed: false,
    notes: "Tạo bản nháp đề xuất vật tư — bắt buộc xác nhận người dùng.",
  },

  // --- High Risk Write Tools (Never Autonomous) ---
  {
    name: "approve_site_report",
    sourceService: "src/app/(dashboard)/reports/actions.ts",
    operation: "WRITE",
    permission: "reports.approve",
    scope: "GLOBAL",
    riskLevel: "HIGH_RISK_WRITE",
    confirmation: "ADMIN_CONFIRM",
    aiAllowed: false,
    notes: "Phê duyệt báo cáo — AI tuyệt đối không tự phê duyệt.",
  },
  {
    name: "approve_material_proposal",
    sourceService: "src/lib/material-proposals/actions.ts",
    operation: "WRITE",
    permission: "materials.approve",
    scope: "GLOBAL",
    riskLevel: "HIGH_RISK_WRITE",
    confirmation: "ADMIN_CONFIRM",
    aiAllowed: false,
    notes: "Phê duyệt vật tư — AI tuyệt đối không tự phê duyệt.",
  },

  // --- Destructive & Security Admin Tools (Permanently FORBIDDEN for AI) ---
  {
    name: "delete_project",
    sourceService: "src/app/(dashboard)/projects/actions.ts",
    operation: "DELETE",
    permission: "projects.delete",
    scope: "GLOBAL",
    riskLevel: "DESTRUCTIVE",
    confirmation: "NEVER",
    aiAllowed: false,
    notes: "CẤM TUYỆT ĐỐI đối với AI.",
  },
  {
    name: "delete_user",
    sourceService: "src/app/(dashboard)/users/actions.ts",
    operation: "DELETE",
    permission: "users.deactivate",
    scope: "GLOBAL",
    riskLevel: "DESTRUCTIVE",
    confirmation: "NEVER",
    aiAllowed: false,
    notes: "CẤM TUYỆT ĐỐI đối với AI.",
  },
  {
    name: "raw_sql",
    sourceService: "prisma.$queryRaw",
    operation: "ADMIN",
    permission: "system.raw_sql",
    scope: "GLOBAL",
    riskLevel: "SECURITY_ADMIN",
    confirmation: "NEVER",
    aiAllowed: false,
    notes: "CẤM TUYỆT ĐỐI đối với AI.",
  },
  {
    name: "update_user_role",
    sourceService: "src/app/(dashboard)/users/actions.ts",
    operation: "ADMIN",
    permission: "users.assign_system_role",
    scope: "GLOBAL",
    riskLevel: "SECURITY_ADMIN",
    confirmation: "NEVER",
    aiAllowed: false,
    notes: "CẤM TUYỆT ĐỐI đối với AI.",
  },
  {
    name: "change_system_settings",
    sourceService: "src/app/(dashboard)/settings/actions.ts",
    operation: "ADMIN",
    permission: "settings.company.manage",
    scope: "GLOBAL",
    riskLevel: "SECURITY_ADMIN",
    confirmation: "NEVER",
    aiAllowed: false,
    notes: "CẤM TUYỆT ĐỐI đối với AI.",
  },
];
