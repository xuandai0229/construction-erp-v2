import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function inspectDb(url: string, label: string) {
  let maskedHost = "127.0.0.1";
  let maskedPort = "5432";
  let maskedDb = "unknown";

  try {
    const urlObj = new URL(url.replace(/^postgresql:\/\//, "http://"));
    maskedHost = urlObj.hostname;
    maskedPort = urlObj.port || "5432";
    maskedDb = urlObj.pathname.replace(/^\//, "");
  } catch (e) {}

  console.log(`\n========================================`);
  console.log(`=== DATABASE FINGERPRINT: ${label} ===`);
  console.log(`Host: ${maskedHost}`);
  console.log(`Port: ${maskedPort}`);
  console.log(`Database: ${maskedDb}`);
  console.log(`========================================`);

  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const [
      employeeCount,
      activeEmployees,
      orgUnitCount,
      positionCount,
      projectCount,
      projectRoleCount,
      assignmentCount,
      activeAssignments,
      historyCount,
      projectMemberCount,
      grantCount,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.organizationUnit.count(),
      prisma.position.count(),
      prisma.project.count(),
      prisma.projectPersonnelRole.count(),
      prisma.employeeProjectAssignment.count(),
      prisma.employeeProjectAssignment.count({ where: { status: "ACTIVE" } }),
      prisma.employeeChangeHistory.count(),
      prisma.projectMember.count(),
      prisma.userAccessGrant.count(),
    ]);

    console.log(`Employee: Total=${employeeCount}, Active=${activeEmployees}`);
    console.log(`OrganizationUnit: Total=${orgUnitCount}`);
    console.log(`Position: Total=${positionCount}`);
    console.log(`Project: Total=${projectCount}`);
    console.log(`ProjectPersonnelRole: Total=${projectRoleCount}`);
    console.log(`EmployeeProjectAssignment: Total=${assignmentCount}, Active=${activeAssignments}`);
    console.log(`EmployeeChangeHistory: Total=${historyCount}`);
    console.log(`ProjectMember: Total=${projectMemberCount}`);
    console.log(`UserAccessGrant: Total=${grantCount}`);

    // Compute canonical KPIs for this database
    const targetDate = new Date("2026-08-06");

    const rawOnSite: any[] = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT "employeeId") as count
      FROM "EmployeeProjectAssignment"
      WHERE "status" = 'ACTIVE'
        AND "startDate" <= ${targetDate}
        AND ("endDate" IS NULL OR "endDate" > ${targetDate})
    `;
    const totalOnSite = Number(rawOnSite[0]?.count || 0);

    const rawProjectsStaffed: any[] = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT "projectId") as count
      FROM "EmployeeProjectAssignment"
      WHERE "status" = 'ACTIVE'
        AND "startDate" <= ${targetDate}
        AND ("endDate" IS NULL OR "endDate" > ${targetDate})
    `;
    const activeProjectsStaffed = Number(rawProjectsStaffed[0]?.count || 0);

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
    const expiring30d = Number(rawExpiring[0]?.count || 0);

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
    const unassigned = Number(rawUnassigned[0]?.count || 0);

    console.log(`--- KPI Summary ---`);
    console.log(`KPI_TOTAL_ON_SITE: ${totalOnSite}`);
    console.log(`KPI_ACTIVE_PROJECTS_STAFFED: ${activeProjectsStaffed}`);
    console.log(`KPI_EXPIRING_ASSIGNMENTS_30D: ${expiring30d}`);
    console.log(`KPI_UNASSIGNED_EMPLOYEES: ${unassigned}`);
  } catch (err: any) {
    console.error(`Error querying ${label}:`, err.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  const devUrl = process.env.DATABASE_URL || "postgresql://postgres:****@127.0.0.1:5432/construction_erp_v2_dev?schema=public";
  const qaUrl = process.env.QA_DATABASE_URL || "postgresql://hr_qa_user:****@127.0.0.1:5432/construction_erp_v2_hr_qa?schema=public";

  await inspectDb(devUrl, "Runtime Development Database (construction_erp_v2_dev)");
  await inspectDb(qaUrl, "HR QA Database (construction_erp_v2_hr_qa)");
}

main();
