"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { EmployeeListDTO } from "@/lib/hr/hr-projection";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Eye,
  Edit,
  Building2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  HardHat,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HrEmptyState } from "./hr-empty-state";
import { UnifiedActionMenu, ActionMenuItem } from "@/components/ui/unified-action-menu";
import { MoreHorizontal } from "lucide-react";

interface EmployeeDataTableProps {
  employees: EmployeeListDTO[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  canUpdate: boolean;
  canArchive: boolean;
  canCreate?: boolean;
  searchQuery: string;
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  ACTIVE: { label: "Đang làm", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PROBATION: { label: "Thử việc", style: "bg-amber-50 text-amber-700 border-amber-200" },
  SUSPENDED: { label: "Tạm ngừng", style: "bg-orange-50 text-orange-700 border-orange-200" },
  RESIGNED: { label: "Đã nghỉ", style: "bg-rose-50 text-rose-700 border-rose-200" },
  RETIRED: { label: "Nghỉ hưu", style: "bg-slate-100 text-slate-700 border-slate-200" },
};

function sanitizeDisplayName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .replace(/QA\s+HR_PHASE_[A-Za-z0-9_.-]+/gi, "")
    .replace(/HR_PHASE_[A-Za-z0-9_.-]+/gi, "")
    .trim();
}

function getInitials(name: string): string {
  if (!name) return "NV";
  const cleanName = sanitizeDisplayName(name);
  const parts = cleanName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Interactive Single & Multi-Project Cell with 2-line max display, 
 * clickable project links, and fixed floating Popover/Tooltip.
 */
function ProjectAssignmentCell({
  projects,
  totalAllocationPercentage,
}: {
  projects: { id: string; name: string; code: string; roleName?: string; allocationPercentage: number }[];
  totalAllocationPercentage: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  if (projects.length === 0) {
    return <span className="text-slate-400 text-xs italic">Chưa bố trí công trình</span>;
  }

  const openPopover = (el: HTMLElement | null) => {
    if (el) {
      const rect = el.getBoundingClientRect();
      setCoords({
        top: Math.min(window.innerHeight - 300, rect.bottom + 6),
        left: Math.max(16, Math.min(window.innerWidth - 500, rect.left)),
      });
    }
    setIsOpen(true);
  };

  // SINGLE PROJECT DISPLAY (MAX 2 LINES + ELLIPSIS + CLICKABLE LINK + FLOATING TOOLTIP)
  if (projects.length === 1) {
    const proj = projects[0];
    const cleanProjName = sanitizeDisplayName(proj.name);

    return (
      <div
        ref={triggerRef}
        className="relative group min-w-0"
        onMouseEnter={() => openPopover(triggerRef.current)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="flex items-start gap-1.5 min-w-0">
          <HardHat className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-0.5">
            {proj.code && (
              <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100/90 border border-slate-200/80 px-1.5 py-0.2 rounded-xs whitespace-nowrap inline-block tracking-tight">
                {proj.code}
              </span>
            )}
            <Link
              href={`/projects/${proj.id}`}
              className="font-medium text-slate-800 hover:text-blue-600 hover:underline text-xs leading-snug line-clamp-2 break-words transition-colors block"
              title={cleanProjName}
            >
              {cleanProjName}
            </Link>
          </div>
        </div>

        {/* Floating Tooltip for Long Project Name (Fixed Portal Layer) */}
        {isOpen && (
          <div
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className="fixed z-50 max-w-lg w-[480px] bg-slate-900 text-white rounded-xl p-3.5 shadow-2xl space-y-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 pointer-events-none"
          >
            <div className="flex items-center justify-between text-blue-300 font-bold border-b border-slate-700 pb-1.5">
              <span className="flex items-center gap-1.5">
                <HardHat className="w-4 h-4 text-amber-400" />
                <span>{proj.code ? `[${proj.code}] ` : ""}Chi tiết công trình</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                Phân bổ: {proj.allocationPercentage}%
              </span>
            </div>
            <p className="font-semibold text-slate-100 leading-normal break-words">
              {cleanProjName}
            </p>
            {proj.roleName && (
              <p className="text-[11px] text-slate-400">
                Vai trò: <span className="text-slate-200 font-medium">{sanitizeDisplayName(proj.roleName)}</span>
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // MULTI-PROJECT DISPLAY (>1 PROJECTS)
  const fullTooltipText =
    projects
      .map((p) => `• ${sanitizeDisplayName(p.name)} (${p.roleName || "Kỹ sư"} · ${p.allocationPercentage}%)`)
      .join("\n") + `\nTổng phân bổ: ${totalAllocationPercentage}%`;

  const togglePopover = () => {
    if (!isOpen && buttonRef.current) {
      openPopover(buttonRef.current);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left max-w-full">
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePopover}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            togglePopover();
          }
          if (e.key === "Escape") setIsOpen(false);
        }}
        title={fullTooltipText}
        aria-expanded={isOpen}
        aria-label={`Xem ${projects.length} công trình đang tham gia`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors border border-blue-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
      >
        <HardHat className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>{projects.length} công trình đang tham gia</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/10" onClick={() => setIsOpen(false)} />
          <div
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className="fixed z-50 w-96 max-w-md bg-white rounded-xl border border-slate-200 p-4 shadow-2xl space-y-3 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                <HardHat className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{projects.length} công trình đang tham gia</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {projects.map((proj) => {
                const cleanName = sanitizeDisplayName(proj.name);
                const cleanRole = sanitizeDisplayName(proj.roleName || "Kỹ sư xây dựng");
                return (
                  <div key={proj.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg space-y-1 hover:bg-slate-100/80 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/projects/${proj.id}`}
                        onClick={() => setIsOpen(false)}
                        className="font-bold text-slate-900 hover:text-blue-600 text-xs leading-snug break-words flex-1 flex items-center gap-1 group"
                      >
                        <span>{proj.code ? `[${proj.code}] ` : ""}{cleanName}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                      <span className="font-medium text-slate-700">{cleanRole}</span>
                      <span className="font-bold text-blue-700">Tỷ lệ: {proj.allocationPercentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Tổng tỷ lệ phân bổ:</span>
              <span className={cn("font-bold text-xs tabular-nums px-2 py-0.5 rounded", totalAllocationPercentage > 100 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800")}>
                {totalAllocationPercentage}%
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function EmployeeDataTable({
  employees,
  totalCount,
  currentPage,
  pageSize,
  canUpdate,
  canCreate,
  searchQuery,
}: EmployeeDataTableProps) {
  const [activeEmpId, setActiveEmpId] = useState<string | null>(null);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pageHref = (page: number) => {
    const params = new URLSearchParams(searchQuery);
    params.set("page", String(page));
    return `/hr/employees?${params.toString()}`;
  };

  const hasSearchOrFilters = Boolean(searchQuery);
  const startItemIndex = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItemIndex = Math.min(currentPage * pageSize, totalCount);

  if (employees.length === 0) {
    if (hasSearchOrFilters) {
      return (
        <HrEmptyState
          variant="filter-mismatch"
          title="Không tìm thấy hồ sơ nhân viên phù hợp"
          description="Vui lòng thử tìm kiếm lại với từ khóa khác hoặc xóa bớt bộ lọc đang áp dụng."
          action={
            <Link
              href="/hr/employees"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </Link>
          }
        />
      );
    }

    return (
      <HrEmptyState
        variant="no-data"
        title="Chưa có hồ sơ nhân viên nào"
        description="Hệ thống chưa ghi nhận hồ sơ nhân viên. Tạo hồ sơ đầu tiên để bắt đầu quản lý nhân sự."
        action={
          canCreate ? (
            <Link
              href="/hr/employees/new"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm nhân viên mới</span>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Desktop Construction HR Table View (BALANCED 7-COLUMN RATIOS) */}
      <div className="hidden lg:block bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-sm border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-700 tracking-tight">
              <th className="py-2.5 px-3 w-[17%]">Nhân viên</th>
              <th className="py-2.5 px-3 w-[19%]">Phòng ban / Chức danh</th>
              <th className="py-2.5 px-3 w-[33%]">Công trình hiện tại</th>
              <th className="py-2.5 px-3 w-[7%] whitespace-nowrap">Phân bổ</th>
              <th className="py-2.5 px-3 w-[9%] whitespace-nowrap">Trạng thái</th>
              <th className="py-2.5 px-3 w-[9%] whitespace-nowrap">Ngày vào</th>
              <th className="py-2.5 px-3 w-[6%] text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((emp) => {
              const statusCfg = STATUS_CONFIG[emp.status] || {
                label: emp.status,
                style: "bg-slate-100 text-slate-700 border-slate-200",
              };
              const joinDateFormatted = emp.joinedDate
                ? format(new Date(emp.joinedDate), "dd/MM/yyyy", { locale: vi })
                : "—";

              const projects = emp.activeProjects || [];
              const totalPct = emp.totalAllocationPercentage || 0;
              const isOverallocated = totalPct > 100;

              const cleanFullName = sanitizeDisplayName(emp.fullName);
              const cleanDeptName = sanitizeDisplayName(emp.currentDepartmentName);
              const cleanPosTitle = sanitizeDisplayName(emp.currentPositionTitle);
              const isActiveRow = activeEmpId === emp.id;

              return (
                <tr 
                  key={emp.id} 
                  className={`transition-colors ${
                    isActiveRow
                      ? "bg-blue-50/70 border-l-2 border-l-blue-600 font-medium"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  {/* 1. Employee Name & Code Cell (17%) */}
                  <td className="py-2.5 px-3 overflow-hidden">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(cleanFullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/hr/employees/${emp.id}`}
                          title={cleanFullName}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors block truncate text-xs"
                        >
                          {cleanFullName}
                        </Link>
                        <span className="text-[11px] font-mono font-semibold text-slate-500 whitespace-nowrap block truncate">
                          {emp.code}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 2. Department & Position Cell (19%) */}
                  <td className="py-2.5 px-3 overflow-hidden">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate" title={cleanDeptName || "Chưa phân phòng ban"}>
                        {cleanDeptName ? (
                          <span className="flex items-center gap-1 min-w-0">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{cleanDeptName}</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded text-[10px] font-medium border border-amber-200">
                            Chưa phân phòng ban
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 truncate" title={cleanPosTitle || "Chưa xác định chức danh"}>
                        {cleanPosTitle ? (
                          <span className="flex items-center gap-1 min-w-0">
                            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate text-[11px]">{cleanPosTitle}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa xác định chức danh</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 3. Current Project Assignment Cell (33% - MAX 2 LINES + CLICKABLE LINK + TOOLTIP) */}
                  <td className="py-2.5 px-3 overflow-hidden">
                    <ProjectAssignmentCell projects={projects} totalAllocationPercentage={totalPct} />
                  </td>

                  {/* 4. Allocation Percentage Cell (7%) */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {projects.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <span className={cn("font-extrabold text-xs tabular-nums", isOverallocated ? "text-rose-600" : "text-slate-900")}>
                          {totalPct}%
                        </span>
                        {isOverallocated && (
                          <span title="Tổng tỷ lệ phân bổ hiện tại vượt 100%">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs tabular-nums">0%</span>
                    )}
                  </td>

                  {/* 5. Status Badge Cell (9%) */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap", statusCfg.style)}>
                      {statusCfg.label}
                    </span>
                  </td>

                  {/* 6. Joined Date Cell (9%) */}
                  <td className="py-2.5 px-3 text-xs font-medium text-slate-600 whitespace-nowrap">
                    {joinDateFormatted}
                  </td>

                  {/* 7. Action Cell (6%) */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end">
                      <UnifiedActionMenu
                        align="right"
                        menuWidth="w-48"
                        showPointer={true}
                        onOpenChange={(isOpen) => setActiveEmpId(isOpen ? emp.id : null)}
                        trigger={({ toggle, isOpen }) => (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggle();
                            }}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shadow-2xs ${
                              isOpen
                                ? "border-blue-300 bg-blue-100/80 text-blue-700"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                            aria-label="Thao tác nhân viên"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        )}
                      >
                        <ActionMenuItem href={`/hr/employees/${emp.id}`} icon={<Eye className="w-4 h-4 text-slate-500" />}>
                          Xem hồ sơ
                        </ActionMenuItem>
                        {canUpdate && (
                          <ActionMenuItem href={`/hr/employees/${emp.id}/edit`} icon={<Edit className="w-4 h-4 text-slate-500" />}>
                            Chỉnh sửa
                          </ActionMenuItem>
                        )}
                      </UnifiedActionMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {employees.map((emp) => {
          const statusCfg = STATUS_CONFIG[emp.status] || { label: emp.status, style: "bg-slate-100 text-slate-700 border-slate-200" };
          const projects = emp.activeProjects || [];
          const totalPct = emp.totalAllocationPercentage || 0;
          const cleanFullName = sanitizeDisplayName(emp.fullName);

          return (
            <div
              key={emp.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {getInitials(cleanFullName)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-base truncate">
                      {cleanFullName}
                    </h3>
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      Mã: {emp.code}
                    </span>
                  </div>
                </div>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 whitespace-nowrap", statusCfg.style)}>
                  {statusCfg.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-100 py-2.5 text-slate-600">
                <div className="min-w-0">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phòng ban / Chức danh</span>
                  <span className="font-semibold text-slate-900 block truncate">
                    {sanitizeDisplayName(emp.currentDepartmentName) || "Chưa phân phòng ban"}
                  </span>
                  <span className="text-slate-600 text-[11px] block truncate">
                    {sanitizeDisplayName(emp.currentPositionTitle) || "Chưa xác định chức danh"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Công trình & Phân bổ</span>
                  <span className="font-semibold text-slate-900 block line-clamp-2 break-words">
                    {projects.length > 0 ? `${projects.length} công trình (${totalPct}%)` : "Chưa bố trí"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500 font-medium">
                  Vào công ty: {emp.joinedDate ? format(new Date(emp.joinedDate), "dd/MM/yyyy", { locale: vi }) : "—"}
                </span>
                <Link
                  href={`/hr/employees/${emp.id}`}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Chi tiết</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Modern Pagination Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-xs text-xs text-slate-600">
        <div className="font-medium text-slate-700">
          <span className="font-bold text-slate-900 tabular-nums">{startItemIndex}–{endItemIndex}</span> / <span className="font-bold text-slate-900 tabular-nums">{totalCount}</span> nhân viên
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <Link
              href={pageHref(Math.max(1, currentPage - 1))}
              className={cn(
                "p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-700",
                currentPage <= 1 && "pointer-events-none opacity-40"
              )}
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <span className="font-semibold px-1 text-slate-800">
              Trang {currentPage} / {totalPages}
            </span>
            <Link
              href={pageHref(Math.min(totalPages, currentPage + 1))}
              className={cn(
                "p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-700",
                currentPage >= totalPages && "pointer-events-none opacity-40"
              )}
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
