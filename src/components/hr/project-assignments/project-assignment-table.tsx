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
} from "lucide-react";
import { ProjectAssignmentDTO } from "@/lib/hr/project-assignment-dto";
import { AssignmentStatusBadge } from "./assignment-status-badge";
import { AssignmentUserCapabilities } from "@/app/hr/project-assignments/actions/project-assignment-actions";

interface ProjectAssignmentTableProps {
  assignments: ProjectAssignmentDTO[];
  capabilities: AssignmentUserCapabilities;
  onViewDetails: (item: ProjectAssignmentDTO) => void;
  onTransfer: (item: ProjectAssignmentDTO) => void;
  onExtend: (item: ProjectAssignmentDTO) => void;
  onRelease: (item: ProjectAssignmentDTO) => void;
  onCancel: (item: ProjectAssignmentDTO) => void;
  isLoading?: boolean;
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
}: ProjectAssignmentTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500 space-y-3">
        <div className="inline-block animate-spin border-2 border-blue-600 border-t-transparent rounded-full w-6 h-6" />
        <p>Đang nạp danh sách điều động nhân sự...</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs space-y-3">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <Layers className="w-6 h-6" />
        </div>
        <p className="font-semibold text-slate-700">Không tìm thấy bản ghi phân công phù hợp</p>
        <p className="text-slate-500 max-w-sm mx-auto">
          Thử thay đổi từ khóa tìm kiếm, điều kiện lọc trạng thái hoặc tạo mới đợt phân công công tác.
        </p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Desktop View Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
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
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {assignments.map((item) => {
              const isFuturePlanned = item.status === "ACTIVE" && item.startDate > todayStr;
              const isActiveCurrent = item.status === "ACTIVE" && item.startDate <= todayStr;

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                  {/* Employee */}
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {item.employeeName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">
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
                      <span className="truncate block max-w-[140px]" title={item.orgUnitName}>
                        {item.orgUnitName}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Chưa phân đơn vị</span>
                    )}
                  </td>

                  {/* Project */}
                  <td className="py-3.5 px-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate max-w-[180px]" title={item.projectName}>
                        {item.projectName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
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
                  <td className="py-3.5 px-4 text-[11px] text-slate-600">
                    <div>{item.startDate}</div>
                    <div className="text-slate-400">
                      {item.expectedEndDate ? `đến ${item.expectedEndDate}` : "Không giới hạn"}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <AssignmentStatusBadge assignment={item} />
                  </td>

                  {/* Actions Dropdown */}
                  <td className="py-3.5 px-4 text-right relative">
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {activeMenuId === item.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-20 py-1 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                            {/* View Details */}
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onViewDetails(item);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>Xem chi tiết & Lịch sử</span>
                            </button>

                            {/* Transfer Role / Allocation */}
                            {capabilities.canUpdate && isActiveCurrent && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onTransfer(item);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                                <span>Thay đổi vai trò / Tỷ lệ</span>
                              </button>
                            )}

                            {/* Extend */}
                            {capabilities.canUpdate && isActiveCurrent && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onExtend(item);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                                <span>Gia hạn đợt công tác</span>
                              </button>
                            )}

                            {/* Release */}
                            {capabilities.canRelease && (isActiveCurrent || isFuturePlanned) && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onRelease(item);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-amber-700"
                              >
                                <LogOut className="w-3.5 h-3.5 text-amber-600" />
                                <span>Rút nhân sự sớm</span>
                              </button>
                            )}

                            {/* Cancel Future */}
                            {capabilities.canRelease && isFuturePlanned && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onCancel(item);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-rose-600"
                              >
                                <Ban className="w-3.5 h-3.5 text-rose-600" />
                                <span>Hủy phân công tương lai</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
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

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Công trình:</span>
                  <span className="font-semibold text-slate-900 text-right">[{item.projectCode}] {item.projectName}</span>
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
                  <span className="text-slate-700">{item.startDate} → {item.expectedEndDate || "Tương lai"}</span>
                </div>
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => onViewDetails(item)}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Chi tiết</span>
                </button>
                {capabilities.canUpdate && isActiveCurrent && (
                  <button
                    onClick={() => onTransfer(item)}
                    className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đổi vai trò</span>
                  </button>
                )}
                {capabilities.canRelease && (isActiveCurrent || isFuturePlanned) && (
                  <button
                    onClick={() => onRelease(item)}
                    className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition flex items-center gap-1"
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
