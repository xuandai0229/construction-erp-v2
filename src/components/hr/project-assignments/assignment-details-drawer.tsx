"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  User,
  Building2,
  Calendar,
  FileText,
  ShieldCheck,
  History,
} from "lucide-react";
import { ProjectAssignmentDTO } from "@/lib/hr/project-assignment-dto";
import { AssignmentStatusBadge, EndReasonBadge } from "./assignment-status-badge";
import { getEmployeeProjectAssignmentHistoryQuery } from "@/app/hr/project-assignments/actions/project-assignment-actions";

interface AssignmentDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: ProjectAssignmentDTO | null;
}

export function AssignmentDetailsDrawer({
  isOpen,
  onClose,
  assignment,
}: AssignmentDetailsDrawerProps) {
  const [historyItems, setHistoryItems] = useState<ProjectAssignmentDTO[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && assignment?.employeeId) {
      setIsLoadingHistory(true);
      getEmployeeProjectAssignmentHistoryQuery(assignment.employeeId)
        .then((res) => {
          if (res.success) {
            setHistoryItems(res.data);
          }
        })
        .finally(() => setIsLoadingHistory(false));
    }
  }, [isOpen, assignment?.employeeId]);

  if (!isOpen || !assignment) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Header */}
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold tracking-tight">Chi tiết điều động nhân sự</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng chi tiết điều động"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
            {/* Status & Badges */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Trạng thái hiện tại</span>
                <AssignmentStatusBadge assignment={assignment} />
              </div>
              {assignment.endReason && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Lý do kết thúc</span>
                  <EndReasonBadge reason={assignment.endReason} />
                </div>
              )}
            </div>

            {/* Employee Section */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <User className="w-4 h-4 text-blue-600" />
                Thông tin nhân sự
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block">Họ và tên:</span>
                  <span className="font-semibold text-slate-900">{assignment.employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mã nhân viên:</span>
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                    {assignment.employeeCode}
                  </span>
                </div>
                {assignment.orgUnitName && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Đơn vị quản lý nguồn:</span>
                    <span className="font-medium text-slate-800">{assignment.orgUnitName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Project & Role Section */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                Thông tin công trình & Vai trò
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="col-span-2">
                  <span className="text-slate-500 block">Công trình / Dự án:</span>
                  <span className="font-semibold text-slate-900">
                    [{assignment.projectCode}] {assignment.projectName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Vai trò công trường:</span>
                  <span className="font-medium text-slate-900">{assignment.projectPersonnelRoleName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tỷ lệ phân bổ:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {assignment.allocationPercentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                Thời gian công tác
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block">Ngày bắt đầu:</span>
                  <span className="font-medium text-slate-900">{assignment.startDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Dự kiến kết thúc:</span>
                  <span className="font-medium text-slate-900">
                    {assignment.expectedEndDate || "Không giới hạn"}
                  </span>
                </div>
                {assignment.endDate && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Ngày kết thúc thực tế:</span>
                    <span className="font-medium text-amber-700">{assignment.endDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Decision & Notes Section */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Văn bản & Ghi chú
              </h4>
              <div className="space-y-1.5 text-slate-700">
                <div>
                  <span className="text-slate-500 block">Số quyết định:</span>
                  <span className="font-medium text-slate-900">
                    {assignment.decisionNumber || "Chưa cập nhật"}
                  </span>
                </div>
                {assignment.notes && (
                  <div>
                    <span className="text-slate-500 block">Ghi chú:</span>
                    <p className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 mt-1 whitespace-pre-wrap">
                      {assignment.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment History Timeline */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                Lịch sử điều động của nhân sự
              </h4>
              {isLoadingHistory ? (
                <div className="py-4 text-center text-slate-400">Đang tải lịch sử...</div>
              ) : historyItems.length === 0 ? (
                <p className="text-slate-400 italic">Không có lịch sử công tác trước đây</p>
              ) : (
                <div className="relative pl-4 space-y-3 border-l-2 border-slate-200">
                  {historyItems.map((item) => (
                    <div key={item.id} className="relative group text-xs">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" />
                      <div className="font-semibold text-slate-800">
                        {item.projectCode} - {item.projectPersonnelRoleName} ({item.allocationPercentage}%)
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {item.startDate} {item.endDate ? `→ ${item.endDate}` : "→ Hiện tại"}
                      </div>
                      <div className="mt-0.5">
                        <AssignmentStatusBadge assignment={item} className="scale-90 origin-left" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
