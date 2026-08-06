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

  const handleRoleClick = (roleId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("projectRoleId") === roleId) {
      params.delete("projectRoleId");
    } else {
      params.set("projectRoleId", roleId);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const maxOrgCount = Math.max(...charts.orgUnitDistribution.map((o) => o.count), 1);
  const maxProjectCount = Math.max(...charts.projectDistribution.map((p) => p.count), 1);

  return (
    <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Org Unit Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cơ cấu nhân sự theo đơn vị</h3>
                <p className="text-xs text-slate-500">Phòng ban/Đơn vị gốc của nhân viên tại công trường</p>
              </div>
            </div>
            {charts.orgUnitDistribution.length > 0 && (
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {charts.orgUnitDistribution.length} đơn vị
              </span>
            )}
          </div>

          {charts.orgUnitDistribution.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
              <Inbox className="w-6 h-6 text-slate-300" />
              <span>Chưa có dữ liệu điều động phù hợp với bộ lọc.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {charts.orgUnitDistribution.slice(0, 7).map((org) => {
                const widthPct = Math.round((org.count / maxOrgCount) * 100);
                return (
                  <button
                    type="button"
                    key={org.unitId}
                    onClick={() => handleOrgClick(org.unitId)}
                    title={`Lọc theo đơn vị: ${org.unitName}`}
                    className="w-full text-left group hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800 truncate max-w-[220px] sm:max-w-[320px]" title={org.unitName}>
                        {org.unitName} ({org.unitCode})
                      </span>
                      <span className="font-bold text-blue-600 tabular-nums">
                        {org.count} nhân sự ({org.percentage}%)
                      </span>
                    </div>
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

      {/* 2. Project Distribution */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Phân bổ nhân sự theo công trình</h3>
                <p className="text-xs text-slate-500">Số nhân sự đang được phân công tại từng công trình</p>
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
                return (
                  <button
                    type="button"
                    key={proj.projectId}
                    onClick={() => handleProjectClick(proj.projectId)}
                    title={`Lọc theo dự án: ${proj.projectName}`}
                    className="w-full text-left group hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800 truncate max-w-[220px] sm:max-w-[320px]" title={proj.projectName}>
                        {proj.projectName} ({proj.projectCode})
                      </span>
                      <span className="font-bold text-emerald-600 tabular-nums">
                        {proj.count} nhân sự ({proj.totalAllocation}%)
                      </span>
                    </div>
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
        </div>
      </div>

      {/* 3. Status Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Trạng thái bản ghi điều động</h3>
            <p className="text-xs text-slate-500">Đang hiệu lực, Kế hoạch, Đã rút, Hoàn thành</p>
          </div>
        </div>

        {charts.statusBreakdown.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
            <Inbox className="w-6 h-6 text-slate-300" />
            <span>Chưa có dữ liệu điều động phù hợp với bộ lọc.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {charts.statusBreakdown.map((item) => (
              <div key={item.status} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{item.statusLabel}</span>
                <span className="text-base font-extrabold text-slate-900 tabular-nums">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Role Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Cơ cấu theo vai trò công trường</h3>
            <p className="text-xs text-slate-500">Chỉ huy trưởng, Kỹ sư, Giám sát, Kế toán công trình...</p>
          </div>
        </div>

        {charts.roleBreakdown.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
            <Inbox className="w-6 h-6 text-slate-300" />
            <span>Chưa có dữ liệu điều động phù hợp với bộ lọc.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {charts.roleBreakdown.map((role) => (
              <button
                type="button"
                key={role.roleId}
                onClick={() => handleRoleClick(role.roleId)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-xs transition-colors"
              >
                <span className="font-semibold text-slate-800">{role.roleName}</span>
                <span className="font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full text-2xs">
                  {role.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
