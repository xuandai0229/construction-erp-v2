import { PrismaClient, HrDataScope } from "@prisma/client";
import prisma from "@/lib/prisma";
import { HrUserContext, buildEmployeeScopeWhereClause } from "./hr-auth-guard";
import { buildEffectiveDateWhere } from "./effective-date-helper";
import { formatVietnamDateOnly } from "./vietnam-date-helper";
import Workbook from "exceljs";

export interface HrReportFilters {
  dateStart?: string;
  dateEnd?: string;
  orgUnitId?: string;
  projectId?: string;
  projectRoleId?: string;
  employeeStatus?: string;
  assignmentStatus?: string;
  searchQuery?: string;
  kpiFilter?: string; // e.g. "on_site", "expiring_30d", "unassigned", "available_capacity", "overallocated"
}

export interface HrKpiMetrics {
  totalOnSite: number;
  activeProjectsStaffed: number;
  expiringAssignments30d: number;
  unassignedEmployees: number;
  availableCapacityEmployees: number;
  overallocatedEmployees: number;
  totalActiveAssignments: number;
  totalActiveEmployees: number;
  totalOrgUnits: number;
  averageAllocation: number;
}

export interface HrChartData {
  orgUnitDistribution: Array<{ unitId: string; unitCode: string; unitName: string; count: number; percentage: number }>;
  projectDistribution: Array<{ projectId: string; projectCode: string; projectName: string; count: number; totalAllocation: number }>;
  statusBreakdown: Array<{ status: string; statusLabel: string; count: number }>;
  roleBreakdown: Array<{ roleId: string; roleCode: string; roleName: string; count: number }>;
}

export interface HrReportDetailItem {
  assignmentId: string;
  employeeId: string;
  employeeCode: string;
  employeeFullName: string;
  orgUnitId?: string;
  orgUnitCode?: string;
  orgUnitName?: string;
  positionTitle?: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  projectRoleId: string;
  projectRoleCode: string;
  projectRoleName: string;
  startDate: string;
  expectedEndDate?: string;
  endDate?: string;
  allocationPercentage: number;
  status: string;
  endReason?: string;
  assignmentDecisionNo?: string;
  notes?: string;
}

