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

  if (filters.kpiFilter === "unassigned") {
    // Unassigned employees chart breakdown
    const unassignedEmps = await prismaClient.employee.findMany({
      where: {
        AND: [
          scopeWhere,
          { status: filters.employeeStatus ? (filters.employeeStatus as any) : "ACTIVE" },
          {
            projectAssignments: {
              none: {
                status: "ACTIVE",
                startDate: { lte: targetDate },
                OR: [{ endDate: null }, { endDate: { gt: targetDate } }],
              },
            },
          },
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
      include: {
        orgAssignments: {
          where: {
            isPrimary: true,
            startDate: { lte: targetDate },
            OR: [{ endDate: null }, { endDate: { gt: targetDate } }],
          },
          include: { organizationUnit: true, position: true },
        },
      },
    });

    const orgMap = new Map<string, { unitId: string; unitCode: string; unitName: string; count: number }>();
    const roleMap = new Map<string, { roleId: string; roleCode: string; roleName: string; count: number }>();

    for (const emp of unassignedEmps) {
      const primaryOrg = emp.orgAssignments?.[0];
      const orgUnit = primaryOrg?.organizationUnit;
      const orgId = orgUnit?.id || "UNASSIGNED_ORG";
      const orgCode = orgUnit?.code || "N/A";
      const orgName = orgUnit?.name || "Chưa thuộc đơn vị";
      if (!orgMap.has(orgId)) {
        orgMap.set(orgId, { unitId: orgId, unitCode: orgCode, unitName: orgName, count: 0 });
      }
      orgMap.get(orgId)!.count++;

      const pos = primaryOrg?.position;
      const posId = pos?.id || "UNASSIGNED_POS";
      const posCode = pos?.code || "N/A";
      const posName = pos?.title || "Chưa gán chức danh";
      if (!roleMap.has(posId)) {
        roleMap.set(posId, { roleId: posId, roleCode: posCode, roleName: posName, count: 0 });
      }
      roleMap.get(posId)!.count++;
    }

    const total = unassignedEmps.length;
    const orgUnitDistribution = Array.from(orgMap.values()).map((item) => ({
      ...item,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));

    return {
      orgUnitDistribution,
      projectDistribution: [
        {
          projectId: "UNASSIGNED",
          projectCode: "N/A",
          projectName: "Chưa điều động công trình",
          count: total,
          totalAllocation: 0,
        },
      ],
      statusBreakdown: [{ status: "UNASSIGNED", statusLabel: "Chưa điều động", count: total }],
      roleBreakdown: Array.from(roleMap.values()),
    };
  }

  // Fetch active assignments with relationships
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

  const orgMap = new Map<string, { unitId: string; unitCode: string; unitName: string; count: number }>();
  const projMap = new Map<string, { projectId: string; projectCode: string; projectName: string; count: number; totalAllocation: number }>();
  const roleMap = new Map<string, { roleId: string; roleCode: string; roleName: string; count: number }>();
  const statusMap = new Map<string, number>();

  const total = assignments.length;

  for (const a of assignments) {
    const org = a.employee?.orgAssignments?.[0]?.organizationUnit;
    const orgId = org?.id || "UNASSIGNED_ORG";
    const orgCode = org?.code || "N/A";
    const orgName = org?.name || "Chưa thuộc phòng ban";
    if (!orgMap.has(orgId)) {
      orgMap.set(orgId, { unitId: orgId, unitCode: orgCode, unitName: orgName, count: 0 });
    }
    orgMap.get(orgId)!.count++;

    const pId = a.projectId;
    const pCode = a.project?.code || "N/A";
    const pName = a.project?.name || "Công trình";
    if (!projMap.has(pId)) {
      projMap.set(pId, { projectId: pId, projectCode: pCode, projectName: pName, count: 0, totalAllocation: 0 });
    }
    const pEntry = projMap.get(pId)!;
    pEntry.count++;
    pEntry.totalAllocation += a.allocationPercentage;

    const rId = a.projectPersonnelRoleId;
    const rCode = a.projectPersonnelRole?.code || "N/A";
    const rName = a.projectPersonnelRole?.name || "Vai trò";
    if (!roleMap.has(rId)) {
      roleMap.set(rId, { roleId: rId, roleCode: rCode, roleName: rName, count: 0 });
    }
    roleMap.get(rId)!.count++;

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

  if (filters.kpiFilter === "unassigned") {
    // Unassigned employees table query directly from Employee
    const empWhere: any = {
      AND: [
        scopeWhere,
        { status: filters.employeeStatus ? (filters.employeeStatus as any) : "ACTIVE" },
        {
          projectAssignments: {
            none: {
              status: "ACTIVE",
              startDate: { lte: targetDate },
              OR: [{ endDate: null }, { endDate: { gt: targetDate } }],
            },
          },
        },
        filters.searchQuery
          ? {
              OR: [
                { fullName: { contains: filters.searchQuery, mode: "insensitive" } },
                { code: { contains: filters.searchQuery, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    if (filters.orgUnitId) {
      empWhere.AND.push({
        orgAssignments: {
          some: {
            organizationUnitId: filters.orgUnitId,
            isPrimary: true,
            startDate: { lte: targetDate },
            OR: [{ endDate: null }, { endDate: { gt: targetDate } }],
          },
        },
      });
    }

    const [rawEmployees, totalCount] = await Promise.all([
      prismaClient.employee.findMany({
        where: empWhere,
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
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prismaClient.employee.count({ where: empWhere }),
    ]);

    const items: HrReportDetailItem[] = rawEmployees.map((emp: any) => {
      const primaryOrg = emp.orgAssignments?.[0];
      return {
        assignmentId: `unassigned_${emp.id}`,
        employeeId: emp.id,
        employeeCode: emp.code || "N/A",
        employeeFullName: emp.fullName || "N/A",
        orgUnitId: primaryOrg?.organizationUnitId,
        orgUnitCode: primaryOrg?.organizationUnit?.code,
        orgUnitName: primaryOrg?.organizationUnit?.name || "Chưa phân bổ",
        positionTitle: primaryOrg?.position?.title || "Chưa xếp chức danh",
        projectId: "N/A",
        projectCode: "N/A",
        projectName: "Chưa được điều động",
        projectRoleId: "N/A",
        projectRoleCode: "N/A",
        projectRoleName: "Chưa có vai trò",
        startDate: formatVietnamDateOnly(emp.joinedDate),
        allocationPercentage: 0,
        status: "UNASSIGNED",
        notes: "Nhân sự chưa có điều động công trình hiệu lực",
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
    getHrReportDetailsTable(ctx, scope, filters, 1, 10000, prismaClient),
  ]);

  const workbook = new Workbook.Workbook();
  workbook.creator = "Construction ERP v2 - HR System";
  workbook.created = new Date();

  const HEADER_FILL_COLOR = "1E3A8A"; // Dark Blue

  // ----------------------------------------------------
  // SHEET 1: TỔNG QUAN (Summary & KPIs)
  // ----------------------------------------------------
  const sheet1 = workbook.addWorksheet("Tổng quan", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    views: [{ showGridLines: true }],
  });

  sheet1.mergeCells("A1:D1");
  const titleCell = sheet1.getCell("A1");
  titleCell.value = "BÁO CÁO TỔNG QUAN VÀ CHỈ SỐ KPI NHÂN SỰ CÔNG TRÌNH";
  titleCell.font = { name: "Segoe UI", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
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
  sheet1.getRow(6).values = ["Tên chỉ số KPI", "Giá trị", "Đơn vị tính", "Ghi chú công thức"];
  const kpiHeaderRow = sheet1.getRow(6);
  kpiHeaderRow.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFFFF" } };
  kpiHeaderRow.height = 24;
  kpiHeaderRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2563EB" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const kpiRows = [
    ["Nhân sự tại công trình", kpis.totalOnSite, "Nhân sự", "Đếm số nhân sự duy nhất đang có phân công đang hoạt động"],
    ["Công trình có nhân sự", kpis.activeProjectsStaffed, "Công trình", "Đếm số công trình duy nhất có nhân lực đang cắm"],
    ["Sắp kết thúc trong 30 ngày", kpis.expiringAssignments30d, "Bản ghi", "Ngày dự kiến kết thúc trong vòng 30 ngày tới"],
    ["Nhân sự chưa được điều động", kpis.unassignedEmployees, "Nhân sự", "Nhân sự đang hoạt động có 0 phân công công trình"],
    ["Còn khả năng phân bổ", kpis.availableCapacityEmployees, "Nhân sự", "Tổng phân bổ thời gian dưới 100%"],
    ["Vượt 100% phân bổ", kpis.overallocatedEmployees, "Nhân sự", "Tổng phân bổ thời gian giao thoa vượt 100%"],
    ["Tổng số bản ghi điều động hiệu lực", kpis.totalActiveAssignments, "Bản ghi", "Tổng bản ghi phân công đang hiệu lực"],
    ["Tỷ lệ phân bổ trung bình", kpis.averageAllocation / 100, "Phần trăm", "Trung bình % phân bổ trên các bản ghi điều động"],
  ];

  kpiRows.forEach((row) => {
    const r = sheet1.addRow(row);
    r.font = { name: "Segoe UI", size: 10 };
    r.getCell(2).font = { name: "Segoe UI", size: 11, bold: true };
    if (row[0] === "Tỷ lệ phân bổ trung bình") {
      r.getCell(2).numFmt = "0%";
    }
  });

  sheet1.columns = [
    { width: 42 },
    { width: 18 },
    { width: 18 },
    { width: 60 },
  ];

  // ----------------------------------------------------
  // SHEET 2: CHI TIẾT ĐIỀU ĐỘNG (Staffing Details)
  // ----------------------------------------------------
  const sheet2 = workbook.addWorksheet("Chi tiết điều động", {
    pageSetup: { orientation: "landscape", fitToWidth: 1, printTitlesRow: "1:1" },
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

  if (detailsResult.items.length === 0) {
    sheet2.mergeCells("A2:O2");
    const emptyCell = sheet2.getCell("A2");
    emptyCell.value = "Không có dữ liệu phù hợp với phạm vi và bộ lọc đã chọn.";
    emptyCell.font = { name: "Segoe UI", italic: true, color: { argb: "FF64748B" } };
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet2.getRow(2).height = 30;
  } else {
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
        item.allocationPercentage / 100,
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
  }

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
    pageSetup: { orientation: "landscape", fitToWidth: 1, printTitlesRow: "1:1" },
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

  if (charts.orgUnitDistribution.length === 0) {
    sheet3.mergeCells("A2:E2");
    const emptyCell3 = sheet3.getCell("A2");
    emptyCell3.value = "Không có dữ liệu phù hợp với phạm vi và bộ lọc đã chọn.";
    emptyCell3.font = { name: "Segoe UI", italic: true, color: { argb: "FF64748B" } };
    emptyCell3.alignment = { horizontal: "center", vertical: "middle" };
    sheet3.getRow(2).height = 30;
  } else {
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
  }

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
