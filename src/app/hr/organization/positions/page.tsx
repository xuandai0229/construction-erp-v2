import React from "react";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { OrganizationSubTabs } from "@/components/hr/organization-sub-tabs";
import { PositionManagementClient, PositionItem } from "@/components/hr/position-management-client";
import { checkHrPermission } from "@/lib/hr/hr-auth-guard";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrganizationPositionsPage() {
  const permCheck = await checkHrPermission("hr:employee:read");
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Danh mục chức danh"
          description="Quản lý hệ thống chức danh, cấp bậc và định mức vị trí công việc"
        />

        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:read" />
      </HrWorkspaceShell>
    );
  }

  const managePerm = await checkHrPermission("hr:organization:manage");

  const rawPositions = await prisma.position.findMany({
    orderBy: [{ level: "asc" }, { code: "asc" }],
    include: {
      employeeAssignments: {
        where: { endDate: null },
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
        title="Danh mục chức danh"
        description="Quản lý hệ thống chức danh, cấp bậc và định mức vị trí công việc trong doanh nghiệp"
        action={
          managePerm.allowed ? (
            <Link href="/hr/organization/positions?create=1" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              <span>Thêm chức danh mới</span>
            </Link>
          ) : undefined
        }
      />


      <HrWorkspaceTabs />
      <OrganizationSubTabs />

      <PositionManagementClient positions={positions} canManage={managePerm.allowed} />
    </HrWorkspaceShell>
  );
}
