import "dotenv/config";
if (process.env.QA_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.QA_DATABASE_URL;
}

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { authorizeProjectAssignmentAction } from "../project-assignment-auth";
import { seedHrPermissions } from "../permission-service";

describe("HR Phase 4.2 Security Guards & Authorization Resolver", () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;

  let adminUserId: string;
  let directorUserId: string;
  let deputyDirectorUserId: string;
  let managerUserId: string;
  let chiefCommanderUserId: string;
  let viewerUserId: string;

  let managedEmployeeId: string;
  let unmanagedEmployeeId: string;
  let activeProjectId: string;
  let closedProjectId: string;
  let activeProjectPersonnelRoleId: string;

  beforeAll(async () => {
    const connectionString = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
    pool = new Pool({ connectionString });
    adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });

    await seedHrPermissions(prisma);

    const timestamp = Date.now();

    // 1. Create position
    const position = await prisma.position.create({
      data: {
        code: `POS-AUTH-${timestamp}`,
        title: `Chuc Danh Auth ${timestamp}`,
      },
    });

    // 2. Create test users sequentially
    const admin = await prisma.user.create({
      data: {
        email: `admin_auth_${timestamp}@example.com`,
        username: `admin_auth_${timestamp}`,
        password: "dummy_password",
        name: "Admin User Auth",
        role: "ADMIN",
      },
    });

    const director = await prisma.user.create({
      data: {
        email: `director_auth_${timestamp}@example.com`,
        username: `director_auth_${timestamp}`,
        password: "dummy_password",
        name: "Director User Auth",
        role: "DIRECTOR",
      },
    });

    const deputy = await prisma.user.create({
      data: {
        email: `deputy_auth_${timestamp}@example.com`,
        username: `deputy_auth_${timestamp}`,
        password: "dummy_password",
        name: "Deputy Director Auth",
        role: "DEPUTY_DIRECTOR",
      },
    });

    const manager = await prisma.user.create({
      data: {
        email: `manager_auth_${timestamp}@example.com`,
        username: `manager_auth_${timestamp}`,
        password: "dummy_password",
        name: "Manager User Auth",
        role: "MANAGER",
      },
    });

    const chief = await prisma.user.create({
      data: {
        email: `chief_auth_${timestamp}@example.com`,
        username: `chief_auth_${timestamp}`,
        password: "dummy_password",
        name: "Chief Commander Auth",
        role: "CHIEF_COMMANDER",
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: `viewer_auth_${timestamp}@example.com`,
        username: `viewer_auth_${timestamp}`,
        password: "dummy_password",
        name: "Viewer User Auth",
        role: "STAFF",
      },
    });

    adminUserId = admin.id;
    directorUserId = director.id;
    deputyDirectorUserId = deputy.id;
    managerUserId = manager.id;
    chiefCommanderUserId = chief.id;
    viewerUserId = viewer.id;

    // Grant hr:project_assignment:create permission to managerUserId
    const createPermDef = await prisma.hrPermissionDefinition.findUnique({
      where: { code: "hr:project_assignment:create" },
    });
    if (createPermDef) {
      await prisma.userAccessGrant.create({
        data: {
          userId: managerUserId,
          permissionCode: createPermDef.code,
          effect: "ALLOW",
          scope: "OWN_ORGANIZATION_UNIT",
          grantedById: adminUserId,
          reason: "Phan quyen quan ly don vi trong test",
        },
      });
    }

    // 3. Create Org Unit & Manager Employee
    const orgUnit = await prisma.organizationUnit.create({
      data: {
        code: `OU-AUTH-${timestamp}`,
        name: `Phong Ban Auth ${timestamp}`,
      },
    });

    const managerEmp = await prisma.employee.create({
      data: {
        code: `NV-MGR-${timestamp}`,
        fullName: "Employee Manager Auth",
        joinedDate: new Date("2024-01-01"),
        status: "ACTIVE",
        userId: managerUserId,
      },
    });

    // Assign manager as manager of orgUnit
    await prisma.organizationUnitManagerAssignment.create({
      data: {
        organizationUnitId: orgUnit.id,
        employeeId: managerEmp.id,
        startDate: new Date("2024-01-01"),
      },
    });

    // Managed employee inside orgUnit
    const managedEmp = await prisma.employee.create({
      data: {
        code: `NV-IN-${timestamp}`,
        fullName: "Employee Managed",
        joinedDate: new Date("2024-01-01"),
        status: "ACTIVE",
      },
    });
    managedEmployeeId = managedEmp.id;

    await prisma.employeeOrganizationAssignment.create({
      data: {
        employeeId: managedEmp.id,
        organizationUnitId: orgUnit.id,
        positionId: position.id,
        startDate: new Date("2024-01-01"),
        isPrimary: true,
      },
    });

    // Unmanaged employee outside orgUnit
    const unmanagedEmp = await prisma.employee.create({
      data: {
        code: `NV-OUT-${timestamp}`,
        fullName: "Employee Unmanaged",
        joinedDate: new Date("2024-01-01"),
        status: "ACTIVE",
      },
    });
    unmanagedEmployeeId = unmanagedEmp.id;

    // 4. Projects: Active & Closed
    const activeProject = await prisma.project.create({
      data: {
        code: `PRJ-ACT-${timestamp}`,
        name: `Duan Active Auth ${timestamp}`,
        status: "ACTIVE",
      },
    });
    activeProjectId = activeProject.id;

    const closedProject = await prisma.project.create({
      data: {
        code: `PRJ-CLO-${timestamp}`,
        name: `Duan Closed Auth ${timestamp}`,
        status: "COMPLETED",
      },
    });
    closedProjectId = closedProject.id;

    // Role
    const role = await prisma.projectPersonnelRole.create({
      data: {
        code: `ROLE-AUTH-${timestamp}`,
        name: `Vai tro Auth ${timestamp}`,
      },
    });
    activeProjectPersonnelRoleId = role.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("grants ALL_EMPLOYEES and ALL_PROJECTS scope to ADMIN user", async () => {
    const res = await authorizeProjectAssignmentAction(prisma, {
      userId: adminUserId,
      permissionCode: "hr:project_assignment:create",
      action: "create",
    });

    expect(res.allowed).toBe(true);
    if (res.allowed) {
      expect(res.employeeScope).toBe("ALL_EMPLOYEES");
      expect(res.projectStaffingScope).toBe("ALL_PROJECTS");
    }
  });

  it("grants ALL_EMPLOYEES and ALL_PROJECTS scope to DIRECTOR user", async () => {
    const res = await authorizeProjectAssignmentAction(prisma, {
      userId: directorUserId,
      permissionCode: "hr:project_assignment:create",
      action: "create",
    });

    expect(res.allowed).toBe(true);
    if (res.allowed) {
      expect(res.employeeScope).toBe("ALL_EMPLOYEES");
      expect(res.projectStaffingScope).toBe("ALL_PROJECTS");
    }
  });

  it("denies allocation OVERRIDE for DEPUTY_DIRECTOR even with overrideReason provided", async () => {
    const res = await authorizeProjectAssignmentAction(prisma, {
      userId: deputyDirectorUserId,
      permissionCode: "hr:project_allocation:override",
      action: "override",
      overrideReason: "Dự án đặc thù cần gấp nhân sự vượt 100% định mức",
    });

    expect(res.allowed).toBe(false);
    if (!res.allowed) {
      expect(res.code).toBe("PERMISSION_DENIED");
      expect(res.error).toContain("Giám đốc hoặc Admin");
    }
  });

  it("allows allocation OVERRIDE for ADMIN and DIRECTOR with valid overrideReason (>= 10 chars)", async () => {
    const resAdmin = await authorizeProjectAssignmentAction(prisma, {
      userId: adminUserId,
      permissionCode: "hr:project_allocation:override",
      action: "override",
      overrideReason: "Lý do khẩn cấp điều động nhân sự dự án trọng điểm",
    });
    expect(resAdmin.allowed).toBe(true);

    const resDirector = await authorizeProjectAssignmentAction(prisma, {
      userId: directorUserId,
      permissionCode: "hr:project_allocation:override",
      action: "override",
      overrideReason: "Lý do khẩn cấp điều động nhân sự dự án trọng điểm",
    });
    expect(resDirector.allowed).toBe(true);
  });

  it("denies OVERRIDE if overrideReason is missing or too short (< 10 chars)", async () => {
    const res = await authorizeProjectAssignmentAction(prisma, {
      userId: adminUserId,
      permissionCode: "hr:project_allocation:override",
      action: "override",
      overrideReason: "Ngắn",
    });

    expect(res.allowed).toBe(false);
    if (!res.allowed) {
      expect(res.code).toBe("PERMISSION_DENIED");
      expect(res.error).toContain("ít nhất 10 ký tự");
    }
  });

  it("enforces OWN_ORGANIZATION_UNIT scope for MANAGER role and prevents IDOR on unmanaged employee", async () => {
    // Check target employee inside manager's unit -> ALLOW
    const resManaged = await authorizeProjectAssignmentAction(prisma, {
      userId: managerUserId,
      permissionCode: "hr:project_assignment:create",
      targetEmployeeId: managedEmployeeId,
      action: "create",
    });
    expect(resManaged.allowed).toBe(true);

    // Check target employee outside manager's unit -> DENY (EMPLOYEE_SCOPE_DENIED)
    const resUnmanaged = await authorizeProjectAssignmentAction(prisma, {
      userId: managerUserId,
      permissionCode: "hr:project_assignment:create",
      targetEmployeeId: unmanagedEmployeeId,
      action: "create",
    });
    expect(resUnmanaged.allowed).toBe(false);
    if (!resUnmanaged.allowed) {
      expect(resUnmanaged.code).toBe("EMPLOYEE_SCOPE_DENIED");
    }
  });

  it("strictly denies release and write actions for CHIEF_COMMANDER", async () => {
    const resRelease = await authorizeProjectAssignmentAction(prisma, {
      userId: chiefCommanderUserId,
      permissionCode: "hr:project_assignment:release",
      action: "release",
    });
    expect(resRelease.allowed).toBe(false);
    if (!resRelease.allowed) {
      expect(resRelease.code).toBe("PERMISSION_DENIED");
      expect(resRelease.error).toContain("Chỉ huy trưởng");
    }

    const resCreate = await authorizeProjectAssignmentAction(prisma, {
      userId: chiefCommanderUserId,
      permissionCode: "hr:project_assignment:create",
      action: "create",
    });
    expect(resCreate.allowed).toBe(false);
  });

  it("denies write actions for VIEWER role", async () => {
    const res = await authorizeProjectAssignmentAction(prisma, {
      userId: viewerUserId,
      permissionCode: "hr:project_assignment:create",
      action: "create",
    });
    expect(res.allowed).toBe(false);
    if (!res.allowed) {
      expect(res.code).toBe("PERMISSION_DENIED");
    }
  });

  it("denies mutation on CLOSED or COMPLETED project status", async () => {
    const res = await authorizeProjectAssignmentAction(prisma, {
      userId: adminUserId,
      permissionCode: "hr:project_assignment:create",
      targetProjectId: closedProjectId,
      action: "create",
    });

    expect(res.allowed).toBe(false);
    if (!res.allowed) {
      expect(res.code).toBe("INVALID_PROJECT_STATUS");
      expect(res.error).toContain("ACTIVE");
    }
  });
});
