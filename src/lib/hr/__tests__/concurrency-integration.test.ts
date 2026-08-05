import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, EmployeeProjectAssignmentStatus, EmployeeProjectAssignmentEndReason } from "@prisma/client";
import { assertSafeQaDatabase } from "../../../../scripts/qa/assert-safe-qa-database";
import { createProjectAssignment, releaseEmployeeFromProject, transferProjectRoleOrAllocation } from "../project-assignment-service";
import { parseVietnamDateOnly } from "../vietnam-date-helper";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

describe("HR Phase 4.1 Integration & 2-Connection Concurrency Suite (Isolated QA DB)", () => {
  const qaDbUrl = process.env.QA_DATABASE_URL;
  let poolA: Pool;
  let poolB: Pool;
  let clientA: PrismaClient;
  let clientB: PrismaClient;
  const runId = `HR_PHASE_4_1_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  let testEmployeeId: string;
  let testProjectId1: string;
  let testProjectId2: string;
  let testRoleId1: string;
  let testRoleId2: string;

  beforeAll(async () => {
    if (!qaDbUrl) {
      throw new Error("QA_DATABASE_URL is required for integration testing");
    }
    assertSafeQaDatabase({ QA_DATABASE_URL: qaDbUrl, DATABASE_URL: process.env.DATABASE_URL });

    poolA = new Pool({ connectionString: qaDbUrl });
    clientA = new PrismaClient({ adapter: new PrismaPg(poolA) });

    poolB = new Pool({ connectionString: qaDbUrl });
    clientB = new PrismaClient({ adapter: new PrismaPg(poolB) });

    await clientA.$connect();
    await clientB.$connect();

    // Create fixture entities
    const emp = await clientA.employee.create({
      data: {
        code: `EMP_${runId}`,
        fullName: `Test Staff ${runId}`,
        status: "ACTIVE",
        joinedDate: new Date(),
      },
    });
    testEmployeeId = emp.id;

    const proj1 = await clientA.project.create({
      data: {
        code: `PROJ1_${runId}`,
        name: `Project 1 ${runId}`,
        status: "ACTIVE",
      },
    });
    testProjectId1 = proj1.id;

    const proj2 = await clientA.project.create({
      data: {
        code: `PROJ2_${runId}`,
        name: `Project 2 ${runId}`,
        status: "ACTIVE",
      },
    });
    testProjectId2 = proj2.id;

    const role1 = await clientA.projectPersonnelRole.create({
      data: {
        code: `ROLE1_${runId}`,
        name: `Role 1 ${runId}`,
      },
    });
    testRoleId1 = role1.id;

    const role2 = await clientA.projectPersonnelRole.create({
      data: {
        code: `ROLE2_${runId}`,
        name: `Role 2 ${runId}`,
      },
    });
    testRoleId2 = role2.id;
  });

  afterAll(async () => {
    // Cleanup all created test data
    if (clientA && testEmployeeId) {
      await clientA.employeeProjectAssignment.deleteMany({
        where: { employeeId: testEmployeeId },
      });
      await clientA.employeeChangeHistory.deleteMany({
        where: { employeeId: testEmployeeId },
      });
      if (testProjectId1 || testProjectId2) {
        await clientA.auditLog.deleteMany({
          where: { entityId: { in: [testEmployeeId, testProjectId1, testProjectId2].filter(Boolean) } },
        });
      }
      await clientA.employee.deleteMany({ where: { id: testEmployeeId } });
      await clientA.project.deleteMany({ where: { id: { in: [testProjectId1, testProjectId2].filter(Boolean) } } });
      await clientA.projectPersonnelRole.deleteMany({ where: { id: { in: [testRoleId1, testRoleId2].filter(Boolean) } } });

      // Zero-orphan verification check for runId
      const remAssignments = await clientA.employeeProjectAssignment.count({
        where: { employeeId: testEmployeeId },
      });
      const remEmployees = await clientA.employee.count({ where: { id: testEmployeeId } });
      const remProjects = await clientA.project.count({ where: { id: { in: [testProjectId1, testProjectId2].filter(Boolean) } } });

      expect(remAssignments).toBe(0);
      expect(remEmployees).toBe(0);
      expect(remProjects).toBe(0);
    }
    if (clientA) {
      await clientA.$disconnect();
      if (poolA) await poolA.end();
    }
    if (clientB) {
      await clientB.$disconnect();
      if (poolB) await poolB.end();
    }
  });

  it("1. 2-Connection Concurrency Test: Request A & B try to assign 60% simultaneously -> Exactly 1 succeeds, 1 blocked", async () => {
    // Attempt simultaneous 60% allocation from 2 separate DB clients
    const assignA = createProjectAssignment(clientA, {
      employeeId: testEmployeeId,
      projectId: testProjectId1,
      projectPersonnelRoleId: testRoleId1,
      startDate: parseVietnamDateOnly("2026-08-01"),
      allocationPercentage: 60,
    });

    const assignB = createProjectAssignment(clientB, {
      employeeId: testEmployeeId,
      projectId: testProjectId2,
      projectPersonnelRoleId: testRoleId2,
      startDate: parseVietnamDateOnly("2026-08-01"),
      allocationPercentage: 60,
    });

    const results = await Promise.allSettled([assignA, assignB]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Verify total allocation in DB is 60%, NOT 120%
    const activeAssignments = await clientA.employeeProjectAssignment.findMany({
      where: { employeeId: testEmployeeId, status: EmployeeProjectAssignmentStatus.ACTIVE },
    });
    expect(activeAssignments).toHaveLength(1);
    expect(activeAssignments[0].allocationPercentage).toBe(60);
  });

  it("2. Historical Mutation Role Transfer: ends old record at date D with endReason ROLE_TRANSFER and opens new record at date D", async () => {
    // Current assignment: testProjectId1
    const active = await clientA.employeeProjectAssignment.findFirst({
      where: { employeeId: testEmployeeId, status: EmployeeProjectAssignmentStatus.ACTIVE },
    });
    expect(active).not.toBeNull();

    const transferDate = parseVietnamDateOnly("2026-09-01");
    const newAssignment = await transferProjectRoleOrAllocation(clientA, {
      assignmentId: active!.id,
      effectiveDate: transferDate,
      newProjectPersonnelRoleId: testRoleId2,
      endReason: EmployeeProjectAssignmentEndReason.ROLE_TRANSFER,
    });

    // Check old assignment
    const oldAssign = await clientA.employeeProjectAssignment.findUnique({
      where: { id: active!.id },
    });
    expect(oldAssign?.status).toBe(EmployeeProjectAssignmentStatus.RELEASED);
    expect(oldAssign?.endReason).toBe(EmployeeProjectAssignmentEndReason.ROLE_TRANSFER);
    expect(oldAssign?.endDate).toEqual(transferDate);

    // Check new assignment
    expect(newAssignment.status).toBe(EmployeeProjectAssignmentStatus.ACTIVE);
    expect(newAssignment.startDate).toEqual(transferDate);
    expect(newAssignment.projectPersonnelRoleId).toBe(testRoleId2);
  });

  it("3. Early Release: updates status RELEASED with endReason EARLY_RELEASE", async () => {
    const active = await clientA.employeeProjectAssignment.findFirst({
      where: { employeeId: testEmployeeId, status: EmployeeProjectAssignmentStatus.ACTIVE },
    });
    expect(active).not.toBeNull();

    const releaseDate = parseVietnamDateOnly("2026-10-01");
    const released = await releaseEmployeeFromProject(clientA, {
      assignmentId: active!.id,
      endDate: releaseDate,
      endReason: EmployeeProjectAssignmentEndReason.EARLY_RELEASE,
      notes: "Completed early phase",
    });

    expect(released.status).toBe(EmployeeProjectAssignmentStatus.RELEASED);
    expect(released.endReason).toBe(EmployeeProjectAssignmentEndReason.EARLY_RELEASE);
    expect(released.endDate).toEqual(releaseDate);
  });
});
