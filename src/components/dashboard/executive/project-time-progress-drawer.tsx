"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DashboardProjectOverview } from "@/lib/dashboard/dashboard-queries";
import { format } from "date-fns";
import { X, CalendarDays, ExternalLink, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getProjectStatusMeta } from "@/lib/project-status";
import { StatusBadge } from "@/components/ui/status-badge";

export function ProjectTimeProgressDrawer({ projects }: { projects: DashboardProjectOverview[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const drawerId = searchParams.get("timeProgressDrawer");
  const dialogRef = useRef<HTMLDivElement>(null);

  const project = projects.find(p => p.id === drawerId);

  const closeDrawer = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("timeProgressDrawer");
    router.push(`${pathname}?${params.toString()}`);
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerId) {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerId]);

  if (!mounted || !drawerId) return null;

  if (!project) {
    return (
      <div
        className="fixed inset-0 z-[100] flex justify-end bg-slate-950/40 p-0 animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        onClick={closeDrawer}
      >
        <div
          className="relative flex h-full w-full sm:w-[520px] flex-col bg-white shadow-2xl shadow-slate-950/20 border-l border-slate-200 outline-none animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Tiến độ lịch thi công</h3>
              </div>
              <button onClick={closeDrawer} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors -mr-2">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12 flex-1">
            <span className="text-sm font-medium text-slate-500">Không tìm thấy thông tin công trình.</span>
          </div>
          <div className="flex flex-row border-t border-slate-100 px-5 py-4 sm:px-6">
            <Button onClick={closeDrawer} className="w-full">Đóng</Button>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = getProjectStatusMeta(project.status);

  // Time progress logic (Only executed on Client after mount)
  let totalDays = 0;
  let elapsedDays = 0;
  let remainingDays = project.daysRemaining ?? null;
  
  if (project.startDate && project.endDate) {
    const start = new Date(project.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(project.endDate);
    end.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    elapsedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    remainingDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-slate-950/40 p-0 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={closeDrawer}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative flex h-full w-full sm:w-[520px] flex-col bg-white shadow-2xl shadow-slate-950/20 border-l border-slate-200 outline-none animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Tiến độ lịch thi công</h3>
              <p className="mt-1 text-sm text-slate-500">Theo ngày bắt đầu và ngày kết thúc</p>
            </div>
            <button
              onClick={closeDrawer}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors -mr-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-50 pt-5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{project.code}</span>
              <StatusBadge variant={statusMeta.variant} size="sm">{statusMeta.label}</StatusBadge>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{project.name}</h2>
          </div>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-6 sm:px-6 flex-1 bg-slate-50/50">
          {/* Main Visual */}
          <div className="flex flex-col gap-5 p-5 sm:p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tiến độ thời gian</span>
                {totalDays > 0 && (
                  <span className="text-xs font-medium text-slate-400 mt-1">Đã trôi qua {elapsedDays} / {totalDays} ngày</span>
                )}
              </div>
              <span className="text-4xl font-bold text-slate-900 tracking-tight">
                {project.progressPercent !== null ? `${Math.round(project.progressPercent)}%` : '--'}
              </span>
            </div>

            {project.progressPercent !== null ? (
              <div className="mt-2 relative">
                {/* 3 top labels */}
                <div className="flex justify-between items-end mb-2 text-[11px] font-semibold text-slate-500">
                  <span>Bắt đầu</span>
                  <span>Hôm nay</span>
                  <span>Kết thúc</span>
                </div>
                
                {/* Track */}
                <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-900/5 inset-0">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                    style={{ width: `${Math.max(project.progressPercent ?? 0, 0)}%` }}
                  />
                </div>
                
                {/* Today marker (only if within range) */}
                {project.progressPercent >= 0 && project.progressPercent <= 100 && (
                  <div 
                    className="absolute top-6 bottom-4 w-0.5 bg-slate-700 rounded-full z-10"
                    style={{ left: `${project.progressPercent}%`, height: '12px', transform: 'translateX(-50%)' }}
                  />
                )}

                {/* Date labels */}
                <div className="flex justify-between items-start mt-2 text-[12px] font-bold text-slate-700">
                  <span>{project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : '--'}</span>
                  <span className="text-blue-600">{format(new Date(), 'dd/MM/yyyy')}</span>
                  <span>{project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : '--'}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                <CalendarClock className="h-10 w-10 text-slate-300 mb-3" />
                <span className="text-sm font-medium text-slate-600 mb-1">Chưa đủ mốc thời gian để tính tiến độ</span>
                <span className="text-xs text-slate-400 max-w-[200px]">Cần cập nhật ngày bắt đầu và kết thúc</span>
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col p-4 rounded-xl border border-slate-100 bg-slate-50">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tổng thời gian</span>
              <span className="mt-1 text-base font-bold text-slate-900">{totalDays > 0 ? `${totalDays} ngày` : '--'}</span>
            </div>
            <div className="flex flex-col p-4 rounded-xl border border-slate-100 bg-slate-50">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Đã trôi qua</span>
              <span className="mt-1 text-base font-bold text-slate-900">{totalDays > 0 ? `${elapsedDays} ngày` : '--'}</span>
            </div>
            <div className="flex flex-col p-4 rounded-xl border border-slate-100 bg-slate-50">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Còn lại</span>
              <span className="mt-1 text-base font-bold text-slate-900">{project.daysRemaining !== null ? `${project.daysRemaining} ngày` : '--'}</span>
            </div>
            <div className="flex flex-col p-4 rounded-xl border border-slate-100 bg-slate-50">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Cập nhật lúc</span>
              <span className="mt-1 text-base font-bold text-slate-900">{format(new Date(project.updatedAt), 'dd/MM/yyyy')}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-row gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={closeDrawer} className="flex-1 border-slate-200">Đóng</Button>
          <Button asChild className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white">
            <Link href={`/projects/${project.id}`}>
              Xem công trình <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
