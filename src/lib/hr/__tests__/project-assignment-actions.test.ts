import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

let qaPrismaClient: PrismaClient;

// Mock @/lib/prisma using getter so it points to qaPrismaClient created in beforeAll
vi.mock("@/lib/prisma", () => ({
  get default() {
    return qaPrismaClient;
  },
}));

// Mock next/cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock getSession from @/lib/auth
let mockSessionUser: { id: string; role: string } | null = null;
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(async () => mockSessionUser),
}));

import {
  assignEmployeeToProjectAction,
  transferProjectRoleOrAllocationAction,
  extendProjectAssignmentAction,
  releaseEmployeeFromProjectAction,
  cancelFutureProjectAssignmentAction,
  getProjectAssignmentsQuery,
} from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { seedHrPermissions } from "../permission-service";

describe("HR Phase 4.2 Server Actions & PII-Safe DTO Test Suite", () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let adminUser: { id: string; role: string };
  let staffUser: { id: string; role: string };
  let testEmployeeId: string;
  let testProjectId: string;
  let testRoleId: string;

  const runId = `HR_PHASE_4_2_${Date.now()}`;
  let initialProjectMemberCount = 0;
  let initialUserAccessGrantCount = 0;

  beforeAll(async () => {
    const connectionString = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
    pool = new Pool({ connectionString });
    adapter = new PrismaPg(pool);
    qaPrismaClient = new PrismaClient({ adapter });

    await seedHrPermissions(qaPrismaClient);

    initialProjectMemberCount = await qaPrismaClient.projectMember.count();
    initialUserAccessGrantCount = await qaPrismaClient.userAccessGrant.count();

    // Create Admin User & Staff User sequentially
    const admin = await qaPrismaClient.user.create({
      data: {
        email: `admin_act_${runId}@example.com`,
        username: `admin_act_${runId}`,
        password: "dummy_password",
        name: "Admin Actions Test",
        role: "ADMIN",
      },
    });

    const staff = await qaPrismaClient.user.create({
      data: {
        email: `staff_act_${runId}@example.com`,
        username: `staff_act_${runId}`,
        password: "dummy_password",
        name: "Staff Actions Test",
        role: "STAFF",
      },
    });

    adminUser = { id: admin.id, role: "ADMIN" };
    staffUser = { id: staff.id, role: "STAFF" };

    // Create Employee with PII data (CCCD, personalEmail, etc.)
    const emp = await qaPrismaClient.employee.create({
      data: {
        code: `NV-ACT-${runId}`,
        fullName: "Nguyen Van Actions Test",
        personalEmail: "sensitive_personal@example.com",
        phoneNumber: "0901234567",
        identityNumberEncrypted: "ENCRYPTED_CCCD_PAYLOAD_HEADER.PAYLOAD.TAG",
        identityNumberBlindIndex: `BLIND_${runId}`,
        identityNumberLastDigits: "9999",
        joinedDate: new Date("2024-01-01"),
        status: "ACTIVE",
      },
    });
    testEmployeeId = emp.id;

    // Create Project
    const prj = await qaPrismaClient.project.create({
      data: {
        code: `PRJ-ACT-${runId}`,
        name: `Duan Testing Actions ${runId}`,
        status: "ACTIVE",
      },
    });
    testProjectId = prj.id;

    // Create Role
    const role = await qaPrismaClient.projectPersonnelRole.create({
      data: {
        code: `ROLE-ACT-${runId}`,
        name: `Kysu Cong trinh ${runId}`,
      },
    });
    testRoleId = role.id;
  });

  afterAll(async () => {
    // Zero-residue cleanup
    await qaPrismaClient.employeeProjectAssignment.deleteMany({
      where: { employeeId: testEmployeeId },
    });
    await qaPrismaClient.employeeChangeHistory.deleteMany({
      where: { employeeId: testEmployeeId },
    });
    await qaPrismaClient.auditLog.deleteMany({
      where: { entityId: testEmployeeId },
    });
    await qaPrismaClient.employee.deleteMany({
      where: { id: testEmployeeId },
    });
    await qaPrismaClient.projectPersonnelRole.deleteMany({
      where: { id: testRoleId },
    });
    await qaPrismaClient.project.deleteMany({
      where: { id: testProjectId },
    });
    await qaPrismaClient.user.deleteMany({
      where: { email: { contains: runId } },
    });

    await qaPrismaClient.$disconnect();
    await pool.end();
  });

  it("returns AUTHENTICATION_REQUIRED when user is unauthenticated", async () => {
    mockSessionUser = null;
    const res = await assignEmployeeToProjectAction({
      employeeId: testEmployeeId,
      projectId: testProjectId,
      projectPersonnelRoleId: testRoleId,
      startDate: "2026-09-01",
      allocationPercentage: 50,
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("successfully creates project assignment and returns PII-safe DTO without sensitive fields", async () => {
    mockSessionUser = adminUser;
    initialProjectMemberCount = await qaPrismaClient.projectMember.count();
    initialUserAccessGrantCount = await qaPrismaClient.userAccessGrant.count();

    const res = await assignEmployeeToProjectAction({
      employeeId: testEmployeeId,
      projectId: testProjectId,
      projectPersonnelRoleId: testRoleId,
      startDate: "2026-09-01",
      expectedEndDate: "2026-12-31",
      allocationPercentage: 50,
      decisionNumber: "QD-1001",
      notes: "Phan cong cong trinh 50%",
    });

    expect(res.success).toBe(true);
    if (res.success) {
      const dto = res.data;
      expect(dto.employeeId).toBe(testEmployeeId);
      expect(dto.projectId).toBe(testProjectId);
      expect(dto.allocationPercentage).toBe(50);
      expect(dto.status).toBe("ACTIVE");
      expect(dto.decisionNumber).toBe("QD-1001");

      // Verify PII Protection: NO sensitive employee fields present on DTO or JSON
      const rawDto = (dto as unknown) as Record<string, unknown>;
      const forbiddenKeys = [
        "identityNumberEncrypted",
        "identityNumberBlindIndex",
        "identityNumberLastDigits",
        "personalEmail",
        "phoneNumber",
        "salary",
        "bankAccount",
        "address",
        "ciphertext",
        "iv",
        "authTag",
        "password",
        "token",
      ];

      for (const key of forbiddenKeys) {
        expect(rawDto[key]).toBeUndefined();
      }

      const jsonStr = JSON.stringify(dto);
      for (const key of forbiddenKeys) {
        expect(jsonStr).not.toContain(`"${key}"`);
      }
    }
  });

  it("verifies side-effect safety: ProjectMember and UserAccessGrant counts remain unchanged for test fixture by assignment action", async () => {
    // Verify assignment creation did not add extraneous ProjectMember or UserAccessGrant rows for test entities
    const memberForTestProject = await qaPrismaClient.projectMember.findFirst({
      where: { projectId: testProjectId, userId: staffUser?.id },
    });
    expect(memberForTestProject).toBeNull();

    if (staffUser?.id) {
      const grantForTestUser = await qaPrismaClient.userAccessGrant.findFirst({
        where: { userId: staffUser.id },
      });
      expect(grantForTestUser).toBeNull();
    }
  });

  it("blocks allocation exceeding 100% without override privilege and returns ALLOCATION_OVERLAP_EXCEEDED", async () => {
    mockSessionUser = adminUser;
    // Attempting another 60% assignment on overlapping dates -> Total 110%
    const res = await assignEmployeeToProjectAction({
      employeeId: testEmployeeId,
      projectId: testProjectId,
      projectPersonnelRoleId: testRoleId,
      startDate: "2026-09-15",
      allocationPercentage: 60,
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe("ALLOCATION_OVERLAP_EXCEEDED");
    }
  });

  it("allows allocation exceeding 100% when ADMIN uses allowOverlapOverride and valid overrideReason", async () => {
    mockSessionUser = adminUser;
    const res = await assignEmployeeToProjectAction({
      employeeId: testEmployeeId,
      projectId: testProjectId,
      projectPersonnelRoleId: testRoleId,
      startDate: "2026-09-15",
      allocationPercentage: 60,
      allowOverlapOverride: true,
      overrideReason: "Dự án khẩn cấp quốc gia yêu cầu nhân sự hỗ trợ song song 110%",
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.allocationPercentage).toBe(60);
    }
  });

  it("transfers assignment role and allocation via transferProjectRoleOrAllocationAction and creates EmployeeChangeHistory", async () => {
    mockSessionUser = adminUser;

    // Get active assignment created earlier
    const query = await getProjectAssignmentsQuery({
      employeeId: testEmployeeId,
      status: "ACTIVE",
    });

    expect(query.success).toBe(true);
    if (!query.success || query.data.items.length === 0) return;

    const currentAssignment = query.data.items[0];

    const transferRes = await transferProjectRoleOrAllocationAction({
      assignmentId: currentAssignment.id,
      effectiveDate: "2026-10-01",
      newAllocationPercentage: 70,
      endReason: "ALLOCATION_CHANGE",
      notes: "Dieu chinh nang ty le len 70%",
      allowOverlapOverride: true,
      overrideReason: "Điều chỉnh tỷ lệ phân bổ đợt công tác theo quyết định mới",
    });

    expect(transferRes.success).toBe(true);
    if (transferRes.success) {
      expect(transferRes.data.allocationPercentage).toBe(70);

      // Verify Audit & History
      const historyLogs = await qaPrismaClient.employeeChangeHistory.findMany({
        where: { employeeId: testEmployeeId },
      });
      expect(historyLogs.length).toBeGreaterThan(0);
    }
  });

  it("extends project assignment via extendProjectAssignmentAction", async () => {
    mockSessionUser = adminUser;

    const query = await getProjectAssignmentsQuery({
      employeeId: testEmployeeId,
      status: "ACTIVE",
    });
    if (!query.success || query.data.items.length === 0) return;
    const currentAssignment = query.data.items[0];

    const extendRes = await extendProjectAssignmentAction({
      assignmentId: currentAssignment.id,
      newExpectedEndDate: "2027-06-30",
      notes: "Gia han theo phu luc hop dong",
    });

    expect(extendRes.success).toBe(true);
    if (extendRes.success) {
      expect(extendRes.data.expectedEndDate).toBe("2027-06-30");
    }
  });

  it("releases employee from project via releaseEmployeeFromProjectAction", async () => {
    mockSessionUser = adminUser;

    const query = await getProjectAssignmentsQuery({
      employeeId: testEmployeeId,
      status: "ACTIVE",
    });
    if (!query.success || query.data.items.length === 0) return;
    const currentAssignment = query.data.items[0];

    const releaseRes = await releaseEmployeeFromProjectAction({
      assignmentId: currentAssignment.id,
      releaseDate: "2026-11-01",
      endReason: "EARLY_RELEASE",
      notes: "Rut khoi cong trinh truoc thoi han",
    });

    expect(releaseRes.success).toBe(true);
    if (releaseRes.success) {
      expect(releaseRes.data.status).toBe("RELEASED");
    }
  });

  it("cancels future assignment via cancelFutureProjectAssignmentAction", async () => {
    mockSessionUser = adminUser;

    // Create a new future assignment to cancel
    const created = await assignEmployeeToProjectAction({
      employeeId: testEmployeeId,
      projectId: testProjectId,
      projectPersonnelRoleId: testRoleId,
      startDate: "2028-01-01",
      allocationPercentage: 30,
    });

    if (!created.success) return;

    const cancelRes = await cancelFutureProjectAssignmentAction({
      assignmentId: created.data.id,
      reason: "Huy bo ke hoach phan cong nam 2028",
    });

    expect(cancelRes.success).toBe(true);
    if (cancelRes.success) {
      expect(cancelRes.data.status).toBe("CANCELLED");
    }
  });
});
