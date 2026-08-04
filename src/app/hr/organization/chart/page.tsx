import React from "react";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { OrganizationSubTabs } from "@/components/hr/organization-sub-tabs";
import { OrgChartView } from "@/components/hr/org-chart-view";
import { OrgTreeNode } from "@/components/hr/organization-tree-view";
import { checkHrPermission } from "@/lib/hr/hr-auth-guard";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrganizationChartPage() {
  const permCheck = await checkHrPermission("hr:employee:read");
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Sơ đồ cây tổ chức"
          description="Hiển thị sơ đồ phân cấp trực quan toàn bộ bộ máy công ty"
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:read" />
      </HrWorkspaceShell>
    );
  }

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
        title="Sơ đồ cây tổ chức trực quan"
        description="Biểu diễn sơ đồ cây phân cấp công ty, người phụ trách và quy mô nhân sự trực thuộc"
      />

      <HrWorkspaceTabs />
      <OrganizationSubTabs />

      <OrgChartView treeData={rootNodes} />
    </HrWorkspaceShell>
  );
}
