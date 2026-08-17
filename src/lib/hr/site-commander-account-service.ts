import * as bcrypt from "bcryptjs";
import { EmployeeStatus, PrismaClient, ProjectRole, UserRole } from "@prisma/client";
import { executeWithAdvisoryLock } from "./concurrency-lock-helper";
import { generateTemporaryPassword } from "@/lib/auth/password-policy";

const ACTIVE_EMPLOYEE_STATUSES: EmployeeStatus[] = [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION];
const COMMANDER_MEMBER_ROLES: ProjectRole[] = [ProjectRole.SITE_COMMANDER, ProjectRole.CHIEF_COMMANDER];

export type SiteCommanderProvisioningCode =
  | "CREATED"
  | "EXISTING_RECONCILED"
  | "EMPLOYEE_NOT_FOUND"
  | "EMPLOYEE_NOT_ACTIVE"
  | "ASSIGNMENT_NOT_FOUND"
  | "DUPLICATE_ASSIGNMENT"
  | "DUPLICATE_EMPLOYEE_NAME"
  | "ACCOUNT_REQUIRES_INFORMATION"
  | "USER_EXISTS_UNLINKED"
  | "POSSIBLE_DUPLICATE_USER"
  | "LOGIN_IDENTIFIER_CONFLICT"
  | "EXISTING_USER_ROLE_CONFLICT"
  | "EXISTING_USER_INACTIVE"
  | "PROJECT_COMMANDER_CONFLICT"
  | "PROJECT_MEMBERSHIP_CONFLICT";

export class SiteCommanderProvisioningError extends Error {
  constructor(public readonly code: SiteCommanderProvisioningCode, message: string) {
    super(message);
    this.name = "SiteCommanderProvisioningError";
  }
}

export type SiteCommanderProvisioningResult = {
  code: "CREATED" | "EXISTING_RECONCILED";
  employeeId: string;
  employeeName: string;
  userId: string;
  email: string | null;
  username: string | null;
  projectIds: string[];
  projectNames: string[];
  membershipsCreated: number;
  temporaryPassword?: string;
};

export function normalizePersonName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi");
}

function usernameFromEmployeeCode(code: string): string {
  return code.trim().toLocaleUpperCase("en-US");
}

