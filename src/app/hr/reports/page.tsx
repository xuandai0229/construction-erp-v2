import React from "react";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { checkHrPermission } from "@/lib/hr/hr-auth-guard";
import prisma from "@/lib/prisma";
import {
  getHrReportKpis,
  getHrReportCharts,
  getHrReportDetailsTable,
  HrReportFilters,
} from "@/lib/hr/reporting-service";
import { HrReportFilterBar } from "@/components/hr/reports/hr-report-filter-bar";
import { HrReportKpiCards } from "@/components/hr/reports/hr-report-kpi-cards";
import { HrReportChartsGrid } from "@/components/hr/reports/hr-report-charts-grid";
import { HrReportDetailTable } from "@/components/hr/reports/hr-report-detail-table";
import { HrReportExportButton } from "@/components/hr/reports/hr-report-export-button";

export const dynamic = "force-dynamic";

interface HrReportsPageProps {
  searchParams: Promise<{
    dateStart?: string;
    dateEnd?: string;
    orgUnitId?: string;
    projectId?: string;
    projectRoleId?: string;
    employeeStatus?: string;
    assignmentStatus?: string;
    searchQuery?: string;
    kpiFilter?: string;
    page?: string;
  }>;
}

export default async function HrReportsPage(props: HrReportsPageProps) {
  const searchParams = await props.searchParams;

  const permCheck = await checkHrPermission("hr:project_assignment:read");
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Báo cáo và phân tích nhân sự"
          description="Theo dõi quy mô, cơ cấu, tình trạng phân bổ và lịch sử điều động nhân sự trên toàn công ty."
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:project_assignment:read" />
      </HrWorkspaceShell>
    );
  }

  const exportPermCheck = await checkHrPermission("hr:project_assignment:read");

  const pageNum = parseInt(searchParams.page || "1", 10) || 1;

  const filters: HrReportFilters = {
    dateStart: searchParams.dateStart || undefined,
    dateEnd: searchParams.dateEnd || undefined,
    orgUnitId: searchParams.orgUnitId || undefined,
    projectId: searchParams.projectId || undefined,
    projectRoleId: searchParams.projectRoleId || undefined,
    employeeStatus: searchParams.employeeStatus || undefined,
    assignmentStatus: searchParams.assignmentStatus || undefined,
    searchQuery: searchParams.searchQuery || undefined,
    kpiFilter: searchParams.kpiFilter || undefined,
  };

  // Parallel data fetching
  const [orgUnits, projects, projectRoles, kpis, charts, tableData] = await Promise.all([
    prisma.organizationUnit.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.projectPersonnelRole.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { orderIndex: "asc" },
    }),
    getHrReportKpis(permCheck.context, permCheck.scope, filters),
    getHrReportCharts(permCheck.context, permCheck.scope, filters),
    getHrReportDetailsTable(permCheck.context, permCheck.scope, filters, pageNum, 20),
  ]);

  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Báo cáo và phân tích nhân sự"
        description="Theo dõi quy mô, cơ cấu, tình trạng phân bổ và lịch sử điều động nhân sự trên toàn công ty."
      />

      <HrWorkspaceTabs rightContent={exportPermCheck.allowed ? <HrReportExportButton /> : undefined} />

      {/* Filter Bar */}
      <HrReportFilterBar
        orgUnits={orgUnits}
        projects={projects}
        projectRoles={projectRoles}
      />

      {/* KPI Cards Grid */}
      <HrReportKpiCards kpis={kpis} />

      {/* Analytics Charts Grid */}
      <HrReportChartsGrid charts={charts} />

      {/* Details Table */}
      <HrReportDetailTable tableData={tableData} />
    </HrWorkspaceShell>
  );
}
