import React from "react";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { OrganizationSubTabs } from "@/components/hr/organization-sub-tabs";
import { OrganizationTreeView, OrgTreeNode } from "@/components/hr/organization-tree-view";
import { checkHrPermission } from "@/lib/hr/hr-auth-guard";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrganizationPage() {
  const permCheck = await checkHrPermission("hr:employee:read");
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Cơ cấu tổ chức"
          description="Quản lý sơ đồ bộ máy tổ chức, phòng ban, chức danh và người quản lý"
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:read" />
      </HrWorkspaceShell>
    );
  }

  const managePerm = await checkHrPermission("hr:organization:manage");

  // Fetch all organization units with managers and employee counts
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
        where: { endDate: null },
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

  // Build recursive tree
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

  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Cơ cấu tổ chức và phòng ban"
        description="Quản lý cây phòng ban nhiều cấp, chức năng nhiệm vụ và người phụ trách đơn vị"
      />

      <HrWorkspaceTabs />
      <OrganizationSubTabs />

      <OrganizationTreeView
        treeData={rootNodes}
        flatUnits={flatUnits}
        canManage={managePerm.allowed}
      />
    </HrWorkspaceShell>
  );
}
