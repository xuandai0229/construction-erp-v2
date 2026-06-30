import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { DashboardProjectOverview } from '@/lib/dashboard/dashboard-queries';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import { formatStatusLabel } from '@/lib/dashboard/dashboard-formatters';

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
    <section id="project-progress" className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
        <h3 className="font-bold text-slate-900">Tổng quan tiến độ công trình</h3>
        <Link href="/projects" className="flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-700">
          Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-5 py-3 w-12 font-semibold">#</th>
              <th className="px-5 py-3 font-semibold">Mã công trình</th>
              <th className="px-5 py-3 font-semibold">Tên công trình</th>
              <th className="px-5 py-3 font-semibold">Trạng thái</th>
              <th className="px-5 py-3 w-40 font-semibold">Tiến độ</th>
              <th className="px-5 py-3 font-semibold">Cập nhật mới nhất</th>
              <th className="px-5 py-3 font-semibold text-right">Còn lại</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((project, i) => (
              <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5 text-[12px] font-medium text-slate-400">{i + 1}</td>
                <td className="px-5 py-3.5 text-[13px] font-semibold text-slate-700">{project.code}</td>
                <td className="px-5 py-3.5 text-[13px] font-bold text-slate-900 truncate max-w-[200px]">
                  <Link href={`/projects/${project.id}`} className="hover:text-blue-600 transition-colors">
                    {project.name}
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  {getHealthBadge(project.health)}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-[13px] font-bold text-slate-700">
                      {project.progressPercent !== null ? `${Math.round(project.progressPercent)}%` : '--'}
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", getHealthColor(project.health))} 
                        style={{ width: `${Math.max(project.progressPercent ?? 0, 2)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[12px] font-medium text-slate-500">
                  {format(new Date(project.updatedAt), 'dd/MM/yyyy')}
                </td>
                <td className="px-5 py-3.5 text-[12px] font-medium text-slate-500 text-right">
                  {project.daysRemaining !== null ? `${project.daysRemaining} ngày` : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden flex flex-col divide-y divide-slate-100">
        {projects.map((project, i) => (
          <div key={project.id} className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400">{project.code}</span>
                <Link href={`/projects/${project.id}`} className="text-[14px] font-bold text-slate-900">
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
    </section>
  );
}
