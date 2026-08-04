import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, EmployeeProjectAssignmentStatus } from "@prisma/client";
import {
  assignEmployeeToProject,
  releaseEmployeeFromProject,
} from "../project-assignment-service";

describe("Project Personnel Assignment Service", () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;

  beforeAll(() => {
    const connectionString = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
    pool = new Pool({ connectionString });
    adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("handles assignment and release workflow correctly", async () => {
    // Create dummy project, role, employee
    const project = await prisma.project.create({
      data: {
        code: "PRJ_HR_TEST_01",
        name: "Dự án Thí nghiệm HR",
      },
    });

    const role = await prisma.projectPersonnelRole.create({
      data: {
        code: "ROLE_CHT",
        name: "Chỉ huy trưởng",
      },
    });

    const emp = await prisma.employee.create({
      data: {
        code: "NV-TEST-0002",
        fullName: "Trần Văn B",
        joinedDate: new Date("2026-01-01"),
      },
    });

    // Initial assignment
    const assignment = await assignEmployeeToProject(prisma, {
      employeeId: emp.id,
      projectId: project.id,
      projectPersonnelRoleId: role.id,
      startDate: new Date("2026-02-01"),
      allocationPercentage: 100,
    });

    expect(assignment.status).toBe(EmployeeProjectAssignmentStatus.ACTIVE);
    expect(assignment.allocationPercentage).toBe(100);

    // Duplicate assignment without overrideReason should fail
    await expect(
      assignEmployeeToProject(prisma, {
        employeeId: emp.id,
        projectId: project.id,
        projectPersonnelRoleId: role.id,
        startDate: new Date("2026-03-01"),
      })
    ).rejects.toThrow("already has an active assignment with this role");

    // Release employee
    const released = await releaseEmployeeFromProject(
      prisma,
      assignment.id,
      new Date("2026-07-01"),
      "Dự án hoàn thành"
    );

    expect(released.status).toBe(EmployeeProjectAssignmentStatus.RELEASED);
    expect(released.endDate).toEqual(new Date("2026-07-01"));

    // Cleanup
    await prisma.employeeProjectAssignment.deleteMany({ where: { employeeId: emp.id } });
    await prisma.employee.delete({ where: { id: emp.id } });
    await prisma.projectPersonnelRole.delete({ where: { id: role.id } });
    await prisma.project.delete({ where: { id: project.id } });
  });
});
