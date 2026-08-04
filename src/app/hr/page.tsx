import React from "react";
import Link from "next/link";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { checkHrPermission, buildEmployeeScopeWhereClause } from "@/lib/hr/hr-auth-guard";
import prisma from "@/lib/prisma";
import {
  Users,
  UserCheck,
  Clock3,
  UserX,
  UserMinus,
  Link2Off,
  Building2,
  AlertTriangle,
  ArrowRight,
  Plus,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HrDashboardPage() {
  const permCheck = await checkHrPermission("hr:employee:read");
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Tổng quan nhân sự"
          description="Báo cáo số liệu và cảnh báo hồ sơ nhân viên thời gian thực"
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:read" />
      </HrWorkspaceShell>
    );
  }

  const scopeWhere = await buildEmployeeScopeWhereClause(permCheck.context, permCheck.scope);

  // Real Database Queries
  const [
    totalEmployees,
    activeCount,
    probationCount,
    suspendedCount,
    resignedCount,
    unlinkedCount,
    missingOrgCount,
    createPermCheck,
  ] = await Promise.all([
    prisma.employee.count({ where: scopeWhere }),
    prisma.employee.count({ where: { AND: [scopeWhere, { status: "ACTIVE" }] } }),
    prisma.employee.count({ where: { AND: [scopeWhere, { status: "PROBATION" }] } }),
    prisma.employee.count({ where: { AND: [scopeWhere, { status: "SUSPENDED" }] } }),
    prisma.employee.count({ where: { AND: [scopeWhere, { OR: [{ status: "RESIGNED" }, { status: "RETIRED" }] }] } }),
    prisma.employee.count({ where: { AND: [scopeWhere, { userId: null }] } }),
    prisma.employee.count({
      where: {
        AND: [
          scopeWhere,
          {
            orgAssignments: {
              none: { isPrimary: true, endDate: null },
            },
          },
        ],
      },
    }),
    checkHrPermission("hr:employee:create"),
  ]);

  const statCards = [
    {
      title: "Tổng nhân viên",
      count: totalEmployees,
      href: "/hr/employees",
      icon: Users,
      color: "border-blue-500 text-blue-600 bg-blue-50",
    },
    {
      title: "Đang làm việc",
      count: activeCount,
      href: "/hr/employees?status=ACTIVE",
      icon: UserCheck,
      color: "border-emerald-500 text-emerald-600 bg-emerald-50",
    },
    {
      title: "Đang thử việc",
      count: probationCount,
      href: "/hr/employees?status=PROBATION",
      icon: Clock3,
      color: "border-amber-500 text-amber-600 bg-amber-50",
    },
    {
      title: "Tạm ngừng làm việc",
      count: suspendedCount,
      href: "/hr/employees?status=SUSPENDED",
      icon: UserMinus,
      color: "border-orange-500 text-orange-600 bg-orange-50",
    },
    {
      title: "Đã nghỉ việc / Nghỉ hưu",
      count: resignedCount,
      href: "/hr/employees?status=RESIGNED",
      icon: UserX,
      color: "border-slate-400 text-slate-600 bg-slate-100",
    },
  ];

  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Tổng quan nhân sự"
        description="Báo cáo số liệu và cảnh báo hồ sơ nhân viên thời gian thực"
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

      {/* Real Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group flex min-h-32 min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-blue-400 hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
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
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 transition-transform group-hover:translate-x-1">
                Chi tiết <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Data Gap Alerts Section */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-bold text-slate-900">
            Cảnh báo dữ liệu hồ sơ chưa hoàn thiện
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/hr/employees?unlinked=true"
            className="flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 sm:gap-4"
          >
            <div className="shrink-0 rounded-lg bg-amber-50 p-3 text-amber-600">
              <Link2Off className="w-5 h-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 break-words text-sm font-semibold leading-5 text-slate-900">
                  Chưa liên kết tài khoản hệ thống
                </h3>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                  {unlinkedCount}
                </span>
              </div>
              <p className="text-xs leading-5 text-slate-600">
                Nhân viên chưa được liên kết với tài khoản hệ thống để phân quyền thao tác.
              </p>
            </div>
          </Link>

          <Link
            href="/hr/employees?missingOrg=true"
            className="flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 sm:gap-4"
          >
            <div className="shrink-0 rounded-lg bg-orange-50 p-3 text-orange-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 break-words text-sm font-semibold leading-5 text-slate-900">
                  Chưa phân công phòng ban chính
                </h3>
                <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">
                  {missingOrgCount}
                </span>
              </div>
              <p className="text-xs leading-5 text-slate-600">
                Hồ sơ chưa có phân công phòng ban chính đang hiệu lực.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </HrWorkspaceShell>
  );
}
