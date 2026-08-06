import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.hr-qa.local", override: true });

export const FIXTURE_RUN_ID = "HR_PHASE_4_4_REPORTING_FIXTURE";

async function main() {
  const url = process.env.QA_DATABASE_URL || process.env.DATABASE_URL || "";
  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log(`=== SEEDING HR REPORTING FIXTURES (RunId: ${FIXTURE_RUN_ID}) ===`);

  // Fetch 5 active employees to attach rich assignment scenarios
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    take: 10,
  });

  const projects = await prisma.project.findMany({ take: 5 });
  const roles = await prisma.projectPersonnelRole.findMany({ take: 5 });

  if (employees.length < 5 || projects.length < 2 || roles.length < 2) {
    console.error("Not enough base employees/projects/roles in DB to seed fixtures!");
    return;
  }

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days later (inside 30d window)
  const farFuture = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days later (outside 30d window)

  // Ensure clean seed for runId
  await prisma.employeeProjectAssignment.deleteMany({
    where: { notes: { contains: FIXTURE_RUN_ID } },
  });

  // Scenario 1: Expiring in 15 days (triggers KPI_EXPIRING_ASSIGNMENTS_30D)
  await prisma.employeeProjectAssignment.create({
    data: {
      employeeId: employees[0].id,
      projectId: projects[0].id,
      projectPersonnelRoleId: roles[0].id,
      startDate: new Date("2026-01-01"),
      expectedEndDate: thirtyDaysLater,
      allocationPercentage: 50,
      status: "ACTIVE",
      notes: `${FIXTURE_RUN_ID}_EXPIRING_30D`,
    },
  });

  // Scenario 2: Overallocated (>100%) - Employee 1 has second assignment of 60% (50% + 60% = 110%)
  await prisma.employeeProjectAssignment.create({
    data: {
      employeeId: employees[0].id,
      projectId: projects[1].id,
      projectPersonnelRoleId: roles[1].id,
      startDate: new Date("2026-01-01"),
      expectedEndDate: farFuture,
      allocationPercentage: 60,
      status: "ACTIVE",
      notes: `${FIXTURE_RUN_ID}_OVERALLOCATED`,
    },
  });

  // Scenario 3: Employee with Available Capacity (<100%) - Employee 2 has 50% assignment
  await prisma.employeeProjectAssignment.create({
    data: {
      employeeId: employees[1].id,
      projectId: projects[0].id,
      projectPersonnelRoleId: roles[1].id,
      startDate: new Date("2026-01-01"),
      expectedEndDate: farFuture,
      allocationPercentage: 50,
      status: "ACTIVE",
      notes: `${FIXTURE_RUN_ID}_AVAILABLE_CAPACITY`,
    },
  });

  // Scenario 4: Employee 100% allocation - Employee 3 has 100% assignment
  await prisma.employeeProjectAssignment.create({
    data: {
      employeeId: employees[2].id,
      projectId: projects[1].id,
      projectPersonnelRoleId: roles[0].id,
      startDate: new Date("2026-01-01"),
      expectedEndDate: farFuture,
      allocationPercentage: 100,
      status: "ACTIVE",
      notes: `${FIXTURE_RUN_ID}_FULL_ALLOCATION`,
    },
  });

  // Scenario 5: Completed assignment
  await prisma.employeeProjectAssignment.create({
    data: {
      employeeId: employees[3].id,
      projectId: projects[0].id,
      projectPersonnelRoleId: roles[0].id,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
      allocationPercentage: 100,
      status: "COMPLETED",
      endReason: "COMPLETED",
      notes: `${FIXTURE_RUN_ID}_COMPLETED`,
    },
  });

  console.log("Fixtures created successfully!");

  await prisma.$disconnect();
  await pool.end();
}

if (require.main === module) {
  main().catch(console.error);
}
