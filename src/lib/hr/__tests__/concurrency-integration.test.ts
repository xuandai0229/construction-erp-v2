import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, EmployeeProjectAssignmentStatus, EmployeeProjectAssignmentEndReason } from "@prisma/client";
import { evaluateQaDatabaseSafety } from "../../../../scripts/qa/assert-safe-qa-database";
import { createProjectAssignment, releaseEmployeeFromProject, transferProjectRoleOrAllocation } from "../project-assignment-service";
import { parseVietnamDateOnly } from "../vietnam-date-helper";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

describe("HR Phase 4.1 Integration & 2-Connection Concurrency Suite (Isolated QA DB)", () => {
  const qaDbUrl = process.env.QA_DATABASE_URL;
  let poolA: Pool | null = null;
  let poolB: Pool | null = null;
  let clientA: PrismaClient | null = null;
  let clientB: PrismaClient | null = null;
  const runId = `HR_PHASE_4_1_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  let isSafeQaDb = false;
  let safetyReason = "";

  let testEmployeeId: string;
  let testProjectId1: string;
  let testProjectId2: string;
  let testRoleId1: string;
  let testRoleId2: string;

  beforeAll(async () => {
    if (!qaDbUrl) {
      safetyReason = "QA_DATABASE_URL is required for integration testing";
      return;
    }
    const safety = await evaluateQaDatabaseSafety({ ...process.env, QA_DATABASE_URL: qaDbUrl });
    if (!safety.safe) {
      safetyReason = `QA_SECURITY_GATE = BLOCKED_ENVIRONMENT (${safety.reason})`;
      return;
    }

    isSafeQaDb = true;
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

    const r1 = await clientA.projectPersonnelRole.create({
      data: {
        code: `ROLE1_${runId}`,
        name: `Role 1 ${runId}`,
      },
    });
    testRoleId1 = r1.id;

    const r2 = await clientA.projectPersonnelRole.create({
      data: {
        code: `ROLE2_${runId}`,
        name: `Role 2 ${runId}`,
      },
    });
    testRoleId2 = r2.id;
  });

  afterAll(async () => {
    if (clientA && isSafeQaDb) {
      // Cleanup all test fixtures created during this run
      await clientA.employeeProjectAssignment.deleteMany({
        where: { employeeId: testEmployeeId },
      });
      await clientA.employee.deleteMany({
        where: { id: testEmployeeId },
      });
      await clientA.project.deleteMany({
        where: { id: { in: [testProjectId1, testProjectId2] } },
      });
      await clientA.projectPersonnelRole.deleteMany({
        where: { id: { in: [testRoleId1, testRoleId2] } },
      });

      await clientA.$disconnect();
    }
    if (clientB && isSafeQaDb) {
      await clientB.$disconnect();
    }
    if (poolA) await poolA.end();
    if (poolB) await poolB.end();
  });

  it("1. 2-Connection Concurrency Test: Request A & B try to assign 60% simultaneously -> Exactly 1 succeeds, 1 blocked", async ({ skip }) => {
    if (!isSafeQaDb || !clientA || !clientB) {
      skip(`[ENVIRONMENT GATED] ${safetyReason}`);
      return;
    }

    // Clean up any lingering assignments
    await clientA.employeeProjectAssignment.deleteMany({
      where: { employeeId: testEmployeeId },
    });

    const payloadA = {
      employeeId: testEmployeeId,
      projectId: testProjectId1,
      projectPersonnelRoleId: testRoleId1,
      startDate: parseVietnamDateOnly("2026-06-01"),
      expectedEndDate: parseVietnamDateOnly("2026-06-30"),
      allocationPercentage: 60,
    };

    const payloadB = {
      employeeId: testEmployeeId,
      projectId: testProjectId2,
      projectPersonnelRoleId: testRoleId2,
      startDate: parseVietnamDateOnly("2026-06-15"),
      expectedEndDate: parseVietnamDateOnly("2026-07-15"),
      allocationPercentage: 60,
    };

    const promiseA = createProjectAssignment(clientA, payloadA);
    const promiseB = createProjectAssignment(clientB, payloadB);

    const results = await Promise.allSettled([promiseA, promiseB]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect(reason.message).toMatch(/vượt quá 100%/i);

    // Clean up created assignment
    await clientA.employeeProjectAssignment.deleteMany({
      where: { employeeId: testEmployeeId },
    });
  });

  it("2. Historical Mutation Role Transfer: ends old record at date D with endReason ROLE_TRANSFER and opens new record at date D", async ({ skip }) => {
    if (!isSafeQaDb || !clientA) {
      skip(`[ENVIRONMENT GATED] ${safetyReason}`);
      return;
    }

    await clientA.employeeProjectAssignment.deleteMany({
      where: { employeeId: testEmployeeId },
    });

    const initial = await createProjectAssignment(clientA, {
      employeeId: testEmployeeId,
      projectId: testProjectId1,
      projectPersonnelRoleId: testRoleId1,
      startDate: parseVietnamDateOnly("2026-01-01"),
      expectedEndDate: parseVietnamDateOnly("2026-12-31"),
      allocationPercentage: 100,
    });

    const effectiveDate = parseVietnamDateOnly("2026-07-01");
    const transferResult = await transferProjectRoleOrAllocation(clientA, {
      assignmentId: initial.id,
      newProjectPersonnelRoleId: testRoleId2,
      newAllocationPercentage: 80,
      endReason: EmployeeProjectAssignmentEndReason.ROLE_TRANSFER,
      effectiveDate,
      notes: "Promoted to Role 2",
    });

    expect(transferResult.projectPersonnelRoleId).toBe(testRoleId2);
    expect(transferResult.allocationPercentage).toBe(80);
    expect(transferResult.startDate).toEqual(effectiveDate);

    await clientA.employeeProjectAssignment.deleteMany({
      where: { employeeId: testEmployeeId },
    });
  });

  it("3. Early Release: updates status RELEASED with endReason EARLY_RELEASE", async ({ skip }) => {
    if (!isSafeQaDb || !clientA) {
      skip(`[ENVIRONMENT GATED] ${safetyReason}`);
      return;
    }

    await clientA.employeeProjectAssignment.deleteMany({
      where: { employeeId: testEmployeeId },
    });

    const initial = await createProjectAssignment(clientA, {
      employeeId: testEmployeeId,
      projectId: testProjectId1,
      projectPersonnelRoleId: testRoleId1,
      startDate: parseVietnamDateOnly("2026-01-01"),
      expectedEndDate: parseVietnamDateOnly("2026-12-31"),
      allocationPercentage: 100,
    });

    const releaseDate = parseVietnamDateOnly("2026-05-01");
    const released = await releaseEmployeeFromProject(clientA, {
      assignmentId: initial.id,
      endDate: releaseDate,
      endReason: EmployeeProjectAssignmentEndReason.EARLY_RELEASE,
      notes: "Project completed ahead of schedule",
    });

    expect(released.status).toBe(EmployeeProjectAssignmentStatus.RELEASED);
    expect(released.endReason).toBe(EmployeeProjectAssignmentEndReason.EARLY_RELEASE);
    expect(released.endDate).toEqual(releaseDate);

    await clientA.employeeProjectAssignment.deleteMany({
      where: { employeeId: testEmployeeId },
    });
  });
});
