import React, { Suspense } from "react";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { OrganizationSubTabs } from "@/components/hr/organization-sub-tabs";
import { OrganizationTreeView, OrgTreeNode } from "@/components/hr/organization-tree-view";
import { PositionManagementClient, PositionItem } from "@/components/hr/position-management-client";
import { OrgChartView } from "@/components/hr/org-chart-view";
import { checkHrPermission } from "@/lib/hr/hr-auth-guard";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

interface OrganizationPageProps {
  searchParams: Promise<{ tab?: string; create?: string }>;
}

export default async function OrganizationPage(props: OrganizationPageProps) {
  const searchParams = await props.searchParams;
  const activeTab = searchParams.tab || "units";

  const permCheck = await checkHrPermission("hr:employee:read");
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Phòng ban & Chức danh"
          description="Quản lý cơ cấu phòng ban, danh mục chức danh và sơ đồ tổ chức"
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:read" />
      </HrWorkspaceShell>
    );
  }

  const managePerm = await checkHrPermission("hr:organization:manage");

  if (activeTab === "positions") {
    const rawPositions = await prisma.position.findMany({
      orderBy: [{ code: "asc" }],
      include: {
        employeeAssignments: {
          where: {
            endDate: null,
            isPrimary: true,
            employee: { status: { in: ["ACTIVE", "PROBATION"] } },
          },
          select: { id: true },
        },
      },
    });

    const positions: PositionItem[] = rawPositions.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.description,
      level: p.level,
      isActive: p.isActive,
      activeEmployeeCount: p.employeeAssignments.length,
    }));

    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Phòng ban & Chức danh"
          description="Quản lý hệ thống chức danh và định mức nhân sự chuyên môn trong công ty"
          action={
            managePerm.allowed ? (
              <Link
                href="/hr/organization?tab=positions&create=1"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm chức danh mới</span>
              </Link>
            ) : undefined
          }
        />
        <HrWorkspaceTabs />
        <Suspense fallback={<div className="p-4 text-sm text-slate-500">Đang tải...</div>}>
          <OrganizationSubTabs />
        </Suspense>
        <PositionManagementClient positions={positions} canManage={managePerm.allowed} />
      </HrWorkspaceShell>
    );
  }

  // Fetch organization units for "units" or "chart" tab
  const units = await prisma.organizationUnit.findMany({
    where: { isActive: true },
    orderBy: [{ orderIndex: "asc" }, { code: "asc" }],
    include: {
      managerAssignments: {
        where: { endDate: null, isPrimary: true },
        include: {
          employee: { select: { id: true, fullName: true, code: true } },
        },
        take: 1,
      },
      employeeAssignments: {
        where: {
          endDate: null,
          isPrimary: true,
          employee: { status: { in: ["ACTIVE", "PROBATION"] } },
        },
        select: { id: true },
      },
    },
  });

  const flatUnits = units.map((u) => ({
    id: u.id,
    code: u.code,
    name: u.name,
    parentId: u.parentId,
  }));

  const unitMap = new Map<string, OrgTreeNode>();
  units.forEach((u) => {
    const mgr = u.managerAssignments[0];
    unitMap.set(u.id, {
      id: u.id,
      code: u.code,
      name: u.name,
      parentId: u.parentId,
      description: u.description,
      orderIndex: u.orderIndex,
      isActive: u.isActive,
      activeEmployeeCount: u.employeeAssignments.length,
      manager: mgr
        ? {
            id: mgr.id,
            employeeId: mgr.employeeId,
            fullName: mgr.employee.fullName,
            employeeCode: mgr.employee.code,
            startDate: mgr.startDate.toISOString(),
          }
        : null,
      children: [],
    });
  });

  const rootNodes: OrgTreeNode[] = [];
  unitMap.forEach((node) => {
    if (node.parentId && unitMap.has(node.parentId)) {
      unitMap.get(node.parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  if (activeTab === "chart") {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Phòng ban & Chức danh"
          description="Biểu diễn sơ đồ tháp phân cấp công ty, người phụ trách và quy mô nhân sự trực thuộc"
        />
        <HrWorkspaceTabs />
        <Suspense fallback={<div className="p-4 text-sm text-slate-500">Đang tải...</div>}>
          <OrganizationSubTabs />
        </Suspense>
        <OrgChartView treeData={rootNodes} />
      </HrWorkspaceShell>
    );
  }

  // Default: "units" tab
  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Phòng ban & Chức danh"
        description="Quản lý cây phòng ban nhiều cấp, chức năng nhiệm vụ và người phụ trách đơn vị"
        action={
          managePerm.allowed ? (
            <Link
              href="/hr/organization?tab=units&create=1"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm phòng ban / đơn vị</span>
            </Link>
          ) : undefined
        }
      />
      <HrWorkspaceTabs />
      <Suspense fallback={<div className="p-4 text-sm text-slate-500">Đang tải...</div>}>
        <OrganizationSubTabs />
      </Suspense>
      <OrganizationTreeView
        treeData={rootNodes}
        flatUnits={flatUnits}
        canManage={managePerm.allowed}
      />
    </HrWorkspaceShell>
  );
}
