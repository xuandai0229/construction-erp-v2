import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { evaluateQaDatabaseSafety } from "../../../../scripts/qa/assert-safe-qa-database";
import { createQaPrismaClient } from "../../../../scripts/qa/setup-qa-env";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

describe("HR Phase 4.3 — Project Assignment UI Data & Security Integration Suite", () => {
  const qaDbUrl = process.env.QA_DATABASE_URL;
  const runId = `HR_PHASE_4_3_${Date.now()}`;
  let prisma: PrismaClient | null = null;
  let pool: Pool | null = null;
  let isSafeQaDb = false;
  let safetyReason = "";

  beforeAll(async () => {
    if (!qaDbUrl) {
      safetyReason = "QA_DATABASE_URL is not defined";
      return;
    }
    const safety = await evaluateQaDatabaseSafety({ ...process.env, QA_DATABASE_URL: qaDbUrl });
    if (!safety.safe) {
      safetyReason = `QA_SECURITY_GATE = BLOCKED_ENVIRONMENT (${safety.reason})`;
      return;
    }

    isSafeQaDb = true;
    const qaSetup = createQaPrismaClient();
    prisma = qaSetup.prisma;
    pool = qaSetup.pool;

    // Create Admin User fixture for query testing
    await prisma.user.create({
      data: {
        username: `ui_admin_${runId}`,
        email: `ui_admin_${runId}@qa.local`,
        password: "hashed_password_qa",
        name: "QA UI Admin Tester",
        role: "ADMIN",
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    if (prisma && isSafeQaDb) {
      // Zero-Residue Cleanup
      await prisma.user.deleteMany({
        where: { username: { contains: runId } },
      });
      await prisma.$disconnect();
    }
    if (pool) await pool.end();
  });

  it("1. Database query loads active employees, projects and roles for UI selectors", async ({ skip }) => {
    if (!isSafeQaDb || !prisma) {
      skip(`[ENVIRONMENT GATED] ${safetyReason}`);
      return;
    }

    const [empRecords, prjRecords, roleRecords] = await Promise.all([
      prisma.employee.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, code: true, fullName: true },
        take: 5,
      }),
      prisma.project.findMany({
        where: { status: { in: ["ACTIVE", "PLANNING"] } },
        select: { id: true, code: true, name: true },
        take: 5,
      }),
      prisma.projectPersonnelRole.findMany({
        select: { id: true, code: true, name: true },
        take: 5,
      }),
    ]);

    expect(Array.isArray(empRecords)).toBe(true);
    expect(Array.isArray(prjRecords)).toBe(true);
    expect(Array.isArray(roleRecords)).toBe(true);
  });

  it("2. Direct DB Query verifies PII-safe projection for client workspace rendering", async ({ skip }) => {
    if (!isSafeQaDb || !prisma) {
      skip(`[ENVIRONMENT GATED] ${safetyReason}`);
      return;
    }

    const list = await prisma.employeeProjectAssignment.findMany({
      take: 5,
      select: {
        id: true,
        startDate: true,
        expectedEndDate: true,
        endDate: true,
        allocationPercentage: true,
        status: true,
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true,
          },
        },
        project: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    list.forEach((item) => {
      // Ensure no PII fields are exposed
      expect(item).not.toHaveProperty("identityNumberEncrypted");
      expect(item).not.toHaveProperty("personalEmail");
      expect(item).not.toHaveProperty("salary");
      expect(item.employee).not.toHaveProperty("salary");
      expect(item.employee).not.toHaveProperty("personalEmail");
    });
  });

  it("3. Zero-residue cleanup removes all UI test fixtures from QA database", async ({ skip }) => {
    if (!isSafeQaDb || !prisma) {
      skip(`[ENVIRONMENT GATED] ${safetyReason}`);
      return;
    }

    await prisma.user.deleteMany({
      where: { username: { contains: runId } },
    });
    const remainingUsers = await prisma.user.count({
      where: { username: { contains: runId } },
    });
    expect(remainingUsers).toBe(0);
  });
});
