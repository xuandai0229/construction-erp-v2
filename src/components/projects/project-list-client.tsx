"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { getProjectStatusMeta } from "@/lib/project-status";

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  investor: string | null;
  location: string | null;
  status: string;
  dateRangeLabel: string;
};

export function ProjectsListClient({ 
  projects, 
  canManage 
}: { 
  projects: ProjectRow[]; 
  canManage: boolean;
}) {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    const meta = getProjectStatusMeta(status);
    return <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>;
  };

  const handleRowClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent, projectId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      router.push(`/projects/${projectId}`);
    }
  };

  return (
    <>
      {/* Desktop View (lg and up) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full table-fixed text-left text-[14px] text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[11px] font-semibold tracking-wider">
            <tr>
              <th className="w-[150px] px-5 py-3.5 whitespace-nowrap">Mã công trình</th>
              <th className="w-[230px] px-5 py-3.5 whitespace-nowrap">Tên công trình</th>
              <th className="hidden 2xl:table-cell w-[190px] px-5 py-3.5 whitespace-nowrap">Chủ đầu tư</th>
              <th className="hidden xl:table-cell w-[230px] px-5 py-3.5 whitespace-nowrap">Địa điểm</th>
              <th className="w-[150px] px-5 py-3.5 whitespace-nowrap">Trạng thái</th>
              <th className="w-[170px] px-5 py-3.5 whitespace-nowrap">Thời gian</th>
              <th className="w-[120px] px-5 py-3.5 text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {projects.map((project) => (
              <tr 
                key={project.id} 
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(project.id)}
                onKeyDown={(e) => handleKeyDown(e, project.id)}
                className="group cursor-pointer border-b border-slate-100 transition-colors duration-200 ease-out hover:bg-blue-50/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              >
                <td className="px-5 py-4 font-medium text-slate-700 truncate">
                  {project.code}
                </td>
                <td className="px-5 py-4 truncate">
                  <span className="font-semibold text-blue-600 transition-colors group-hover:text-blue-700 group-hover:underline decoration-blue-600/30 underline-offset-4">
                    {project.name}
                  </span>
                </td>
                <td className="hidden 2xl:table-cell px-5 py-4 truncate">
                  <span className="text-slate-600" title={project.investor || undefined}>
                    {project.investor || <span className="text-slate-400">—</span>}
                  </span>
                </td>
                <td className="hidden xl:table-cell px-5 py-4 truncate">
                  <span className="text-slate-600" title={project.location || undefined}>
                    {project.location || <span className="text-slate-400">—</span>}
                  </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {getStatusBadge(project.status)}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-[13px] text-slate-500 font-medium">
                  {project.dateRangeLabel === "Chưa cập nhật" ? (
                    <span className="text-slate-400">{project.dateRangeLabel}</span>
                  ) : (
                    project.dateRangeLabel
                  )}
                </td>
                <td className="px-5 py-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5 transition-opacity duration-200">
                    {canManage && (
                      <Link 
                        href={`/projects/${project.id}/edit`} 
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 bg-transparent transition-colors hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" />
                        Sửa
                      </Link>
                    )}
                    <div className="ml-1 flex h-7 w-7 items-center justify-center text-slate-400 opacity-50 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-1">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet View (< lg) */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/50">
        {projects.map((project) => (
          <div 
            key={project.id} 
            role="button"
            tabIndex={0}
            onClick={() => handleRowClick(project.id)}
            onKeyDown={(e) => handleKeyDown(e, project.id)}
            className="group cursor-pointer p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col hover:shadow-md transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
          >
            <div className="mb-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[12px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg shrink-0 break-all max-w-[120px]">
                  {project.code}
                </span>
                {getStatusBadge(project.status)}
              </div>
              <span className="text-[15px] font-bold text-blue-600 transition-colors group-hover:text-blue-700 line-clamp-2 leading-tight break-words">
                {project.name}
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-2 text-[13px] text-slate-600 mb-4">
              <p className="truncate" title={project.investor || undefined}>
                <span className="text-slate-400">CĐT:</span> <span className="font-medium text-slate-800">{project.investor || "—"}</span>
              </p>
              <p className="truncate" title={project.location || undefined}>
                <span className="text-slate-400">Vị trí:</span> <span className="font-medium text-slate-800">{project.location || "—"}</span>
              </p>
              <div className="flex justify-between items-center text-slate-500 mt-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                <span className="font-medium">{project.dateRangeLabel}</span>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <span className="flex-1 text-[13px] text-slate-400 font-medium px-2">Bấm để xem chi tiết</span>
              {canManage && (
                <Link 
                  href={`/projects/${project.id}/edit`} 
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <Pencil className="h-4 w-4" />
                  Sửa
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
