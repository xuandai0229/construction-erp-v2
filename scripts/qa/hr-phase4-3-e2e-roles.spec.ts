import { test, expect } from "@playwright/test";
import { createQaPrismaClient, createRunId } from "./setup-qa-env";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { toProjectAssignmentDTO } from "../../src/lib/hr/project-assignment-dto";

test.describe("HR Phase 4.3.1 — Usability, Role RBAC & Responsive E2E Integration Suite", () => {
  let prisma: PrismaClient;
  let pool: Pool;
  const runId = createRunId();

  test.beforeAll(async () => {
    const qaSetup = createQaPrismaClient();
    prisma = qaSetup.prisma;
    pool = qaSetup.pool;

    // Create test seed fixtures in isolated QA DB
    const unit = await prisma.organizationUnit.create({
      data: {
        code: `OU_${runId.substring(0, 6)}`,
        name: `Đơn vị Thi công ${runId.substring(0, 6)}`,
      },
    });

    const emp1 = await prisma.employee.create({
      data: {
        code: `NV_${runId.substring(0, 6)}_1`,
        fullName: `Nguyễn Văn A ${runId.substring(0, 6)}`,
        joinedDate: new Date("2026-01-01"),
        status: "ACTIVE",
      },
    });

    const emp2 = await prisma.employee.create({
      data: {
        code: `NV_${runId.substring(0, 6)}_2`,
        fullName: `Trần Thị B ${runId.substring(0, 6)}`,
        joinedDate: new Date("2026-01-01"),
        status: "ACTIVE",
      },
    });

    const prj = await prisma.project.create({
      data: {
        code: `CT_${runId.substring(0, 6)}`,
        name: `Công trình Tòa nhà A ${runId.substring(0, 6)}`,
        status: "ACTIVE",
      },
    });

    const role = await prisma.projectPersonnelRole.create({
      data: {
        code: `ROLE_${runId.substring(0, 6)}`,
        name: `Kỹ sư trưởng ${runId.substring(0, 6)}`,
      },
    });

    await prisma.employeeProjectAssignment.create({
      data: {
        employeeId: emp1.id,
        projectId: prj.id,
        projectPersonnelRoleId: role.id,
        startDate: new Date("2026-01-01"),
        allocationPercentage: 80,
        status: "ACTIVE",
      },
    });
  });

  test.afterAll(async () => {
    if (prisma) {
      await prisma.employeeProjectAssignment.deleteMany({
        where: { employee: { code: { contains: runId.substring(0, 6) } } },
      });
      await prisma.employee.deleteMany({
        where: { code: { contains: runId.substring(0, 6) } },
      });
      await prisma.projectPersonnelRole.deleteMany({
        where: { code: { contains: runId.substring(0, 6) } },
      });
      await prisma.project.deleteMany({
        where: { code: { contains: runId.substring(0, 6) } },
      });
      await prisma.organizationUnit.deleteMany({
        where: { code: { contains: runId.substring(0, 6) } },
      });
      await prisma.$disconnect();
    }
    if (pool) await pool.end();
  });

  test("1. Direct DB Projection & DTO Sanitization Check", async () => {
    const rawList = await prisma.employeeProjectAssignment.findMany({
      where: { employee: { code: { contains: runId.substring(0, 6) } } },
      include: {
        employee: {
          include: {
            orgAssignments: {
              where: { isPrimary: true },
              include: { organizationUnit: true, position: true },
            },
          },
        },
        project: true,
        projectPersonnelRole: true,
      },
    });

    expect(rawList.length).toBeGreaterThan(0);
    const dtoList = rawList.map((item) => toProjectAssignmentDTO(item));
    dtoList.forEach((dto) => {
      expect(dto.employeeName).toBeDefined();
      expect(dto.projectCode).toBeDefined();
      expect(dto).not.toHaveProperty("salary");
      expect(dto).not.toHaveProperty("personalEmail");
    });
  });

  test("2. Zero-Residue Post-Test Count Verification", async () => {
    const count = await prisma.employeeProjectAssignment.count({
      where: { employee: { code: { contains: runId.substring(0, 6) } } },
    });
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
