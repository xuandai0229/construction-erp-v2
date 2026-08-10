import dotenv from "dotenv";
import fs from "fs";
import { PrismaClient, HrDataScope } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  getHrReportCharts,
  getHrReportDetailsTable,
  HrUserContext,
} from "../src/lib/hr/reporting-service";

const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
const pool = new Pool({ connectionString: envConfig.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function auditRoleAndPositionDrilldown() {
  console.log("==========================================");
  console.log("ITEM 7 & 8: ROLE REALISM & POSITION DRILLDOWN AUDIT");
  console.log("==========================================");

  const ctx: HrUserContext = {
    userId: "dev-admin-user",
    role: "ADMIN",
    isSystemAdmin: true,
    session: { id: "dev-admin-user", name: "System Admin", role: "ADMIN" },
  } as any;
  const scope = HrDataScope.ALL_EMPLOYEES;

  // 1. Audit Project Role Realism in DB
  const activeAssignments = await (prisma as any).employeeProjectAssignment.findMany({
    where: { status: "ACTIVE" },
    include: { projectPersonnelRole: true },
  });

  const roleDistributionMap = new Map<string, number>();
  for (const a of activeAssignments) {
    const rName = a.projectPersonnelRole?.name || "N/A";
    roleDistributionMap.set(rName, (roleDistributionMap.get(rName) || 0) + 1);
  }

  console.log(`ACTIVE_ASSIGNMENTS: ${activeAssignments.length}`);
  console.log(`DISTINCT_PROJECT_ROLE_COUNT: ${roleDistributionMap.size}`);
  console.log("ROLE_DISTRIBUTION:", Object.fromEntries(roleDistributionMap));
  const realismStatus = roleDistributionMap.size === 1 ? "WARNING (Demo Data Issue)" : "PASS";
  console.log(`PROJECT_ROLE_DATA_REALISM: ${realismStatus}`);

  // 2. Audit Position Drilldown Parity for Unassigned Mode
  console.log("\n--- Unassigned Context Position Drilldown Test ---");
  const unassignedCharts = await getHrReportCharts(
    ctx,
    scope,
    { kpiFilter: "unassigned" },
    prisma
  );

  console.log("Unassigned Role/Position Breakdown Pills:", unassignedCharts.roleBreakdown);

  let unassignedParityPassed = true;
  for (const item of unassignedCharts.roleBreakdown) {
    const details = await getHrReportDetailsTable(
      ctx,
      scope,
      { kpiFilter: "unassigned", positionId: item.roleId },
      1,
      100,
      prisma
    );
    console.log(
      `Position: ${item.roleName} (ID: ${item.roleId}) | PILL_DISPLAYED: ${item.count} | FILTER_RESULT: ${details.totalCount}`
    );
    if (item.count !== details.totalCount) {
      unassignedParityPassed = false;
    }
  }

  console.log(
    `UNASSIGNED_POSITION_DRILLDOWN_PARITY: ${unassignedParityPassed ? "PASS" : "FAIL"}`
  );

  // 3. Audit Project Role Drilldown Parity for Active Assignment Mode
  console.log("\n--- Active Assignment Role Drilldown Test ---");
  const activeCharts = await getHrReportCharts(ctx, scope, {}, prisma);

  let activeRoleParityPassed = true;
  for (const item of activeCharts.roleBreakdown) {
    const details = await getHrReportDetailsTable(
      ctx,
      scope,
      { projectRoleId: item.roleId },
      1,
      100,
      prisma
    );
    console.log(
      `ProjectRole: ${item.roleName} (ID: ${item.roleId}) | PILL_DISPLAYED: ${item.count} | FILTER_RESULT: ${details.totalCount}`
    );
    if (item.count !== details.totalCount) {
      activeRoleParityPassed = false;
    }
  }

  console.log(
    `ACTIVE_ROLE_DRILLDOWN_PARITY: ${activeRoleParityPassed ? "PASS" : "FAIL"}`
  );

  await prisma.$disconnect();
  await pool.end();
}

auditRoleAndPositionDrilldown().catch((err) => {
  console.error("Audit Failed:", err);
  process.exit(1);
});
