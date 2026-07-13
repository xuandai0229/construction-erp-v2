import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { DashboardProjectOverview } from '@/lib/dashboard/dashboard-queries';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import { formatStatusLabel } from '@/lib/dashboard/dashboard-formatters';
import { ContentCard } from '@/components/ui/enterprise';

function getHealthBadge(health: DashboardProjectOverview['health']) {
  switch (health) {
    case 'ON_TRACK':
    case 'COMPLETED':
      return <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 border border-emerald-100">Đúng tiến độ</span>;
    case 'AT_RISK':
      return <span className="rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600 border border-amber-100">Cần chú ý</span>;
    case 'DELAYED':
    case 'NO_DATA':
      return <span className="rounded-md bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 border border-rose-100">Rủi ro</span>;
  }
}

function getHealthColor(health: DashboardProjectOverview['health']) {
  switch (health) {
    case 'ON_TRACK':
    case 'COMPLETED':
      return 'bg-emerald-500';
    case 'AT_RISK':
      return 'bg-amber-500';
    case 'DELAYED':
    case 'NO_DATA':
      return 'bg-rose-500';
  }
}

export function ExecutiveProjectProgress({
  projects
}: {
  projects: DashboardProjectOverview[]
}) {
  return (
    <ContentCard id="project-progress" className="flex h-full flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 scroll-mt-24">
      {/* Header is ONLY for Table Mode. In Summary Mode, we integrate it into the layout */}
      {projects.length > 1 && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-slate-900">Tổng quan tiến độ công trình</h3>
          </div>
          <Link href="/projects" className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            Xem tất cả
          </Link>
        </div>
      )}

      <div className="hidden sm:block flex-1">
        {projects.length === 1 ? (
          <div className="flex flex-col p-6">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-base font-bold tracking-tight text-slate-900">Tổng quan tiến độ công trình</h3>
              <Link href={`?timeProgressDrawer=${projects[0].id}`} className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                Chi tiết
              </Link>
            </div>

            <div className="flex flex-col gap-6 pt-3">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="text-xl font-bold text-slate-900 tracking-tight">{projects[0].name}</h5>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[12px] font-mono tracking-tight text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{projects[0].code}</span>
                  </div>
                </div>
                <div className="shrink-0">{getHealthBadge(projects[0].health)}</div>
              </div>

              {/* Progress Highlights */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Tiến độ theo thời gian</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[36px] font-bold text-slate-900 leading-none tracking-tight">
                        {projects[0].progressPercent !== null ? `${Math.round(projects[0].progressPercent)}%` : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {projects[0].progressPercent !== null ? (
                  <div className="mt-2 relative pb-6">
                    <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden inset-0">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-blue-500 to-emerald-400"
                        style={{ width: `${Math.max(projects[0].progressPercent ?? 0, 0)}%` }}
                      />
                    </div>
                    {/* Marker */}
                    {projects[0].progressPercent >= 0 && projects[0].progressPercent <= 100 && (
                      <div 
                        className="absolute top-[-4px] bottom-6 w-0.5 bg-slate-700 rounded-full z-10"
                        style={{ left: `${projects[0].progressPercent}%`, height: '16px', transform: 'translateX(-50%)' }}
                      />
                    )}
                    {/* Labels */}
                    <div className="absolute left-0 bottom-0 text-[11px] font-semibold text-slate-500">
                      Bắt đầu: {projects[0].startDate ? format(new Date(projects[0].startDate), 'dd/MM/yyyy') : '--'}
                    </div>
                    <div className="absolute right-0 bottom-0 text-[11px] font-semibold text-slate-500 text-right">
                      Kết thúc: {projects[0].endDate ? format(new Date(projects[0].endDate), 'dd/MM/yyyy') : '--'}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
                    <span className="text-[13px] font-medium text-slate-500">Chưa đủ mốc thời gian để tính tiến độ</span>
                  </div>
                )}
              </div>

              {/* Mini Metrics - Time Based */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-1">
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Bắt đầu</span>
                  <span className="text-sm font-bold text-slate-700">{projects[0].startDate ? format(new Date(projects[0].startDate), 'dd/MM/yyyy') : '--'}</span>
                </div>
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Kết thúc</span>
                  <span className="text-sm font-bold text-slate-700">{projects[0].endDate ? format(new Date(projects[0].endDate), 'dd/MM/yyyy') : '--'}</span>
                </div>
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Còn lại</span>
                  <span className="text-sm font-bold text-slate-700">{projects[0].daysRemaining !== null ? `${projects[0].daysRemaining} ngày` : '--'}</span>
                </div>
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Cập nhật</span>
                  <span className="text-sm font-bold text-slate-700">{format(new Date(projects[0].updatedAt), 'dd/MM/yyyy')}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600 table-auto">
            <thead className="bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 w-10 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Mã công trình</th>
                <th className="px-4 py-3 font-semibold">Tên công trình</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap hidden xl:table-cell">Mức độ</th>
                <th className="px-4 py-3 w-32 font-semibold whitespace-nowrap">Tiến độ</th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap hidden xl:table-cell">Còn lại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project, i) => (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors duration-150 ease-out">
                  <td className="px-4 py-3.5 text-[12px] font-medium text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3.5 text-[12px] font-semibold text-slate-700 font-mono tracking-tight whitespace-nowrap">{project.code}</td>
                  <td className="px-4 py-3.5 text-[13px] font-bold text-slate-900 truncate max-w-[140px] 2xl:max-w-[200px]">
                    <Link href={`?timeProgressDrawer=${project.id}`} className="hover:text-blue-600 transition-colors">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap hidden xl:table-cell">
                    {getHealthBadge(project.health)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-9 text-[12px] font-bold text-slate-700 shrink-0">
                        {project.progressPercent !== null ? `${Math.round(project.progressPercent)}%` : '--'}
                      </span>
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden min-w-[40px]">
                        <div
                          className={cn("h-full rounded-full", getHealthColor(project.health))}
                          style={{ width: `${Math.max(project.progressPercent ?? 0, 2)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] font-medium text-slate-500 text-right whitespace-nowrap hidden xl:table-cell">
                    {project.daysRemaining !== null ? `${project.daysRemaining} ngày` : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden flex flex-col divide-y divide-slate-100">
        {projects.map((project, i) => (
          <div key={project.id} className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400">{project.code}</span>
                <Link href={`?timeProgressDrawer=${project.id}`} className="text-[14px] font-bold text-slate-900 hover:text-blue-600 transition-colors">
                  {project.name}
                </Link>
              </div>
              {getHealthBadge(project.health)}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">Tiến độ</span>
                  <span className="text-[12px] font-bold text-slate-700">
                    {project.progressPercent !== null ? `${Math.round(project.progressPercent)}%` : '--'}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", getHealthColor(project.health))}
                    style={{ width: `${Math.max(project.progressPercent ?? 0, 2)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}
