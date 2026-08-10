import "dotenv/config";
import prisma from "@/lib/prisma";
import { getHrReportKpis, getHrReportCharts, getHrReportDetailsTable } from "@/lib/hr/reporting-service";
import { HrDataScope } from "@prisma/client";

async function main() {
  const dummyCtx: any = {
    isSystemAdmin: true,
    employeeId: null,
    session: { id: "system_admin", userId: "system_admin", name: "System Admin", role: "ADMIN" },
  };

  console.log("==========================================");
  console.log("HR REPORTING FORENSIC DATA AUDIT - DEEP");
  console.log("==========================================");

  // 1. Raw DB counts
  const totalEmployeesCount = await prisma.employee.count({ where: { status: "ACTIVE" } });
  const totalAssignmentsCount = await prisma.employeeProjectAssignment.count({ where: { status: "ACTIVE" } });
  const totalProjectsCount = await prisma.project.count();
  const totalOrgUnitsCount = await prisma.organizationUnit.count({ where: { isActive: true } });
  const totalRolesCount = await prisma.projectPersonnelRole.count({ where: { isActive: true } });

  console.log(`RAW DB: Active Employees = ${totalEmployeesCount}`);
  console.log(`RAW DB: Active Assignments = ${totalAssignmentsCount}`);
  console.log(`RAW DB: Total Projects = ${totalProjectsCount}`);
  console.log(`RAW DB: Active Org Units = ${totalOrgUnitsCount}`);
  console.log(`RAW DB: Active Roles = ${totalRolesCount}`);

  // Test with scope ALL_EMPLOYEES
  const kpisNow = await getHrReportKpis(dummyCtx, HrDataScope.ALL_EMPLOYEES, {});
  console.log("\nKPIs with Date = NOW:", JSON.stringify(kpisNow, null, 2));

  const kpis2026 = await getHrReportKpis(dummyCtx, HrDataScope.ALL_EMPLOYEES, { dateStart: "2026-12-31" });
  console.log("\nKPIs with Date = 2026-12-31:", JSON.stringify(kpis2026, null, 2));

  const chartsNow = await getHrReportCharts(dummyCtx, HrDataScope.ALL_EMPLOYEES, {});
  console.log("\nCHARTS with Date = NOW:", JSON.stringify(chartsNow, null, 2));

  const detailsNow = await getHrReportDetailsTable(dummyCtx, HrDataScope.ALL_EMPLOYEES, {}, 1, 50);
  console.log(`\nDETAILS TABLE count = ${detailsNow.totalCount}, items len = ${detailsNow.items.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
