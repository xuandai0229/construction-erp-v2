import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.hr-qa.local", override: true });

async function main() {
  const url = process.env.QA_DATABASE_URL || process.env.DATABASE_URL || "";
  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("=== RAW SQL KPI VERIFICATION ===");
  const targetDateStr = "2026-08-06";
  const targetDate = new Date(targetDateStr);

  // 1. Raw SQL: Total On Site
  const rawOnSite: any[] = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT "employeeId") as count
    FROM "EmployeeProjectAssignment"
    WHERE "status" = 'ACTIVE'
      AND "startDate" <= ${targetDate}
      AND ("endDate" IS NULL OR "endDate" > ${targetDate})
  `;
  const countOnSite = Number(rawOnSite[0]?.count || 0);

  // 2. Raw SQL: Active Projects Staffed
  const rawProjects: any[] = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT "projectId") as count
    FROM "EmployeeProjectAssignment"
    WHERE "status" = 'ACTIVE'
      AND "startDate" <= ${targetDate}
      AND ("endDate" IS NULL OR "endDate" > ${targetDate})
  `;
  const countProjects = Number(rawProjects[0]?.count || 0);

  // 3. Raw SQL: Expiring in 30 days
  const thirtyDaysLater = new Date(targetDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const rawExpiring: any[] = await prisma.$queryRaw`
    SELECT COUNT(id) as count
    FROM "EmployeeProjectAssignment"
    WHERE "status" = 'ACTIVE'
      AND "startDate" <= ${targetDate}
      AND ("endDate" IS NULL OR "endDate" > ${targetDate})
      AND "expectedEndDate" >= ${targetDate}
      AND "expectedEndDate" <= ${thirtyDaysLater}
  `;
  const countExpiring = Number(rawExpiring[0]?.count || 0);

  // 4. Raw SQL: Unassigned Employees
  const rawUnassigned: any[] = await prisma.$queryRaw`
    SELECT COUNT(e.id) as count
    FROM "Employee" e
    WHERE e.status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM "EmployeeProjectAssignment" pa
        WHERE pa."employeeId" = e.id
          AND pa.status = 'ACTIVE'
          AND pa."startDate" <= ${targetDate}
          AND (pa."endDate" IS NULL OR pa."endDate" > ${targetDate})
      )
  `;
  const countUnassigned = Number(rawUnassigned[0]?.count || 0);

  // 5. Raw SQL: Employees with Available Capacity (<100%) & Overallocated (>100%)
  const rawAllocations: any[] = await prisma.$queryRaw`
    SELECT pa."employeeId", SUM(pa."allocationPercentage") as total_alloc
    FROM "EmployeeProjectAssignment" pa
    JOIN "Employee" e ON e.id = pa."employeeId"
    WHERE pa.status = 'ACTIVE'
      AND e.status = 'ACTIVE'
      AND pa."startDate" <= ${targetDate}
      AND (pa."endDate" IS NULL OR pa."endDate" > ${targetDate})
    GROUP BY pa."employeeId"
  `;

  let countAvailable = 0;
  let countOverallocated = 0;
  rawAllocations.forEach((r) => {
    const total = Number(r.total_alloc);
    if (total < 100) countAvailable++;
    if (total > 100) countOverallocated++;
  });

  console.log(`1. Raw SQL KPI_TOTAL_ON_SITE: ${countOnSite}`);
  console.log(`2. Raw SQL KPI_ACTIVE_PROJECTS_STAFFED: ${countProjects}`);
  console.log(`3. Raw SQL KPI_EXPIRING_ASSIGNMENTS_30D: ${countExpiring}`);
  console.log(`4. Raw SQL KPI_UNASSIGNED_EMPLOYEES: ${countUnassigned}`);
  console.log(`5. Raw SQL KPI_EMPLOYEES_WITH_AVAILABLE_CAPACITY: ${countAvailable}`);
  console.log(`6. Raw SQL KPI_OVERALLOCATED_EMPLOYEES: ${countOverallocated}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
