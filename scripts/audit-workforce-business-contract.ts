import dotenv from "dotenv";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getHrReportKpis } from "../src/lib/hr/reporting-service";

const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
const pool = new Pool({ connectionString: envConfig.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function auditWorkforceContract() {
  console.log("==========================================");
  console.log("1. WORKFORCE BUSINESS CONTRACT AUDIT");
  console.log("==========================================");

  // Group by status in Employee table
  const statusGroup = await prisma.employee.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  console.log("Employee table breakdown by status:", statusGroup);

  const activeCount = await prisma.employee.count({ where: { status: "ACTIVE" } });
  const probationCount = await prisma.employee.count({ where: { status: "PROBATION" as any } });
  const suspendedCount = await prisma.employee.count({ where: { status: "SUSPENDED" as any } });
  const totalCountInDb = await prisma.employee.count();

  console.log(`ACTIVE_COUNT: ${activeCount}`);
  console.log(`PROBATION_COUNT: ${probationCount}`);
  console.log(`SUSPENDED_COUNT: ${suspendedCount}`);
  console.log(`TOTAL_EMPLOYEES_IN_DB: ${totalCountInDb}`);

  // Check /hr dashboard metric query logic
  // Check /hr/employees default query logic
  const dummyCtx: any = {
    userId: "dev-admin-user",
    role: "ADMIN",
    isSystemAdmin: true,
    session: { id: "dev-admin-user", name: "System Admin", role: "ADMIN" },
  };
  const reportKpis = await getHrReportKpis(dummyCtx, { type: "ALL" } as any, {}, prisma);

  console.log("\nCounts across routes:");
  console.log(`OVERVIEW_COUNT (Active employees): ${activeCount}`);
  console.log(`EMPLOYEE_LIST_COUNT (Active employees): ${activeCount}`);
  console.log(`REPORT_COUNT (Report active employees): ${reportKpis.totalActiveEmployees}`);

  await prisma.$disconnect();
  await pool.end();
}

auditWorkforceContract().catch(console.error);