export async function provisionSiteCommanderAccount(input: {
  prisma: PrismaClient;
  employeeId: string;
  actorUserId: string;
}): Promise<SiteCommanderProvisioningResult> {
  return executeWithAdvisoryLock(input.prisma, input.employeeId, async (tx) => {
    const now = new Date();
    const employee = await tx.employee.findUnique({
      where: { id: input.employeeId },
      include: {
        user: true,
        projectAssignments: {
          where: {
            status: "ACTIVE",
            OR: [{ endDate: null }, { endDate: { gte: now } }],
            projectPersonnelRole: { code: "CHT", isActive: true },
          },
          include: {
            project: { select: { id: true, code: true, name: true } },
            projectPersonnelRole: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!employee) throw new SiteCommanderProvisioningError("EMPLOYEE_NOT_FOUND", "Không tìm thấy hồ sơ nhân sự.");
    if (!ACTIVE_EMPLOYEE_STATUSES.includes(employee.status)) {
      throw new SiteCommanderProvisioningError("EMPLOYEE_NOT_ACTIVE", "Nhân sự không ở trạng thái đang làm việc hoặc thử việc.");
    }
    if (employee.projectAssignments.length === 0) {
      throw new SiteCommanderProvisioningError(
        "ASSIGNMENT_NOT_FOUND",
        "Nhân sự chưa có phân công Chỉ huy trưởng đang hiệu lực trong database.",
      );
    }

    const projectIds = employee.projectAssignments.map((assignment) => assignment.projectId);
    if (new Set(projectIds).size !== projectIds.length) {
      throw new SiteCommanderProvisioningError("DUPLICATE_ASSIGNMENT", "Phát hiện phân công Chỉ huy trưởng trùng trên cùng công trình.");
    }

    const canonicalName = normalizePersonName(employee.fullName);
    const employees = await tx.employee.findMany({ select: { id: true, fullName: true } });
    if (employees.some((candidate) => candidate.id !== employee.id && normalizePersonName(candidate.fullName) === canonicalName)) {
      throw new SiteCommanderProvisioningError(
        "DUPLICATE_EMPLOYEE_NAME",
        "Có nhiều hồ sơ Employee cùng tên sau khi chuẩn hóa. Cần đối chiếu thủ công.",
      );
    }
    const usersByName = await tx.user.findMany({ select: { id: true, name: true } });
    if (usersByName.some((candidate) => candidate.id !== employee.userId && normalizePersonName(candidate.name) === canonicalName)) {
      throw new SiteCommanderProvisioningError(
        "POSSIBLE_DUPLICATE_USER",
        "Có User khác trùng tên sau khi chuẩn hóa. Cần đối chiếu thủ công trước khi cấp quyền.",
      );
    }

    const existingMembers = await tx.projectMember.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true, projectId: true, userId: true, role: true, isActive: true, deletedAt: true, leftAt: true },
    });
    const activeOtherCommander = existingMembers.find(
      (member) =>
        member.userId !== employee.userId &&
        member.isActive &&
        !member.deletedAt &&
        !member.leftAt &&
        COMMANDER_MEMBER_ROLES.includes(member.role),
    );
    if (activeOtherCommander) {
      throw new SiteCommanderProvisioningError(
        "PROJECT_COMMANDER_CONFLICT",
        `Công trình ${activeOtherCommander.projectId} đã có một Chỉ huy trưởng khác đang hiệu lực.`,
      );
    }

    let user = employee.user;
    let temporaryPassword: string | undefined;
    if (user) {
      if (!user.isActive || user.deletedAt) {
        throw new SiteCommanderProvisioningError("EXISTING_USER_INACTIVE", "Tài khoản đã liên kết đang bị khóa hoặc ngừng hoạt động.");
      }
      if (user.role !== UserRole.CHIEF_COMMANDER) {
        throw new SiteCommanderProvisioningError(
          "EXISTING_USER_ROLE_CONFLICT",
          `Tài khoản đã liên kết có role ${user.role}; hệ thống không tự ý thay đổi role.`,
        );
      }
    } else {
      const email = employee.personalEmail?.trim().toLocaleLowerCase("en-US") || null;
      const username = usernameFromEmployeeCode(employee.code);
      const identifierConflict = await tx.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
            { username: { equals: username, mode: "insensitive" } },
            ...(employee.phoneNumber ? [{ phone: employee.phoneNumber }] : []),
          ],
        },
        select: { id: true, email: true, username: true, name: true },
      });
      if (identifierConflict) {
        throw new SiteCommanderProvisioningError(
          "USER_EXISTS_UNLINKED",
          "Đã có User dùng email, mã nhân viên hoặc số điện thoại này nhưng chưa liên kết Employee.",
        );
      }
      temporaryPassword = generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      user = await tx.user.create({
        data: {
          email,
          username,
          password: passwordHash,
          name: employee.fullName,
          phone: employee.phoneNumber,
          role: UserRole.CHIEF_COMMANDER,
          isActive: true,
          mustChangePassword: true,
          passwordChangedAt: null,
        },
      });
      await tx.employee.update({ where: { id: employee.id }, data: { userId: user.id, updatedById: input.actorUserId } });
    }

    const conflictingOwnMember = existingMembers.find(
      (member) =>
        member.userId === user.id &&
        (!member.isActive || Boolean(member.deletedAt) || Boolean(member.leftAt) || member.role !== ProjectRole.CHIEF_COMMANDER),
    );
    if (conflictingOwnMember) {
      throw new SiteCommanderProvisioningError(
        "PROJECT_MEMBERSHIP_CONFLICT",
        `Membership hiện có tại công trình ${conflictingOwnMember.projectId} không phải CHIEF_COMMANDER đang hiệu lực.`,
      );
    }

    const existingProjectIds = new Set(existingMembers.filter((member) => member.userId === user.id).map((member) => member.projectId));
    const missingProjectIds = projectIds.filter((projectId) => !existingProjectIds.has(projectId));
    if (missingProjectIds.length > 0) {
      await tx.projectMember.createMany({
        data: missingProjectIds.map((projectId) => ({
          projectId,
          userId: user.id,
          role: ProjectRole.CHIEF_COMMANDER,
          assignedById: input.actorUserId,
          note: "Tạo từ phân công EmployeeProjectAssignment role CHT đã được xác minh.",
        })),
      });
    }

    const resultCode = temporaryPassword ? "CREATED" : "EXISTING_RECONCILED";
    await tx.employeeChangeHistory.create({
      data: {
        employeeId: employee.id,
        changeType: "ACCESS_GRANTED",
        performedById: input.actorUserId,
        reason: "Cấp quyền tài khoản Chỉ huy trưởng từ phân công công trình hiện hữu",
        details: {
          resultCode,
          userId: user.id,
          projectIds,
          membershipsCreated: missingProjectIds.length,
          mustChangePassword: user.mustChangePassword,
        },
      },
    });
    await tx.auditLog.create({
      data: {
        userId: input.actorUserId,
        action: "SITE_COMMANDER_ACCOUNT_PROVISIONED",
        entityType: "Employee",
        entityId: employee.id,
        afterData: JSON.stringify({
          resultCode,
          linkedUserId: user.id,
          role: user.role,
          projectIds,
          membershipsCreated: missingProjectIds.length,
          mustChangePassword: user.mustChangePassword,
        }),
      },
    });

    return {
      code: resultCode,
      employeeId: employee.id,
      employeeName: employee.fullName,
      userId: user.id,
      email: user.email,
      username: user.username,
      projectIds,
      projectNames: employee.projectAssignments.map((assignment) => assignment.project.name),
      membershipsCreated: missingProjectIds.length,
      ...(temporaryPassword ? { temporaryPassword } : {}),
    };
  });
}
