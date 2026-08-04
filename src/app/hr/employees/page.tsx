import React from "react";
import Link from "next/link";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { EmployeeListFilters } from "@/components/hr/employee-list-filters";
import { EmployeeDataTable } from "@/components/hr/employee-data-table";
import { checkHrPermission, buildEmployeeScopeWhereClause } from "@/lib/hr/hr-auth-guard";
import { projectEmployeeForList } from "@/lib/hr/hr-projection";
import { generateIdentityBlindIndex, normalizeIdentityNumber } from "@/lib/hr/pii-encryption";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

interface EmployeeListPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    orgUnitId?: string;
    positionId?: string;
    unlinked?: string;
    missingOrg?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}

export default async function EmployeeListPage({ searchParams }: EmployeeListPageProps) {
  const permCheck = await checkHrPermission("hr:employee:read");
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Hồ sơ nhân viên"
          description="Quản lý danh sách nhân sự, phân công phòng ban và thông tin liên kết hệ thống"
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:read" />
      </HrWorkspaceShell>
    );
  }

  const params = await searchParams;
  const q = params.q?.trim() || "";
  const statusFilter = params.status || "";
  const orgUnitFilter = params.orgUnitId || "";
  const positionFilter = params.positionId || "";
  const unlinkedFilter = params.unlinked === "true";
  const missingOrgFilter = params.missingOrg === "true";
  const sortKey = ["code", "fullName", "joinedDate", "status", "updatedAt"].includes(params.sort || "") ? params.sort! : "createdAt";
  const sortDirection = params.dir === "asc" ? "asc" : "desc";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const pageSize = 15;

  const scopeWhere = await buildEmployeeScopeWhereClause(permCheck.context, permCheck.scope);

  // Build filters
  const conditions: any[] = [scopeWhere];

  if (statusFilter) {
    conditions.push({ status: statusFilter });
  }

  if (unlinkedFilter) {
    conditions.push({ userId: null });
  }

  if (missingOrgFilter) {
    conditions.push({
      orgAssignments: {
        none: { isPrimary: true, endDate: null },
      },
    });
  }

  if (orgUnitFilter) {
    conditions.push({
      orgAssignments: {
        some: {
          organizationUnitId: orgUnitFilter,
          isPrimary: true,
          endDate: null,
        },
      },
    });
  }

  if (positionFilter) {
    conditions.push({
      orgAssignments: {
        some: {
          positionId: positionFilter,
          isPrimary: true,
          endDate: null,
        },
      },
    });
  }

  // Search logic
  if (q) {
    const searchConditions: any[] = [
      { code: { contains: q, mode: "insensitive" } },
      { fullName: { contains: q, mode: "insensitive" } },
    ];

    // If policy allows contact, search phone & email
    if (permCheck.sensitiveFieldPolicy !== "BASIC_ONLY") {
      searchConditions.push({ phoneNumber: { contains: q, mode: "insensitive" } });
      searchConditions.push({ personalEmail: { contains: q, mode: "insensitive" } });
    }

    // Exact identity blind index lookup if user has read_sensitive permission and query looks like identity number
    const isSensitivePerm = await checkHrPermission("hr:employee:read_sensitive");
    if (isSensitivePerm.allowed && ["IDENTITY", "FULL"].includes(isSensitivePerm.sensitiveFieldPolicy) && /^\d{9}$|^\d{12}$/.test(q)) {
      try {
        const normalized = normalizeIdentityNumber(q);
        const blindIndex = generateIdentityBlindIndex(normalized);
        searchConditions.push({ identityNumberBlindIndex: blindIndex });
        await writeAuditLog({
          userId: permCheck.context.session.id,
          action: "SEARCH_SENSITIVE_IDENTITY_NUMBER",
          entityType: "Employee",
          entityId: "SEARCH",
          afterData: { queryType: "EXACT_BLIND_INDEX" },
        });
      } catch {
        // Invalid identity input remains a normal name/code search.
      }
    }

    conditions.push({ OR: searchConditions });
  }

  const finalWhere = { AND: conditions };

  // Fetch Master Data & Employee List
  const [organizationUnits, positions, totalCount, rawEmployees, createPermCheck, updatePermCheck, archivePermCheck] = await Promise.all([
    prisma.organizationUnit.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({
      where: { isActive: true },
      select: { id: true, title: true, code: true },
      orderBy: { level: "desc" },
    }),
    prisma.employee.count({ where: finalWhere }),
    prisma.employee.findMany({
      where: finalWhere,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortKey]: sortDirection },
      include: {
        user: { select: { id: true, name: true, email: true } },
        orgAssignments: {
          where: { endDate: null },
          include: {
            organizationUnit: { select: { id: true, name: true, code: true } },
            position: { select: { id: true, title: true, code: true } },
          },
        },
      },
    }),
    checkHrPermission("hr:employee:create"),
    checkHrPermission("hr:employee:update"),
    checkHrPermission("hr:employee:delete"),
  ]);

  const employees = rawEmployees.map((emp) => projectEmployeeForList(emp, permCheck.sensitiveFieldPolicy));
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) queryParams.set(key, value);
  }
  const searchQuery = queryParams.toString();

  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Hồ sơ nhân viên"
        description="Quản lý danh sách nhân sự, phân công phòng ban và thông tin liên kết hệ thống"
        action={
          createPermCheck.allowed ? (
            <Link
              href="/hr/employees/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm nhân viên mới</span>
            </Link>
          ) : undefined
        }
      />

      <HrWorkspaceTabs />

      <EmployeeListFilters organizationUnits={organizationUnits} positions={positions} />

      <EmployeeDataTable
        employees={employees}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        canUpdate={updatePermCheck.allowed}
        canArchive={archivePermCheck.allowed}
        canCreate={createPermCheck.allowed}
        searchQuery={searchQuery}
      />
    </HrWorkspaceShell>
  );
}
