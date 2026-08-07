import React from "react";
import Link from "next/link";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { checkHrPermission, buildEmployeeScopeWhereClause } from "@/lib/hr/hr-auth-guard";
import prisma from "@/lib/prisma";
import { EmployeeStatus } from "@prisma/client";
import {
  Users,
  Building2,
  AlertTriangle,
  Plus,
  UserCheck2,
  HardHat,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HrDashboardPage() {
  const permCheck = await checkHrPermission("hr:employee:read");
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Tổng quan nhân sự"
          description="Theo dõi nhân sự toàn công ty, tình hình bố trí công trình và các việc cần chú ý."
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:read" />
      </HrWorkspaceShell>
    );
  }

  const scopeWhere = await buildEmployeeScopeWhereClause(permCheck.context, permCheck.scope);
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // CURRENT_WORKFORCE definition: ACTIVE + PROBATION (Resigned and Retired excluded)
  const workforceWhere = {
    AND: [
      scopeWhere,
      { status: { in: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION] } },
    ],
  };

  // Active Project Assignment condition
  const activeAssignmentCondition = {
    status: "ACTIVE" as const,
    OR: [{ endDate: null }, { endDate: { gte: now } }],
  };

  // Real Database Queries
  const [
    totalWorkforce,
    siteCount,
    unassignedCount,
    missingOrgCount,
    assignmentsEndingSoonCount,
    activeAssignmentsGrouped,
    createPermCheck,
  ] = await Promise.all([
    prisma.employee.count({ where: workforceWhere }),
    prisma.employee.count({
      where: {
        AND: [
          workforceWhere,
          { projectAssignments: { some: activeAssignmentCondition } },
        ],
      },
    }),
    prisma.employee.count({
      where: {
        AND: [
          workforceWhere,
          { projectAssignments: { none: activeAssignmentCondition } },
        ],
      },
    }),
    prisma.employee.count({
      where: {
        AND: [
          workforceWhere,
          {
            orgAssignments: {
              none: { isPrimary: true, endDate: null },
            },
          },
        ],
      },
    }),
    prisma.employeeProjectAssignment.count({
      where: {
        status: "ACTIVE",
        endDate: { gte: now, lte: thirtyDaysLater },
        employee: scopeWhere,
      },
    }),
    prisma.employeeProjectAssignment.groupBy({
      by: ["employeeId"],
      where: {
        status: "ACTIVE",
        OR: [{ endDate: null }, { endDate: { gte: now } }],
        employee: workforceWhere,
      },
      _sum: {
        allocationPercentage: true,
      },
      having: {
        allocationPercentage: {
          _sum: {
            gt: 100,
          },
        },
      },
    }),
    checkHrPermission("hr:employee:create"),
  ]);

  const overallocatedCount = activeAssignmentsGrouped.length;

  const statCards = [
    {
      title: "Nhân sự hiện tại",
      count: totalWorkforce,
      href: "/hr/employees",
      icon: Users,
      color: "border-blue-500 text-blue-600 bg-blue-50",
    },
    {
      title: "Đang ở công trình",
      count: siteCount,
      href: "/hr/employees?workplace=site",
      icon: HardHat,
      color: "border-amber-500 text-amber-600 bg-amber-50",
    },
    {
      title: "Chưa bố trí công trình",
      count: unassignedCount,
      href: "/hr/employees?workplace=unassigned",
      icon: UserCheck2,
      color: "border-purple-500 text-purple-600 bg-purple-50",
    },
    {
      title: "Quá tải",
      count: overallocatedCount,
      href: "/hr/employees?workplace=overallocated",
      icon: AlertTriangle,
      color: overallocatedCount > 0 ? "border-rose-500 text-rose-600 bg-rose-50" : "border-slate-300 text-slate-500 bg-slate-50",
      sublabel: "Phân bổ trên 100%",
    },
  ];

  // Active Attention Required Alerts (Filter count > 0)
  const alerts = [];

  if (assignmentsEndingSoonCount > 0) {
    alerts.push({
      key: "endingSoon",
      title: `${assignmentsEndingSoonCount} điều động sắp kết thúc (30 ngày)`,
      count: assignmentsEndingSoonCount,
      href: "/hr/employees?assignmentEndingSoon=true",
      icon: Clock,
      iconBg: "bg-amber-100 text-amber-700",
      badgeBg: "bg-amber-100 text-amber-800",
      hoverBorder: "hover:border-amber-400",
      description: "Các nhân sự có thời hạn điều động tại công trình sắp hết hạn trong 30 ngày tới.",
    });
  }

  if (overallocatedCount > 0) {
    alerts.push({
      key: "overallocated",
      title: `${overallocatedCount} nhân sự quá tải phân bổ`,
      count: overallocatedCount,
      href: "/hr/employees?workplace=overallocated",
      icon: AlertTriangle,
      iconBg: "bg-rose-100 text-rose-700",
      badgeBg: "bg-rose-100 text-rose-800",
      hoverBorder: "hover:border-rose-400",
      description: "Nhân viên đang tham gia nhiều công trình với tổng tỷ lệ phân bổ vượt quá 100%.",
    });
  }

  if (missingOrgCount > 0) {
    alerts.push({
      key: "missingOrg",
      title: `${missingOrgCount} chưa phân công phòng ban chính`,
      count: missingOrgCount,
      href: "/hr/employees?missingOrg=true",
      icon: Building2,
      iconBg: "bg-purple-100 text-purple-700",
      badgeBg: "bg-purple-100 text-purple-800",
      hoverBorder: "hover:border-purple-400",
      description: "Hồ sơ nhân viên chưa được xếp vào phòng ban / đơn vị trực thuộc chính nào.",
    });
  }

  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Tổng quan nhân sự"
        description="Theo dõi nhân sự toàn công ty, tình hình bố trí công trình và các việc cần chú ý."
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

      {/* 4 Core Workforce Resource Management KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            aria-label={`${card.title}: ${card.count}`}
            className="group flex min-h-28 min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-blue-400 hover:shadow-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="min-w-0 pr-2 text-xs font-semibold leading-5 text-slate-600">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg border ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-3xl font-extrabold tabular-nums text-slate-900">
                {card.count}
              </span>
              {card.sublabel && (
                <span className="text-[11px] font-medium text-slate-400">
                  {card.sublabel}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Block "CẦN CHÚ Ý" (DYNAMIC AUTO HEIGHT - NO FIXED MIN HEIGHT) */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
          <h2 className="text-sm font-bold text-slate-900">Cần chú ý</h2>
        </div>

        {alerts.length > 0 ? (
          <div className={`grid gap-3 ${alerts.length === 1 ? "grid-cols-1" : alerts.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
            {alerts.map((alert) => (
              <Link
                key={alert.key}
                href={alert.href}
                className={`group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all ${alert.hoverBorder} hover:shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 space-y-2`}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 rounded-lg p-2 ${alert.iconBg}`}>
                    <alert.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">
                      {alert.title}
                    </h3>
                    <p className="text-2xs text-slate-500 leading-normal">
                      {alert.description}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-1 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    <span>Xem danh sách</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Hiện không có vấn đề nhân sự cần xử lý.</span>
          </div>
        )}
      </div>
    </HrWorkspaceShell>
  );
}