export interface HrReportDetailsTableResult {
  items: HrReportDetailItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Calculates canonical HR KPIs matching HR_PHASE_4_REPORTING_AND_KPI_SPEC.md.
 */
export async function getHrReportKpis(
  ctx: HrUserContext,
  scope: HrDataScope,
  filters: HrReportFilters = {},
  prismaClient: any = prisma
): Promise<HrKpiMetrics> {
  const scopeWhere = await buildEmployeeScopeWhereClause(ctx, scope, prismaClient);
  const targetDate = filters.dateStart ? new Date(filters.dateStart) : new Date();

  // 1. Fetch active employees within scope
  const activeEmployees = await prismaClient.employee.findMany({
    where: {
      AND: [
        scopeWhere,
        filters.employeeStatus ? { status: filters.employeeStatus as any } : { status: "ACTIVE" },
        filters.searchQuery
          ? {
              OR: [
                { fullName: { contains: filters.searchQuery, mode: "insensitive" } },
                { code: { contains: filters.searchQuery, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    select: {
      id: true,
      code: true,
      fullName: true,
      projectAssignments: {
        where: {
          status: filters.assignmentStatus ? (filters.assignmentStatus as any) : "ACTIVE",
          startDate: { lte: targetDate },
          OR: [{ endDate: null }, { endDate: { gt: targetDate } }],
          ...(filters.projectId ? { projectId: filters.projectId } : {}),
          ...(filters.projectRoleId ? { projectPersonnelRoleId: filters.projectRoleId } : {}),
        },
        select: {
          id: true,
          projectId: true,
          allocationPercentage: true,
          expectedEndDate: true,
        },
      },
      orgAssignments: {
        where: {
          isPrimary: true,
          startDate: { lte: targetDate },
          OR: [{ endDate: null }, { endDate: { gt: targetDate } }],
        },
        select: {
          organizationUnitId: true,
        },
      },
    },
  });

  // Filter by orgUnitId if specified
  const filteredEmployees = filters.orgUnitId
    ? activeEmployees.filter((e: any) => e.orgAssignments.some((oa: any) => oa.organizationUnitId === filters.orgUnitId))
    : activeEmployees;

  const totalActiveEmployees = filteredEmployees.length;

  let totalOnSiteSet = new Set<string>();
  let activeProjectsSet = new Set<string>();
  let expiringAssignmentsCount = 0;
  let unassignedCount = 0;
  let availableCapacityCount = 0;
  let overallocatedCount = 0;
  let totalActiveAssignments = 0;
  let totalAllocationSum = 0;

  const thirtyDaysLater = new Date(targetDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const emp of filteredEmployees) {
    const assignments = emp.projectAssignments || [];
    totalActiveAssignments += assignments.length;

    let empTotalAllocation = 0;
    if (assignments.length > 0) {
      totalOnSiteSet.add(emp.id);
      for (const a of assignments) {
        activeProjectsSet.add(a.projectId);
        empTotalAllocation += a.allocationPercentage || 0;
        totalAllocationSum += a.allocationPercentage || 0;

        if (a.expectedEndDate && a.expectedEndDate >= targetDate && a.expectedEndDate <= thirtyDaysLater) {
          expiringAssignmentsCount++;
        }
      }

      if (empTotalAllocation < 100) {
        availableCapacityCount++;
      } else if (empTotalAllocation > 100) {
        overallocatedCount++;
      }
    } else {
      unassignedCount++;
    }
  }

  const totalOrgUnitsCount = await prismaClient.organizationUnit.count({
    where: { isActive: true },
  });

  const averageAllocation = totalActiveAssignments > 0 ? Math.round(totalAllocationSum / totalActiveAssignments) : 0;

  return {
    totalOnSite: totalOnSiteSet.size,
    activeProjectsStaffed: activeProjectsSet.size,
    expiringAssignments30d: expiringAssignmentsCount,
    unassignedEmployees: unassignedCount,
    availableCapacityEmployees: availableCapacityCount,
    overallocatedEmployees: overallocatedCount,
    totalActiveAssignments,
    totalActiveEmployees,
    totalOrgUnits: totalOrgUnitsCount,
    averageAllocation,
  };
}

/**
 * Computes aggregations for HR dashboard charts.
 */
export async function getHrReportCharts(
  ctx: HrUserContext,
  scope: HrDataScope,
  filters: HrReportFilters = {},
  prismaClient: any = prisma
): Promise<HrChartData> {
  const scopeWhere = await buildEmployeeScopeWhereClause(ctx, scope, prismaClient);
  const targetDate = filters.dateStart ? new Date(filters.dateStart) : new Date();

  // 1. Fetch active assignments with relationships
  const assignments = await prismaClient.employeeProjectAssignment.findMany({
    where: {
      status: filters.assignmentStatus ? (filters.assignmentStatus as any) : "ACTIVE",
      startDate: { lte: targetDate },
      OR: [{ endDate: null }, { endDate: { gt: targetDate } }],
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.projectRoleId ? { projectPersonnelRoleId: filters.projectRoleId } : {}),
      employee: {
        AND: [
          scopeWhere,
          filters.employeeStatus ? { status: filters.employeeStatus as any } : { status: "ACTIVE" },
        ],
      },
    },
    include: {
      employee: {
        include: {
          orgAssignments: {
            where: {
              isPrimary: true,
              startDate: { lte: targetDate },
              OR: [{ endDate: null }, { endDate: { gt: targetDate } }],
            },
            include: { organizationUnit: true },
          },
        },
      },
      project: true,
      projectPersonnelRole: true,
    },
  });

  // Org unit breakdown
  const orgMap = new Map<string, { unitId: string; unitCode: string; unitName: string; count: number }>();
  // Project breakdown
  const projMap = new Map<string, { projectId: string; projectCode: string; projectName: string; count: number; totalAllocation: number }>();
  // Role breakdown
  const roleMap = new Map<string, { roleId: string; roleCode: string; roleName: string; count: number }>();
  // Status breakdown
  const statusMap = new Map<string, number>();

  const total = assignments.length;

  for (const a of assignments) {
    // Org Unit
    const org = a.employee?.orgAssignments?.[0]?.organizationUnit;
    const orgId = org?.id || "UNASSIGNED_ORG";
    const orgCode = org?.code || "N/A";
    const orgName = org?.name || "Chưa thuộc phòng ban";
    if (!orgMap.has(orgId)) {
      orgMap.set(orgId, { unitId: orgId, unitCode: orgCode, unitName: orgName, count: 0 });
    }
    orgMap.get(orgId)!.count++;

    // Project
    const pId = a.projectId;
    const pCode = a.project?.code || "N/A";
    const pName = a.project?.name || "Công trình";
    if (!projMap.has(pId)) {
      projMap.set(pId, { projectId: pId, projectCode: pCode, projectName: pName, count: 0, totalAllocation: 0 });
    }
    const pEntry = projMap.get(pId)!;
    pEntry.count++;
    pEntry.totalAllocation += a.allocationPercentage;

    // Role
    const rId = a.projectPersonnelRoleId;
    const rCode = a.projectPersonnelRole?.code || "N/A";
    const rName = a.projectPersonnelRole?.name || "Vai trò";
    if (!roleMap.has(rId)) {
      roleMap.set(rId, { roleId: rId, roleCode: rCode, roleName: rName, count: 0 });
    }
    roleMap.get(rId)!.count++;

    // Status
    const st = a.status;
    statusMap.set(st, (statusMap.get(st) || 0) + 1);
  }

  const orgUnitDistribution = Array.from(orgMap.values()).map((item) => ({
    ...item,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }));

  const projectDistribution = Array.from(projMap.values());
  const roleBreakdown = Array.from(roleMap.values());

  const statusLabelMap: Record<string, string> = {
    ACTIVE: "Đang hiệu lực",
    PLANNING: "Kế hoạch",
    RELEASED: "Đã rút",
    COMPLETED: "Đã hoàn thành",
    CANCELLED: "Đã hủy",
  };

  const statusBreakdown = Array.from(statusMap.entries()).map(([st, cnt]) => ({
    status: st,
    statusLabel: statusLabelMap[st] || st,
    count: cnt,
  }));

  return {
    orgUnitDistribution,
    projectDistribution,
    statusBreakdown,
    roleBreakdown,
  };
}

/**
 * Returns paginated HR Detail Items matching filters.
 */
export async function getHrReportDetailsTable(
  ctx: HrUserContext,
  scope: HrDataScope,
  filters: HrReportFilters = {},
  page: number = 1,
  pageSize: number = 20,
  prismaClient: any = prisma
): Promise<HrReportDetailsTableResult> {
  const scopeWhere = await buildEmployeeScopeWhereClause(ctx, scope, prismaClient);
  const targetDate = filters.dateStart ? new Date(filters.dateStart) : new Date();

  const whereClause: any = {
    employee: {
      AND: [
        scopeWhere,
        filters.employeeStatus ? { status: filters.employeeStatus as any } : {},
        filters.searchQuery
          ? {
              OR: [
                { fullName: { contains: filters.searchQuery, mode: "insensitive" } },
                { code: { contains: filters.searchQuery, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    ...(filters.assignmentStatus ? { status: filters.assignmentStatus as any } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.projectRoleId ? { projectPersonnelRoleId: filters.projectRoleId } : {}),
  };

  // Date range filter
  if (filters.dateStart || filters.dateEnd) {
    const dStart = filters.dateStart ? new Date(filters.dateStart) : undefined;
    const dEnd = filters.dateEnd ? new Date(filters.dateEnd) : undefined;
    if (dStart && dEnd) {
      whereClause.startDate = { lte: dEnd };
      whereClause.OR = [{ endDate: null }, { endDate: { gte: dStart } }];
    } else if (dStart) {
      whereClause.OR = [{ endDate: null }, { endDate: { gte: dStart } }];
    } else if (dEnd) {
      whereClause.startDate = { lte: dEnd };
    }
  }

  // Handle drill-down KPI filter
  if (filters.kpiFilter === "expiring_30d") {
    const thirtyDays = new Date(targetDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    whereClause.status = "ACTIVE";
    whereClause.expectedEndDate = { gte: targetDate, lte: thirtyDays };
  }

  const [rawItems, totalCount] = await Promise.all([
    prismaClient.employeeProjectAssignment.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            orgAssignments: {
              where: {
                isPrimary: true,
                startDate: { lte: targetDate },
                OR: [{ endDate: null }, { endDate: { gt: targetDate } }],
              },
              include: {
                organizationUnit: true,
                position: true,
              },
            },
          },
        },
        project: true,
        projectPersonnelRole: true,
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prismaClient.employeeProjectAssignment.count({ where: whereClause }),
  ]);

  // Filter orgUnitId in code if specified
  let itemsFiltered = rawItems;
  if (filters.orgUnitId) {
    itemsFiltered = rawItems.filter((a: any) =>
      a.employee?.orgAssignments?.some((oa: any) => oa.organizationUnitId === filters.orgUnitId)
    );
  }

  const items: HrReportDetailItem[] = itemsFiltered.map((a: any) => {
    const primaryOrg = a.employee?.orgAssignments?.[0];
    return {
      assignmentId: a.id,
      employeeId: a.employeeId,
      employeeCode: a.employee?.code || "N/A",
      employeeFullName: a.employee?.fullName || "N/A",
      orgUnitId: primaryOrg?.organizationUnitId,
      orgUnitCode: primaryOrg?.organizationUnit?.code,
      orgUnitName: primaryOrg?.organizationUnit?.name,
      positionTitle: primaryOrg?.position?.title,
      projectId: a.projectId,
      projectCode: a.project?.code || "N/A",
      projectName: a.project?.name || "N/A",
      projectRoleId: a.projectPersonnelRoleId,
      projectRoleCode: a.projectPersonnelRole?.code || "N/A",
      projectRoleName: a.projectPersonnelRole?.name || "N/A",
      startDate: formatVietnamDateOnly(a.startDate),
      expectedEndDate: a.expectedEndDate ? formatVietnamDateOnly(a.expectedEndDate) : undefined,
      endDate: a.endDate ? formatVietnamDateOnly(a.endDate) : undefined,
      allocationPercentage: a.allocationPercentage,
      status: a.status,
      endReason: a.endReason || undefined,
      assignmentDecisionNo: a.assignmentDecisionNo || undefined,
      notes: a.notes || undefined,
    };
  });

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize) || 1,
  };
}

/**
 * Generates Excel Workbook Buffer matching HR_PHASE_4_REPORTING_AND_KPI_SPEC.md & DEC-08/DEC-10.
 * Perfect Parity: Includes Sheet 1 (Tổng quan), Sheet 2 (Chi tiết điều động), Sheet 3 (Cơ cấu theo đơn vị).
 */
export async function generateHrExcelReportBuffer(
  ctx: HrUserContext,
  scope: HrDataScope,
  filters: HrReportFilters = {},
  prismaClient: any = prisma
): Promise<Buffer> {
  const [kpis, charts, detailsResult] = await Promise.all([
    getHrReportKpis(ctx, scope, filters, prismaClient),
    getHrReportCharts(ctx, scope, filters, prismaClient),
    getHrReportDetailsTable(ctx, scope, filters, 1, 10000, prismaClient), // All matching items for export
  ]);

  const workbook = new Workbook.Workbook();
  workbook.creator = "Construction ERP v2 - HR System";
  workbook.created = new Date();

  // Color Constants
  const HEADER_FILL_COLOR = "1E3A8A"; // Dark Blue
  const SUBHEADER_FILL_COLOR = "F1F5F9"; // Light Gray

  // ----------------------------------------------------
  // SHEET 1: TỔNG QUAN (Summary & KPIs)
  // ----------------------------------------------------
  const sheet1 = workbook.addWorksheet("Tổng quan", {
    views: [{ showGridLines: true }],
  });

  sheet1.mergeCells("A1:E1");
  const titleCell = sheet1.getCell("A1");
  titleCell.value = "BÁO CÁO TỔNG QUAN VÀ CHỈ SỐ KPI NHÂN SỰ CÔNG TRÌNH";
  titleCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL_COLOR } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet1.getRow(1).height = 35;

  sheet1.getCell("A3").value = "Thời điểm báo cáo:";
  sheet1.getCell("B3").value = formatVietnamDateOnly(filters.dateStart ? new Date(filters.dateStart) : new Date());
  sheet1.getCell("A3").font = { name: "Segoe UI", bold: true };

  sheet1.getCell("A4").value = "Người xuất báo cáo:";
  sheet1.getCell("B4").value = ctx.session.name || ctx.session.email;
  sheet1.getCell("A4").font = { name: "Segoe UI", bold: true };

  // KPI Table Header
  sheet1.getRow(6).values = ["Mã KPI", "Tên chỉ số KPI", "Giá trị", "Đơn vị tính", "Ghi chú công thức"];
  const kpiHeaderRow = sheet1.getRow(6);
  kpiHeaderRow.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFFFF" } };
  kpiHeaderRow.height = 24;
  kpiHeaderRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2563EB" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const kpiRows = [
    ["KPI_TOTAL_ON_SITE", "Tổng nhân sự cắm tại công trường", kpis.totalOnSite, "Nhân sự", "Đếm số nhân sự duy nhất đang có phân công ACTIVE"],
    ["KPI_ACTIVE_PROJECTS_STAFFED", "Số công trình đã có nhân sự điều động", kpis.activeProjectsStaffed, "Công trình", "Đếm số công trình duy nhất có nhân lực đang cắm"],
    ["KPI_EXPIRING_ASSIGNMENTS_30D", "Số điều động sắp hết hạn (30 ngày)", kpis.expiringAssignments30d, "Bản ghi", "ExpectedEndDate trong vòng 30 ngày tới"],
    ["KPI_UNASSIGNED_EMPLOYEES", "Số nhân sự chưa có điều động", kpis.unassignedEmployees, "Nhân sự", "Nhân sự ACTIVE có 0 phân công công trình"],
    ["KPI_EMPLOYEES_WITH_AVAILABLE_CAPACITY", "Số nhân sự còn dung lượng phân bổ", kpis.availableCapacityEmployees, "Nhân sự", "Tổng phân bổ thời gian < 100%"],
    ["KPI_OVERALLOCATED_EMPLOYEES", "Số nhân sự vượt ngưỡng 100% phân bổ", kpis.overallocatedEmployees, "Nhân sự", "Tổng phân bổ thời gian giao thoa > 100%"],
    ["KPI_TOTAL_ACTIVE_ASSIGNMENTS", "Tổng số bản ghi điều động hiệu lực", kpis.totalActiveAssignments, "Bản ghi", "Tổng bản ghi phân công ACTIVE"],
    ["KPI_AVERAGE_ALLOCATION", "Tỷ lệ phân bổ trung bình", kpis.averageAllocation / 100, "Phần trăm", "Trung bình % phân bổ trên các bản ghi"],
  ];

  kpiRows.forEach((row, idx) => {
    const r = sheet1.addRow(row);
    r.font = { name: "Segoe UI", size: 10 };
    r.getCell(3).font = { name: "Segoe UI", size: 11, bold: true };
    if (row[0] === "KPI_AVERAGE_ALLOCATION") {
      r.getCell(3).numFmt = "0%";
    }
  });

  sheet1.columns = [
    { width: 35 },
    { width: 45 },
    { width: 18 },
    { width: 18 },
    { width: 55 },
  ];

  // ----------------------------------------------------
  // SHEET 2: CHI TIẾT ĐIỀU ĐỘNG (Staffing Details)
  // ----------------------------------------------------
  const sheet2 = workbook.addWorksheet("Chi tiết điều động", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1, showGridLines: true }],
  });

  const detailHeaders = [
    "STT",
    "Mã nhân viên",
    "Họ và tên",
    "Đơn vị gốc",
    "Vị trí chuyên môn",
    "Mã dự án",
    "Tên công trình / Dự án",
    "Vai trò công trường",
    "Ngày bắt đầu",
    "Ngày dự kiến kết thúc",
    "Ngày kết thúc thực tế",
    "Tỷ lệ phân bổ (%)",
    "Số quyết định",
    "Trạng thái điều động",
    "Lý do kết thúc",
  ];

  sheet2.getRow(1).values = detailHeaders;
  const sheet2HeaderRow = sheet2.getRow(1);
  sheet2HeaderRow.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFFFF" } };
  sheet2HeaderRow.height = 26;
  sheet2HeaderRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL_COLOR } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const statusLabelMap: Record<string, string> = {
    ACTIVE: "Đang hiệu lực",
    PLANNING: "Kế hoạch",
    RELEASED: "Đã rút",
    COMPLETED: "Đã hoàn thành",
    CANCELLED: "Đã hủy",
  };

  const endReasonLabelMap: Record<string, string> = {
    COMPLETED: "Hoàn thành nhiệm vụ",
    EARLY_RELEASE: "Rút trước thời hạn",
    ROLE_TRANSFER: "Thay đổi vai trò",
    ALLOCATION_CHANGE: "Điều chỉnh tỷ lệ %",
    PROJECT_TRANSFER: "Điều chuyển công trình",
  };

  detailsResult.items.forEach((item, idx) => {
    const row = sheet2.addRow([
      idx + 1,
      item.employeeCode,
      item.employeeFullName,
      item.orgUnitName || "Chưa thuộc phòng ban",
      item.positionTitle || "Chưa xếp vị trí",
      item.projectCode,
      item.projectName,
      item.projectRoleName,
      item.startDate,
      item.expectedEndDate || "-",
      item.endDate || "-",
      item.allocationPercentage / 100, // format as percentage
      item.assignmentDecisionNo || "-",
      statusLabelMap[item.status] || item.status,
      item.endReason ? endReasonLabelMap[item.endReason] || item.endReason : "-",
    ]);

    row.font = { name: "Segoe UI", size: 10 };
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { horizontal: "center" };
    row.getCell(9).alignment = { horizontal: "center" };
    row.getCell(10).alignment = { horizontal: "center" };
    row.getCell(11).alignment = { horizontal: "center" };
    row.getCell(12).alignment = { horizontal: "right" };
    row.getCell(12).numFmt = "0%";
    row.getCell(14).alignment = { horizontal: "center" };
  });

  sheet2.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: detailHeaders.length },
  };

  sheet2.columns = [
    { width: 8 },
    { width: 16 },
    { width: 26 },
    { width: 28 },
    { width: 24 },
    { width: 16 },
    { width: 32 },
    { width: 24 },
    { width: 16 },
    { width: 22 },
    { width: 22 },
    { width: 20 },
    { width: 20 },
    { width: 22 },
    { width: 26 },
  ];

  // ----------------------------------------------------
  // SHEET 3: CƠ CẤU THEO ĐƠN VỊ (Unit Structural Breakdown)
  // ----------------------------------------------------
  const sheet3 = workbook.addWorksheet("Cơ cấu theo đơn vị", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1, showGridLines: true }],
  });

  const sheet3Headers = ["STT", "Mã đơn vị", "Tên đơn vị tổ chức", "Số nhân sự cắm công trường", "Tỷ lệ cơ cấu (%)"];
  sheet3.getRow(1).values = sheet3Headers;
  const sheet3HeaderRow = sheet3.getRow(1);
  sheet3HeaderRow.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFFFF" } };
  sheet3HeaderRow.height = 26;
  sheet3HeaderRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL_COLOR } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  charts.orgUnitDistribution.forEach((org, idx) => {
    const row = sheet3.addRow([
      idx + 1,
      org.unitCode,
      org.unitName,
      org.count,
      org.percentage / 100,
    ]);
    row.font = { name: "Segoe UI", size: 10 };
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "right" };
    row.getCell(5).alignment = { horizontal: "right" };
    row.getCell(5).numFmt = "0%";
  });

  sheet3.columns = [
    { width: 8 },
    { width: 18 },
    { width: 36 },
    { width: 28 },
    { width: 20 },
  ];

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
