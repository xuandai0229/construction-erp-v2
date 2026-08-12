/**
 * Role Vietnamese Labels Mapping
 */
export const ROLE_LABELS_VN: Record<string, string> = {
  ADMIN: 'Quản trị hệ thống',
  EXECUTIVE: 'Ban điều hành',
  DIRECTOR: 'Giám đốc',
  DEPUTY_DIRECTOR: 'Phó giám đốc',
  PROJECT_MANAGER: 'Quản lý dự án',
  CHIEF_COMMANDER: 'Chỉ huy trưởng',
  SITE_COMMANDER: 'Chỉ huy trưởng công trình',
  SUPERVISION_HEAD: 'Trưởng ban giám sát',
  CONSTRUCTION_SUPERVISOR: 'Giám sát thi công',
  TECHNICAL_HEAD: 'Trưởng phòng kỹ thuật',
  SITE_ENGINEER: 'Kỹ sư công trường',
  ENGINEER: 'Kỹ sư',
  QS_ENGINEER: 'Kỹ sư QS',
  SAFETY_OFFICER: 'Cán bộ an toàn',
  STOREKEEPER: 'Thủ kho',
  SUB_CONTRACTOR: 'Nhà thầu phụ',
  WORKER: 'Công nhân',
  STAFF: 'Nhân viên',
};

export function getRoleLabelVN(role?: string | null): string {
  if (!role) return 'N/A';
  return ROLE_LABELS_VN[role] || role;
}
