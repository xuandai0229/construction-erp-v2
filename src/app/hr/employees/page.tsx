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
import { resolvePermission } from "@/lib/permissions/permission-resolver";

export const dynamic = "force-dynamic";

interface EmployeeListPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    workplace?: string;
    orgUnitId?: string;
    positionId?: string;
    unlinked?: string;
    missingOrg?: string;
    assignmentEndingSoon?: string;
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
          title="Nhân sự"
          description="Tra cứu nhân viên, phòng ban, chức danh và tình trạng bố trí công trình."
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:read" />
      </HrWorkspaceShell>
    );
  }

  const params = await searchParams;
  const q = params.q?.trim() || "";
  const statusFilter = params.status || "";
  const workplaceFilter = params.workplace || "";
  const orgUnitFilter = params.orgUnitId || "";
  const positionFilter = params.positionId || "";
  const unlinkedFilter = params.unlinked === "true";
  const missingOrgFilter = params.missingOrg === "true";
  const assignmentEndingSoonFilter = params.assignmentEndingSoon === "true";

  const allowedSortKeys = ["code", "fullName", "joinedDate", "status", "updatedAt"];
  const sortKey = allowedSortKeys.includes(params.sort || "") ? params.sort! : "joinedDate";
  const sortDirection = params.dir === "asc" ? "asc" : "desc";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const pageSize = 15;

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const activeAssignmentCondition = {
    status: "ACTIVE" as const,
    OR: [{ endDate: null }, { endDate: { gte: now } }],
  };

  const scopeWhere = await buildEmployeeScopeWhereClause(permCheck.context, permCheck.scope);
  const conditions: any[] = [scopeWhere];

  // 1. Status Filter (Default to Current Workforce: ACTIVE + PROBATION unless status=ALL or specific)
  if (statusFilter === "ALL") {
    // Show all employee records (including RESIGNED, RETIRED, SUSPENDED)
  } else if (statusFilter) {
    conditions.push({ status: statusFilter });
  } else {
    conditions.push({ status: { in: ["ACTIVE", "PROBATION"] } });
  }

  // 2. Workplace Filter
  if (workplaceFilter === "site") {
    conditions.push({
      projectAssignments: {
        some: activeAssignmentCondition,
      },
    });
  } else if (workplaceFilter === "unassigned") {
    conditions.push({
      projectAssignments: {
        none: activeAssignmentCondition,
      },
    });
  } else if (workplaceFilter === "overallocated") {
    const overallocatedGroup = await prisma.employeeProjectAssignment.groupBy({
      by: ["employeeId"],
      where: {
        status: "ACTIVE",
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      _sum: { allocationPercentage: true },
      having: { allocationPercentage: { _sum: { gt: 100 } } },
    });
    const overallocatedIds = overallocatedGroup.map((g) => g.employeeId);
    conditions.push({ id: { in: overallocatedIds } });
  }

  // 3. Assignment Ending Soon Filter
  if (assignmentEndingSoonFilter) {
    conditions.push({
      projectAssignments: {
        some: {
          status: "ACTIVE",
          endDate: { gte: now, lte: thirtyDaysLater },
        },
      },
    });
  }

  // 4. Missing Primary Org Filter
  if (missingOrgFilter) {
    conditions.push({
      orgAssignments: {
        none: { isPrimary: true, endDate: null },
      },
    });
  }

  // 5. Unlinked User Filter
  if (unlinkedFilter) {
    conditions.push({ userId: null });
  }

  // 6. Primary Org Unit Filter
  if (orgUnitFilter === "UNASSIGNED") {
    conditions.push({
      orgAssignments: {
        none: { isPrimary: true, endDate: null },
      },
    });
  } else if (orgUnitFilter) {
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

  // 7. Primary Position Filter
  if (positionFilter === "UNASSIGNED") {
    conditions.push({
      OR: [
        {
          orgAssignments: {
            none: { isPrimary: true, endDate: null },
          },
        },
        {
          orgAssignments: {
            some: {
              isPrimary: true,
              endDate: null,
              positionId: null,
            },
          },
        },
      ],
    });
  } else if (positionFilter) {
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

  // 8. Search Filter
  if (q) {
    const searchConditions: any[] = [
      { code: { contains: q, mode: "insensitive" } },
      { fullName: { contains: q, mode: "insensitive" } },
    ];

    if (permCheck.sensitiveFieldPolicy !== "BASIC_ONLY") {
      searchConditions.push({ phoneNumber: { contains: q, mode: "insensitive" } });
      searchConditions.push({ personalEmail: { contains: q, mode: "insensitive" } });
    }

    const isSensitivePerm = await checkHrPermission("hr:employee:read_sensitive");
    if (
      isSensitivePerm.allowed &&
      ["IDENTITY", "FULL"].includes(isSensitivePerm.sensitiveFieldPolicy) &&
      /^\d{9}$|^\d{12}$/.test(q)
    ) {
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
        // Fallback search
      }
    }

    conditions.push({ OR: searchConditions });
  }

  const finalWhere = { AND: conditions };

  // Fetch Master Data & Employee List with project assignments
  const [
    organizationUnits,
    positions,
    totalCount,
    rawEmployees,
    createPermCheck,
    updatePermCheck,
    archivePermCheck,
  ] = await Promise.all([
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            deletedAt: true,
            mustChangePassword: true,
          },
        },
        orgAssignments: {
          where: { endDate: null },
          include: {
            organizationUnit: { select: { id: true, name: true, code: true } },
            position: { select: { id: true, title: true, code: true } },
          },
        },
        projectAssignments: {
          where: {
            status: "ACTIVE",
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
          include: {
            project: { select: { id: true, name: true, code: true } },
            projectPersonnelRole: { select: { code: true, name: true } },
          },
        },
      },
    }),
    checkHrPermission("hr:employee:create"),
    checkHrPermission("hr:employee:update"),
    checkHrPermission("hr:employee:delete"),
  ]);

  const employees = rawEmployees.map((emp) =>
    projectEmployeeForList(emp, permCheck.sensitiveFieldPolicy)
  );
  const [createUserPermission, assignSystemRolePermission, assignProjectRolePermission] = await Promise.all([
    resolvePermission(permCheck.context.session, "users.create"),
    resolvePermission(permCheck.context.session, "users.assign_system_role"),
    resolvePermission(permCheck.context.session, "users.assign_project_role"),
  ]);
  const canManageAccounts = createUserPermission.allowed
    && assignSystemRolePermission.allowed
    && assignProjectRolePermission.allowed;

  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) queryParams.set(key, value);
  }
  const searchQuery = queryParams.toString();

  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Nhân sự"
        description="Tra cứu nhân viên, phòng ban, chức danh và tình trạng bố trí công trình."
      />

      <HrWorkspaceTabs
        rightContent={
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

      <EmployeeListFilters organizationUnits={organizationUnits} positions={positions} />

      <EmployeeDataTable
        employees={employees}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        canUpdate={updatePermCheck.allowed}
        canArchive={archivePermCheck.allowed}
        canCreate={createPermCheck.allowed}
        canManageAccounts={canManageAccounts}
        searchQuery={searchQuery}
      />
    </HrWorkspaceShell>
  );
}
