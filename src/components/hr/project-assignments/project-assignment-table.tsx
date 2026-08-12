"use client";

import React, { useState } from "react";
import {
  MoreHorizontal,
  Eye,
  RefreshCw,
  Calendar,
  LogOut,
  Ban,
  Layers,
  Plus,
} from "lucide-react";
import { ProjectAssignmentDTO } from "@/lib/hr/project-assignment-dto";
import { formatDisplayDate } from "@/lib/hr/vietnam-date-helper";
import { AssignmentStatusBadge } from "./assignment-status-badge";
import { AssignmentUserCapabilities } from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { UnifiedActionMenu } from "@/components/ui/unified-action-menu";
import { ProjectName } from "@/components/project/project-name";

interface ProjectAssignmentTableProps {
  assignments: ProjectAssignmentDTO[];
  capabilities: AssignmentUserCapabilities;
  onViewDetails: (item: ProjectAssignmentDTO) => void;
  onTransfer: (item: ProjectAssignmentDTO) => void;
  onExtend: (item: ProjectAssignmentDTO) => void;
  onRelease: (item: ProjectAssignmentDTO) => void;
  onCancel: (item: ProjectAssignmentDTO) => void;
  isLoading?: boolean;
  hasFilters?: boolean;
  onCreateClick?: () => void;
}

