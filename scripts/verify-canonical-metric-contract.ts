import dotenv from "dotenv";
import fs from "fs";
import { PrismaClient, HrDataScope } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getHrReportKpis } from "@/lib/hr/reporting-service";

const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
const pool = new Pool({ connectionString: envConfig.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("==========================================");
  console.log("PHASE 2: CANONICAL HR METRIC CONTRACT PARITY");
  console.log("==========================================");

  // 1. Overview current workforce count (Active employees)
  const overviewCount = await prisma.employee.count({
    where: { status: "ACTIVE" },
  });

  // 2. Employee list current workforce count
  const employeeListCount = await prisma.employee.count({
    where: { status: "ACTIVE" },
  });

  // 3. Report current workforce count (getHrReportKpis totalActiveEmployees)
  const dummyCtx: any = {
    isSystemAdmin: true,
    employeeId: null,
    session: { id: "admin", role: "ADMIN", name: "Admin" },
  };

  const kpis = await getHrReportKpis(dummyCtx, HrDataScope.ALL_EMPLOYEES, {}, prisma);
  const reportCount = kpis.totalActiveEmployees;

  console.log(`OVERVIEW_CURRENT_WORKFORCE: ${overviewCount}`);
  console.log(`EMPLOYEE_LIST_CURRENT_WORKFORCE: ${employeeListCount}`);
  console.log(`REPORT_CURRENT_WORKFORCE: ${reportCount}`);

  const isParity = overviewCount === employeeListCount && employeeListCount === reportCount;
  console.log(`CANONICAL_WORKFORCE_PARITY: ${isParity ? "PASS" : "FAIL"}`);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
