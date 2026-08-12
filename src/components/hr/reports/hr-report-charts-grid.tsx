"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { HrChartData } from "@/lib/hr/reporting-service";
import { PieChart, BarChart2, Building, ShieldCheck, Inbox } from "lucide-react";

interface HrReportChartsGridProps {
  charts: HrChartData;
}

export function HrReportChartsGrid({ charts }: HrReportChartsGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeKpiFilter = searchParams.get("kpiFilter") || "";

  const handleOrgClick = (unitId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("orgUnitId") === unitId) {
      params.delete("orgUnitId");
    } else {
      params.set("orgUnitId", unitId);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleProjectClick = (projectId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("projectId") === projectId) {
      params.delete("projectId");
    } else {
      params.set("projectId", projectId);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRoleClick = (role: { roleId: string; roleName: string }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (activeKpiFilter === "unassigned") {
      // For unassigned employees, the breakdown represents position titles (role.roleId is positionId)
      if (params.get("positionId") === role.roleId) {
        params.delete("positionId");
      } else {
        params.set("positionId", role.roleId);
      }
    } else {
      // For current assignments, role represents project personnel role.
      if (params.get("projectRoleId") === role.roleId) {
        params.delete("projectRoleId");
      } else {
        params.set("projectRoleId", role.roleId);
      }
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const maxOrgCount = Math.max(...charts.orgUnitDistribution.map((o) => o.count), 1);
  const maxProjectCount = Math.max(...charts.projectDistribution.map((p) => p.count), 1);

  return (
    <div className="mb-6 space-y-6">
      {/* 1. Primary Analytics Grid (2 Main Charts Side-by-Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Project Allocation Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Phân bổ nhân sự theo công trình</h3>
                  <p className="text-xs text-slate-500">Số lượng nhân sự và tỷ lệ phân bổ thời gian trung bình/người</p>
                </div>
              </div>
              {charts.projectDistribution.length > 0 && (
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {charts.projectDistribution.length} dự án
                </span>
              )}
            </div>

            {charts.projectDistribution.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
                <Inbox className="w-6 h-6 text-slate-300" />
                <span>Chưa có dữ liệu điều động phù hợp với bộ lọc.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {charts.projectDistribution.slice(0, 7).map((proj) => {
                  const widthPct = Math.round((proj.count / maxProjectCount) * 100);
                  const activeProjId = searchParams.get("projectId");
                  const isSelected = activeProjId === proj.projectId;
                  return (
                    <button
                      type="button"
                      key={proj.projectId}
                      onClick={() => handleProjectClick(proj.projectId)}
                      title={`Lọc theo dự án: ${proj.projectName}`}
                      className={`w-full text-left group p-2 rounded-lg transition-colors border ${
                        isSelected ? "bg-emerald-50 border-emerald-300" : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 text-xs mb-1">
                        <span className="min-w-0 flex-1 font-semibold leading-snug text-slate-800 line-clamp-2" title={proj.projectName}>
                          {proj.projectName}
                        </span>
                        <span className="shrink-0 font-bold text-emerald-700 tabular-nums">
                          {proj.count} nhân sự · TB {proj.averageAllocation}% phân bổ
                        </span>
                      </div>
                      {proj.projectCode !== "N/A" && <div className="mb-1 font-mono text-[10px] text-slate-500">Mã: {proj.projectCode}</div>}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-300 group-hover:bg-emerald-700"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-2xs text-slate-400 italic border-t border-slate-50 pt-2">
              * Một nhân sự có thể tham gia nhiều công trình, do đó tổng số theo từng công trình có thể lớn hơn tổng nhân sự thực tế.
            </p>
          </div>
        </div>

        {/* Chart 2: Org Unit Distribution (Distinct Employees) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cơ cấu nhân sự theo đơn vị</h3>
                  <p className="text-xs text-slate-500">Phòng ban/Đơn vị gốc của nhân sự (không trùng lặp)</p>
                </div>
              </div>
              {charts.orgUnitDistribution.length > 0 && (
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {charts.orgUnitDistribution.length} nhóm phòng ban
                </span>
              )}
            </div>

            {charts.orgUnitDistribution.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
                <Inbox className="w-6 h-6 text-slate-300" />
                <span>Chưa có dữ liệu phù hợp với bộ lọc.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {charts.orgUnitDistribution.slice(0, 7).map((org) => {
                  const widthPct = Math.round((org.count / maxOrgCount) * 100);
                  const activeOrgId = searchParams.get("orgUnitId");
                  const isSelected = activeOrgId === org.unitId;
                  return (
                    <button
                      type="button"
                      key={org.unitId}
                      onClick={() => handleOrgClick(org.unitId)}
                      title={`Lọc theo đơn vị: ${org.unitName}`}
                      className={`w-full text-left group p-2 rounded-lg transition-colors border ${
                        isSelected ? "bg-blue-50 border-blue-300" : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 text-xs mb-1">
                        <span className="min-w-0 flex-1 font-semibold leading-snug text-slate-800 line-clamp-2" title={org.unitName}>
                          {org.unitName}
                        </span>
                        <span className="shrink-0 font-bold text-blue-600 tabular-nums">
                          {org.count} nhân sự ({org.percentage}%)
                        </span>
                      </div>
                      {org.unitCode !== "N/A" && <div className="mb-1 font-mono text-[10px] text-slate-500">Mã: {org.unitCode}</div>}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300 group-hover:bg-blue-700"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Secondary Compact Analytics (Status & Roles) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <PieChart className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Trạng thái bản ghi điều động</h3>
              <p className="text-2xs text-slate-500">Phân bố theo trạng thái quyết định phân công</p>
            </div>
          </div>

          {charts.statusBreakdown.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500">Chưa có dữ liệu.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {charts.statusBreakdown.map((item) => (
                <div key={item.status} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{item.statusLabel}</span>
                  <span className="text-sm font-extrabold text-slate-900 tabular-nums">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Role / Position Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                {activeKpiFilter === "unassigned"
                  ? "Cơ cấu chức danh nhân sự chưa điều động"
                  : "Cơ cấu theo vai trò công trường"}
              </h3>
              <p className="text-2xs text-slate-500">
                {activeKpiFilter === "unassigned"
                  ? "Chức danh phòng ban của các nhân sự chưa có dự án"
                  : "Chỉ huy trưởng, Kỹ sư hiện trường, Giám sát..."}
              </p>
            </div>
          </div>

          {charts.roleBreakdown.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500">Chưa có dữ liệu.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {charts.roleBreakdown.map((role) => (
                <button
                  type="button"
                  key={role.roleId}
                  onClick={() => handleRoleClick(role)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-xs transition-colors"
                >
                  <span className="font-semibold text-slate-800">{role.roleName}</span>
                  <span className="font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded-full text-2xs">
                    {role.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
