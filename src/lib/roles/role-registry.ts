import { ProjectRole, UserRole } from "@prisma/client";

export type RoleCategory = "SYSTEM" | "PROJECT";
export type PermissionScope = "GLOBAL" | "ASSIGNED_PROJECTS" | "OWN_RECORDS" | "DEPARTMENT" | "NONE";

export interface SystemRoleDefinition {
  category: "SYSTEM";
  label: string;
  description: string;
  level: number;
  sensitive: boolean;
  defaultScope: PermissionScope;
}

export interface ProjectRoleDefinition {
  category: "PROJECT";
  label: string;
  description: string;
  sensitive: boolean;
  defaultScope: "ASSIGNED_PROJECTS";
}

/**
 * Canonical presentation metadata only. This registry does not itself grant a
 * permission: server guards remain the authority until Phase 2 centralisation.
 */
export const SYSTEM_ROLE_REGISTRY: Record<UserRole, SystemRoleDefinition> = {
  ADMIN: {
    category: "SYSTEM",
    label: "Quản trị viên hệ thống",
    description: "Quản trị kỹ thuật và cấu hình hệ thống.",
    level: 100,
    sensitive: true,
    defaultScope: "GLOBAL",
  },
  DIRECTOR: {
    category: "SYSTEM",
    label: "Giám đốc điều hành",
    description: "Điều hành và phê duyệt nghiệp vụ toàn công ty.",
    level: 90,
    sensitive: true,
    defaultScope: "GLOBAL",
  },
  DEPUTY_DIRECTOR: {
    category: "SYSTEM",
    label: "Phó giám đốc",
    description: "Điều hành theo phân quyền toàn công ty.",
    level: 80,
    sensitive: true,
    defaultScope: "GLOBAL",
  },
  SUPERVISION_HEAD: {
    category: "SYSTEM",
    label: "Trưởng ban giám sát",
    description: "Giám sát độc lập theo phạm vi công trình do Quản trị viên chỉ định.",
    level: 60,
    sensitive: true,
    defaultScope: "ASSIGNED_PROJECTS",
  },
  CHIEF_COMMANDER: {
    category: "SYSTEM",
    label: "Chỉ huy trưởng",
    description: "Vai trò nghiệp vụ hiện trường cấp hệ thống.",
    level: 50,
    sensitive: false,
    defaultScope: "ASSIGNED_PROJECTS",
  },
  MANAGER: {
    category: "SYSTEM",
    label: "Quản lý",
    description: "Vai trò quản lý nghiệp vụ.",
    level: 30,
    sensitive: false,
    defaultScope: "ASSIGNED_PROJECTS",
  },
  ENGINEER: {
    category: "SYSTEM",
    label: "Kỹ sư",
    description: "Vai trò kỹ thuật/nghiệp vụ hiện trường.",
    level: 20,
    sensitive: false,
    defaultScope: "ASSIGNED_PROJECTS",
  },
  STAFF: {
    category: "SYSTEM",
    label: "Nhân viên",
    description: "Vai trò nghiệp vụ cơ bản.",
    level: 10,
    sensitive: false,
    defaultScope: "ASSIGNED_PROJECTS",
  },
};

export const PROJECT_ROLE_REGISTRY: Record<ProjectRole, ProjectRoleDefinition> = {
  PROJECT_MANAGER: { category: "PROJECT", label: "Quản lý dự án", description: "Điều phối dự án được gán.", sensitive: true, defaultScope: "ASSIGNED_PROJECTS" },
  SITE_COMMANDER: { category: "PROJECT", label: "Chỉ huy công trường", description: "Điều hành hiện trường của công trình được gán.", sensitive: true, defaultScope: "ASSIGNED_PROJECTS" },
  CHIEF_COMMANDER: { category: "PROJECT", label: "Chỉ huy trưởng công trình", description: "Chỉ huy tại công trình được gán.", sensitive: true, defaultScope: "ASSIGNED_PROJECTS" },
  ASSISTANT_COMMANDER: { category: "PROJECT", label: "Chỉ huy phó", description: "Hỗ trợ chỉ huy tại công trình được gán.", sensitive: false, defaultScope: "ASSIGNED_PROJECTS" },
  QA_QC: { category: "PROJECT", label: "QA/QC", description: "Kiểm soát chất lượng tại công trình được gán.", sensitive: false, defaultScope: "ASSIGNED_PROJECTS" },
  HSE: { category: "PROJECT", label: "An toàn HSE", description: "An toàn lao động tại công trình được gán.", sensitive: false, defaultScope: "ASSIGNED_PROJECTS" },
  SUPERVISOR: { category: "PROJECT", label: "Giám sát", description: "Giám sát thi công tại công trình được gán.", sensitive: false, defaultScope: "ASSIGNED_PROJECTS" },
  VIEWER: { category: "PROJECT", label: "Chỉ xem", description: "Chỉ xem dữ liệu trong công trình được gán.", sensitive: false, defaultScope: "ASSIGNED_PROJECTS" },
};

export const SYSTEM_ROLE_DISPLAY_NAMES: Record<UserRole, string> = Object.fromEntries(
  Object.entries(SYSTEM_ROLE_REGISTRY).map(([role, definition]) => [role, definition.label]),
) as Record<UserRole, string>;

export const PROJECT_ROLE_DISPLAY_NAMES: Record<ProjectRole, string> = Object.fromEntries(
  Object.entries(PROJECT_ROLE_REGISTRY).map(([role, definition]) => [role, definition.label]),
) as Record<ProjectRole, string>;
