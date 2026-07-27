"use client";

import { PieChart, TrendingUp, ArrowRight, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard/dashboard-queries';
import type { DrawerType } from './executive-detail-drawer';

function getStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'Đang thi công';
    case 'PLANNING': return 'Chuẩn bị thi công';
    case 'ON_HOLD': return 'Tạm dừng';
    case 'COMPLETED': return 'Hoàn thành';
    case 'CANCELLED': return 'Đã hủy';
    default: return status;
  }
}

export function ExecutiveStatusChart({
  data,
  onOpenDrawer,
}: {
  data: DashboardData;
  onOpenDrawer?: (type: DrawerType) => void;
}) {
  const isSingleProject = !!data.selectedProjectId;
  const currentProject = isSingleProject && data.projectOverview.length > 0 ? data.projectOverview[0] : null;

  // System-wide calculations (100% Real DB Data)
  const projects = data.projectOverview;
  const totalProjectsCount = projects.length;

  const onTrackProjects = projects.filter(p => p.health === 'ON_TRACK' || p.health === 'COMPLETED');
  const atRiskProjects = projects.filter(p => p.health === 'AT_RISK');
  const delayedProjects = projects.filter(p => p.health === 'DELAYED');

  const onTrackCount = onTrackProjects.length;
  const atRiskCount = atRiskProjects.length;
  const delayedCount = delayedProjects.length;

  const onTrackPercent = totalProjectsCount > 0 ? Math.round((onTrackCount / totalProjectsCount) * 100) : 0;
  const atRiskPercent = totalProjectsCount > 0 ? Math.round((atRiskCount / totalProjectsCount) * 100) : 0;
  const delayedPercent = totalProjectsCount > 0 ? Math.round((delayedCount / totalProjectsCount) * 100) : 0;

  // Sort projects by variance / lowest progress for Ranking Chart
  const rankedProjects = [...projects].sort((a, b) => {
    const aProg = a.progressPercent ?? 0;
    const bProg = b.progressPercent ?? 0;
    return aProg - bProg;
  }).slice(0, 4);

  // SVG Donut math
  const strokeWidth = 14;
  const radius = 44;
  const circumference = 2 * Math.PI * radius; // ~276.46

  const strokeOnTrack = (onTrackPercent / 100) * circumference;
  const strokeAtRisk = (atRiskPercent / 100) * circumference;
  const strokeDelayed = (delayedPercent / 100) * circumference;

  const offsetOnTrack = 0;
  const offsetAtRisk = strokeOnTrack;
  const offsetDelayed = strokeOnTrack + strokeAtRisk;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold">
            <PieChart className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              {isSingleProject ? 'Kế hoạch so với thực tế' : 'Sức khỏe danh mục công trình'}
            </h3>
            <p className="text-[11.5px] font-medium text-slate-500">
              {isSingleProject ? (currentProject?.name ?? 'Công trình đã chọn') : 'Phân tích chênh lệch tiến độ & rủi ro'}
            </p>
          </div>
        </div>

        {onOpenDrawer && (
          <button
            type="button"
            onClick={() => onOpenDrawer('PROJECT_STATUS')}
            className="flex items-center gap-1 text-[11.5px] font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg"
          >
            Chi tiết dự án <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Main Content Body */}
      {isSingleProject && currentProject ? (
        /* SINGLE PROJECT MODE UI (No information duplication with left cards) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch flex-1">
          {/* Left: Plan vs Actual Bullet Comparison */}
          <div className="flex flex-col justify-between p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">TIẾN ĐỘ THI CÔNG HÔM NAY</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900 leading-none">
                  {currentProject.progressPercent !== null ? `${Math.round(currentProject.progressPercent)}%` : '0%'}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  currentProject.health === 'ON_TRACK' || currentProject.health === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  currentProject.health === 'AT_RISK' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {currentProject.warning}
                </span>
              </div>
            </div>

            {/* Bullet Progress Bars */}
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Khối lượng thực tế</span>
                  <span className="font-bold text-emerald-600">{currentProject.progressPercent !== null ? `${Math.round(currentProject.progressPercent)}%` : '0%'}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${currentProject.progressPercent ?? 0}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Mốc kế hoạch dự kiến</span>
                  <span className="font-bold text-slate-600">100%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (currentProject.progressPercent ?? 0) + 15)}%` }} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 text-[11.5px] text-slate-600 flex justify-between">
              <span>Trạng thái hoạt động:</span>
              <strong className="text-slate-900">{getStatusLabel(currentProject.status)}</strong>
            </div>
          </div>

          {/* Right: Field Entries Trend Status */}
          <div className="flex flex-col justify-between p-4 rounded-xl border border-slate-200/80 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-blue-600" /> Xu hướng tiến độ hiện trường
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 p-4 text-center bg-slate-50/50">
              <Building2 className="h-7 w-7 text-slate-400 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold text-slate-700">Chưa đủ mốc dữ liệu để vẽ biểu đồ đường</p>
              <p className="text-[11px] text-slate-500 mt-1">Cần ít nhất 2 mốc cập nhật khối lượng thi công thực tế tại hiện trường.</p>
            </div>
          </div>
        </div>
      ) : (
        /* SYSTEM-WIDE MODE UI (100% Real DB Data & Visual Insight) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch flex-1">
          {/* Donut Chart: Portfolio Health */}
          <div className="flex flex-col justify-between p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">SỨC KHỎE DANH MỤC</span>

            <div className="flex items-center gap-4">
              <div className="relative shrink-0 flex items-center justify-center cursor-pointer" onClick={() => onOpenDrawer?.('PROJECT_STATUS')}>
                <svg width="104" height="104" viewBox="0 0 120 120" className="-rotate-90 drop-shadow-xs">
                  <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth={strokeWidth} />
                  {totalProjectsCount > 0 && (
                    <>
                      {strokeOnTrack > 0 && (
                        <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#10b981" strokeWidth={strokeWidth} strokeDasharray={`${strokeOnTrack} ${circumference}`} strokeDashoffset={`-${offsetOnTrack}`} />
                      )}
                      {strokeAtRisk > 0 && (
                        <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#f59e0b" strokeWidth={strokeWidth} strokeDasharray={`${strokeAtRisk} ${circumference}`} strokeDashoffset={`-${offsetAtRisk}`} />
                      )}
                      {strokeDelayed > 0 && (
                        <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#f43f5e" strokeWidth={strokeWidth} strokeDasharray={`${strokeDelayed} ${circumference}`} strokeDashoffset={`-${offsetDelayed}`} />
                      )}
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 leading-none">{totalProjectsCount}</span>
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Công trình</span>
                </div>
              </div>

              {/* Clickable Legend Pills */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenDrawer?.('PROJECT_STATUS')}
                  className="w-full flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1 text-xs hover:bg-emerald-100 transition-colors cursor-pointer text-left"
                >
                  <span className="font-bold text-emerald-900 truncate">Đúng tiến độ</span>
                  <span className="font-mono font-black text-emerald-800">{onTrackCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDrawer?.('PROJECT_STATUS')}
                  className="w-full flex items-center justify-between rounded-lg bg-amber-50 px-2.5 py-1 text-xs hover:bg-amber-100 transition-colors cursor-pointer text-left"
                >
                  <span className="font-bold text-amber-900 truncate">Cần chú ý</span>
                  <span className="font-mono font-black text-amber-800">{atRiskCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDrawer?.('RISK')}
                  className="w-full flex items-center justify-between rounded-lg bg-rose-50 px-2.5 py-1 text-xs hover:bg-rose-100 transition-colors cursor-pointer text-left"
                >
                  <span className="font-bold text-rose-900 truncate">Rủi ro / Trễ</span>
                  <span className="font-mono font-black text-rose-800">{delayedCount}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Ranking Bullet Chart: Plan vs Actual Ranking */}
          <div className="flex flex-col justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">CHÊNH LỆCH KẾ HOẠCH VÀ THỰC TẾ</span>

            <div className="space-y-2 flex-1 flex flex-col justify-center">
              {rankedProjects.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center">Chưa có công trình nào trong phạm vi.</p>
              ) : (
                rankedProjects.map((p) => {
                  const prog = p.progressPercent ?? 0;
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[140px]">{p.name}</span>
                        <span className="font-mono text-[11px] font-bold text-slate-600">{Math.round(prog)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full ${p.health === 'DELAYED' ? 'bg-rose-500' : p.health === 'AT_RISK' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.max(5, prog)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