export function ProjectAssignmentTable({
  assignments,
  capabilities,
  onViewDetails,
  onTransfer,
  onExtend,
  onRelease,
  onCancel,
  isLoading,
  hasFilters,
  onCreateClick,
}: ProjectAssignmentTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500 space-y-3">
        <div className="inline-block animate-spin border-2 border-blue-600 border-t-transparent rounded-full w-6 h-6" />
        <p>Đang nạp danh sách điều động nhân sự...</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-10 text-center text-sm space-y-3 shadow-xs">
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <Layers className="w-5 h-5" />
        </div>
        <p className="font-bold text-slate-800 text-sm">Chưa có điều động phù hợp</p>
        <p className="text-slate-500 max-w-sm mx-auto">
          {hasFilters
            ? "Thử thay đổi từ khóa hoặc xóa bớt bộ lọc."
            : "Chưa có nhân sự nào được điều động đến công trình."}
        </p>
        {!hasFilters && capabilities.canCreate && onCreateClick && (
          <div className="pt-2">
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo điều động đầu tiên</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Desktop View Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-xs">
              <th className="py-3 px-4 min-w-[180px]">Nhân sự</th>
              <th className="py-3 px-4 min-w-[140px]">Đơn vị nguồn</th>
              <th className="py-3 px-4 min-w-[180px]">Công trình / Dự án</th>
              <th className="py-3 px-4 min-w-[140px]">Vai trò</th>
              <th className="py-3 px-4 min-w-[90px] text-center">Tỷ lệ</th>
              <th className="py-3 px-4 min-w-[150px]">Thời gian</th>
              <th className="py-3 px-4 min-w-[120px]">Trạng thái</th>
              <th className="py-3 px-4 w-[60px] text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {assignments.map((item) => {
              const isFuturePlanned = item.status === "ACTIVE" && item.startDate > todayStr;
              const isActiveCurrent = item.status === "ACTIVE" && item.startDate <= todayStr;

              return (
                <tr
                  key={item.id}
                  className={`transition group ${
                    activeMenuId === item.id
                      ? "bg-blue-50/70 border-l-2 border-l-blue-600 font-medium"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  {/* Employee */}
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {item.employeeName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold leading-snug text-slate-900 line-clamp-2" title={item.employeeName}>
                          {item.employeeName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.employeeCode}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Unit */}
                  <td className="py-3.5 px-4 text-slate-600">
                    {item.orgUnitName ? (
                      <span className="block max-w-[180px] leading-snug line-clamp-2" title={item.orgUnitName}>
                        {item.orgUnitName}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Chưa phân đơn vị</span>
                    )}
                  </td>

                  {/* Project */}
                  <td className="py-3.5 px-4">
                    <div className="min-w-0">
                      <ProjectName name={item.projectName} maxLines={2} className="max-w-[260px] text-sm font-semibold leading-snug text-slate-900" />
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {item.projectCode}
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {item.projectPersonnelRoleName}
                  </td>

                  {/* Allocation */}
                  <td className="py-3.5 px-4 text-center font-bold text-blue-700">
                    <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {item.allocationPercentage}%
                    </span>
                  </td>

                  {/* Dates */}
                  <td className="py-3.5 px-4 text-[11px] text-slate-600 font-medium">
                    <div>{formatDisplayDate(item.startDate)}</div>
                    <div className="text-slate-400">
                      {item.expectedEndDate ? `đến ${formatDisplayDate(item.expectedEndDate)}` : "Không giới hạn"}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <AssignmentStatusBadge assignment={item} />
                  </td>

                  {/* Actions Dropdown */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap shrink-0">
                    <div className="flex items-center justify-end">
                      <UnifiedActionMenu
                        ariaLabel={`Thao tác điều động ${item.employeeName}`}
                        showPointer={true}
                        open={activeMenuId === item.id}
                        onOpenChange={(isOpen) => setActiveMenuId(isOpen ? item.id : null)}
                        menuWidth="w-56"
                        align="right"
                        trigger={
                          <button
                            type="button"
                            className={`p-1.5 rounded-lg border transition-colors ${
                              activeMenuId === item.id
                                ? "bg-blue-100 border-blue-300 text-blue-700"
                                : "text-slate-500 hover:bg-slate-100 border-slate-200 hover:text-slate-800"
                            }`}
                            title="Thao tác"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        }
                        items={[
                          {
                            id: "view-details",
                            label: "Xem chi tiết & Lịch sử",
                            icon: <Eye className="w-4 h-4 text-blue-600" />,
                            onClick: () => onViewDetails(item),
                          },
                          ...(capabilities.canUpdate && isActiveCurrent ? [
                            {
                              id: "transfer-role",
                              label: "Thay đổi vai trò hoặc tỷ lệ",
                              icon: <RefreshCw className="w-4 h-4 text-purple-600" />,
                              onClick: () => onTransfer(item),
                            },
                            {
                              id: "extend-assignment",
                              label: item.expectedEndDate ? "Gia hạn điều động" : "Thiết lập ngày dự kiến kết thúc",
                              icon: <Calendar className="w-4 h-4 text-sky-600" />,
                              onClick: () => onExtend(item),
                            },
                          ] : []),
                          ...(capabilities.canRelease && (isActiveCurrent || isFuturePlanned) ? [
                            {
                              id: "release-assignment",
                              label: "Rút nhân sự",
                              icon: <LogOut className="w-4 h-4 text-amber-600" />,
                              onClick: () => onRelease(item),
                            },
                          ] : []),
                          ...(capabilities.canRelease && isFuturePlanned ? [
                            {
                              id: "cancel-assignment",
                              label: "Hủy điều động",
                              icon: <Ban className="w-4 h-4 text-rose-600" />,
                              variant: "destructive" as const,
                              onClick: () => onCancel(item),
                            },
                          ] : []),
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden divide-y divide-slate-100">
        {assignments.map((item) => {
          const isFuturePlanned = item.status === "ACTIVE" && item.startDate > todayStr;
          const isActiveCurrent = item.status === "ACTIVE" && item.startDate <= todayStr;

          return (
            <div key={item.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {item.employeeName}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {item.employeeCode} {item.orgUnitName ? `• ${item.orgUnitName}` : ""}
                  </div>
                </div>
                <AssignmentStatusBadge assignment={item} />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Công trình:</span>
                  <span className="min-w-0 text-right">
                    <ProjectName name={item.projectName} maxLines={2} className="text-sm font-semibold leading-snug text-slate-900" />
                    <span className="mt-0.5 block font-mono text-[10px] font-medium text-slate-500">{item.projectCode}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Vai trò:</span>
                  <span className="font-medium text-slate-800">{item.projectPersonnelRoleName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tỷ lệ phân bổ:</span>
                  <span className="font-bold text-blue-700">{item.allocationPercentage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Thời gian:</span>
                  <span className="text-slate-700">{item.startDate} → {item.expectedEndDate || "Không giới hạn"}</span>
                </div>
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => onViewDetails(item)}
                  aria-label={`Xem chi tiết ${item.employeeName}`}
                  className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Chi tiết</span>
                </button>
                {capabilities.canUpdate && isActiveCurrent && (
                  <button
                    type="button"
                    onClick={() => onTransfer(item)}
                    aria-label={`Đổi vai trò cho ${item.employeeName}`}
                    className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đổi vai trò</span>
                  </button>
                )}
                {capabilities.canRelease && (isActiveCurrent || isFuturePlanned) && (
                  <button
                    type="button"
                    onClick={() => onRelease(item)}
                    aria-label={`Rút ${item.employeeName} khỏi công trình`}
                    className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Rút</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
