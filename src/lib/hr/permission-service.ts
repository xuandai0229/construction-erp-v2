import {
  PrismaClient,
  GrantEffect,
  HrDataScope,
  SensitiveFieldPolicy,
} from "@prisma/client";

export const CANONICAL_HR_PERMISSIONS = [
  { code: "hr:employee:read", name: "Xem thông tin nhân viên", description: "Quyền xem hồ sơ nhân viên cơ bản" },
  { code: "hr:employee:create", name: "Tạo mới nhân viên", description: "Quyền khởi tạo hồ sơ nhân viên mới" },
  { code: "hr:employee:update", name: "Cập nhật nhân viên", description: "Quyền chỉnh sửa thông tin nhân viên" },
  { code: "hr:employee:delete", name: "Xóa / Lưu trữ nhân viên", description: "Quyền xóa hoặc vô hiệu hóa nhân viên" },
  { code: "hr:employee:read_sensitive", name: "Xem thông tin nhạy cảm (CCCD/CMND)", description: "Quyền giải mã và xem PII nhạy cảm" },
  { code: "hr:organization:manage", name: "Quản lý sơ đồ tổ chức", description: "Quyền tạo/sửa phòng ban đơn vị" },
  { code: "hr:position:manage", name: "Quản lý danh mục chức danh", description: "Quyền cấu hình chức danh" },
  { code: "hr:project_role:manage", name: "Quản lý vai trò dự án", description: "Quyền định nghĩa vai trò nhân sự dự án" },
  { code: "hr:access_grant:manage", name: "Cấp phát phân quyền HR", description: "Quyền ủy quyền và cấp phép HR" },
] as const;


export interface HrPermissionCheckResult {
  allowed: boolean;
  effect: GrantEffect;
  scope: HrDataScope;
  sensitiveFieldPolicy: SensitiveFieldPolicy;
  reason?: string;
}

export interface PermissionCheckContext {
  targetEmployeeId?: string;
  targetOrgUnitId?: string;
  targetProjectId?: string;
  now?: Date;
}

type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
type PrismaLike = PrismaClient | PrismaTransactionClient;

/**
 * Seeds canonical HR permission definitions into DB if not present.
 */
export async function seedHrPermissions(prisma: PrismaLike): Promise<void> {
  for (const perm of CANONICAL_HR_PERMISSIONS) {
    await prisma.hrPermissionDefinition.upsert({
      where: { code: perm.code },
      update: { name: perm.name, description: perm.description },
      create: {
        code: perm.code,
        name: perm.name,
        module: "HR",
        description: perm.description,
      },
    });
  }
}

/**
 * Resolves effective HR permission for a user.
 * DENY overrides ALLOW.
 * Expired / revoked grants are ignored.
 */
export async function resolveUserHrPermission(
  prisma: PrismaLike,
  userId: string,
  permissionCode: string,
  context: PermissionCheckContext = {}
): Promise<HrPermissionCheckResult> {
  const checkTime = context.now || new Date();

  // Check user role first
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, employee: { select: { id: true } } },
  });

  if (!user) {
    return {
      allowed: false,
      effect: GrantEffect.DENY,
      scope: HrDataScope.NONE,
      sensitiveFieldPolicy: SensitiveFieldPolicy.BASIC_ONLY,
      reason: "User not found",
    };
  }

  const permCodes =
    permissionCode === "hr:organization:manage" || permissionCode === "hr:org_unit:manage"
      ? ["hr:organization:manage", "hr:org_unit:manage"]
      : [permissionCode];

  // Query all active grants for user and permissionCode (including aliases)
  const grants = await prisma.userAccessGrant.findMany({
    where: {
      userId,
      permissionCode: { in: permCodes },
      revokedAt: null,
      OR: [{ validFrom: null }, { validFrom: { lte: checkTime } }],
      AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: checkTime } }] }],
    },
  });


  // Explicit DENY overrides everything
  const denyGrant = grants.find((g) => g.effect === GrantEffect.DENY);
  if (denyGrant) {
    return {
      allowed: false,
      effect: GrantEffect.DENY,
      scope: HrDataScope.NONE,
      sensitiveFieldPolicy: SensitiveFieldPolicy.BASIC_ONLY,
      reason: `Explicit DENY grant: ${denyGrant.reason}`,
    };
  }

  // Find ALLOW grants
  const allowGrants = grants.filter((g) => g.effect === GrantEffect.ALLOW);

  // ADMIN users are broad-scope by default; sensitive fields still require a grant.
  if (user.role === "ADMIN") {
    const policyPriority: Record<SensitiveFieldPolicy, number> = {
      FULL: 5,
      BANKING: 4,
      CONTRACT: 3,
      IDENTITY: 2,
      CONTACT: 1,
      BASIC_ONLY: 0,
    };
    const highestPolicy = allowGrants.reduce<SensitiveFieldPolicy>(
      (acc, g) => policyPriority[g.sensitiveFieldPolicy] > policyPriority[acc] ? g.sensitiveFieldPolicy : acc,
      SensitiveFieldPolicy.BASIC_ONLY
    );
    return {
      allowed: true,
      effect: GrantEffect.ALLOW,
      scope: HrDataScope.ALL_EMPLOYEES,
      sensitiveFieldPolicy: highestPolicy,
      reason: "ADMIN fallback role",
    };
  }

  if (allowGrants.length === 0) {
    return {
      allowed: false,
      effect: GrantEffect.DENY,
      scope: HrDataScope.NONE,
      sensitiveFieldPolicy: SensitiveFieldPolicy.BASIC_ONLY,
      reason: "No active ALLOW grant found",
    };
  }

  // Resolve scope and policy precedence
  // Priority for scope: ALL_EMPLOYEES > OWN_ORGANIZATION_UNIT > OWN_PROJECTS > SELF_ONLY > NONE
  const scopePriority: Record<HrDataScope, number> = {
    ALL_EMPLOYEES: 4,
    OWN_ORGANIZATION_UNIT: 3,
    OWN_PROJECTS: 2,
    SELF_ONLY: 1,
    NONE: 0,
  };

  let bestScope: HrDataScope = HrDataScope.NONE;
  let bestPolicy: SensitiveFieldPolicy = SensitiveFieldPolicy.BASIC_ONLY;

  const policyPriority: Record<SensitiveFieldPolicy, number> = {
    FULL: 5,
    BANKING: 4,
    CONTRACT: 3,
    IDENTITY: 2,
    CONTACT: 1,
    BASIC_ONLY: 0,
  };

  for (const g of allowGrants) {
    if (scopePriority[g.scope] > scopePriority[bestScope]) {
      bestScope = g.scope;
    }
    if (policyPriority[g.sensitiveFieldPolicy] > policyPriority[bestPolicy]) {
      bestPolicy = g.sensitiveFieldPolicy;
    }
  }

  return {
    allowed: true,
    effect: GrantEffect.ALLOW,
    scope: bestScope,
    sensitiveFieldPolicy: bestPolicy,
    reason: "Granted via active UserAccessGrant",
  };
}
