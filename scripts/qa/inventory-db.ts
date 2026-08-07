import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.hr-qa.local", override: true });

async function checkDb(url: string, label: string) {
  let maskedHost = "N/A";
  let maskedPort = "N/A";
  let maskedDb = "N/A";

  try {
    const urlObj = new URL(url.replace(/^postgresql:\/\//, "http://"));
    maskedHost = urlObj.hostname;
    maskedPort = urlObj.port || "5432";
    maskedDb = urlObj.pathname.replace(/^\//, "");
  } catch (e) {}

  console.log(`\n=== FINGERPRINT [${label}] ===`);
  console.log(`Host: ${maskedHost}`);
  console.log(`Port: ${maskedPort}`);
  console.log(`Database: ${maskedDb}`);

  try {
    const pool = new pg.Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter });

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
      client.employee.count(),
      client.employee.count({ where: { status: "ACTIVE" } }),
      client.organizationUnit.count(),
      client.position.count(),
      client.project.count(),
      client.projectPersonnelRole.count(),
      client.employeeProjectAssignment.count(),
      client.employeeProjectAssignment.count({ where: { status: "ACTIVE" } }),
      client.employeeChangeHistory.count(),
      client.projectMember.count(),
      client.userAccessGrant.count(),
    ]);

    console.log(`SUCCESS CONNECTING TO [${label}]!`);
    console.log(`Employee: Total=${employeeCount}, Active=${activeEmployees}`);
    console.log(`OrganizationUnit: Total=${orgUnitCount}`);
    console.log(`Position: Total=${positionCount}`);
    console.log(`Project: Total=${projectCount}`);
    console.log(`ProjectPersonnelRole: Total=${projectRoleCount}`);
    console.log(`EmployeeProjectAssignment: Total=${assignmentCount}, Active=${activeAssignments}`);
    console.log(`EmployeeChangeHistory: Total=${historyCount}`);
    console.log(`ProjectMember: Total=${projectMemberCount}`);
    console.log(`UserAccessGrant: Total=${grantCount}`);

    await client.$disconnect();
    await pool.end();
    return true;
  } catch (err: any) {
    console.log(`FAILED CONNECTING TO [${label}]:`, err.message);
    return false;
  }
}

async function main() {
  const db1 = process.env.DATABASE_URL || "";
  const db2 = process.env.QA_DATABASE_URL || "";

  await checkDb(db1, "DATABASE_URL (.env.hr-qa.local)");
  await checkDb(db2, "QA_DATABASE_URL");
}

main();
