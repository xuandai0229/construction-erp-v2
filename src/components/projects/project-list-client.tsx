"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil, ChevronRight, MoreVertical } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { getProjectStatusMeta } from "@/lib/project-status";
import { ContentCard, EnterpriseTable } from "@/components/ui/enterprise";

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
      <EnterpriseTable className="hidden lg:block border-x-0 sm:border-x border-t-0 sm:border-t rounded-none sm:rounded-2xl">
        <table className="w-full table-fixed text-left text-[14px] text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[11px] font-semibold tracking-wider">
            <tr>
              <th className="w-[150px] px-5 py-3.5 whitespace-nowrap">Mã công trình</th>
              <th className="w-[230px] px-5 py-3.5 whitespace-nowrap">Tên công trình</th>
              <th className="hidden 2xl:table-cell w-[190px] px-5 py-3.5 whitespace-nowrap">Chủ đầu tư</th>
              <th className="hidden xl:table-cell w-[230px] px-5 py-3.5 whitespace-nowrap">Địa điểm</th>
              <th className="w-[150px] px-5 py-3.5 whitespace-nowrap">Trạng thái</th>
              <th className="w-[210px] px-5 py-3.5 whitespace-nowrap">Thời gian</th>
              <th className="w-[140px] px-5 py-3.5 text-right whitespace-nowrap">Thao tác</th>
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
      </EnterpriseTable>

      {/* Mobile/Tablet View (< lg) */}
      <div className="lg:hidden flex flex-col gap-3">
        {projects.map((project) => (
          <div 
            key={project.id} 
            role="button"
            tabIndex={0}
            onClick={() => handleRowClick(project.id)}
            onKeyDown={(e) => handleKeyDown(e, project.id)}
            className="group block rounded-[16px] border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.02)] transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <span className="font-bold text-[11px] sm:text-[12px] text-slate-500 uppercase tracking-wider">{project.code}</span>
              {canManage && (
                <Link 
                  href={`/projects/${project.id}/edit`} 
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 -mr-1.5 -mt-1.5 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </Link>
              )}
            </div>
            
            <h3 className="text-[15px] sm:text-[16px] font-bold text-slate-900 leading-snug mb-3 group-hover:text-blue-700 transition-colors line-clamp-2">
              {project.name}
            </h3>
            
            <div className="flex items-center justify-between mb-3">
              {getStatusBadge(project.status)}
              <span className="text-[12px] font-semibold text-slate-600">
                {project.dateRangeLabel !== "Chưa cập nhật" ? project.dateRangeLabel : ""}
              </span>
            </div>
            
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[12.5px] font-medium text-slate-500">
              <span className="truncate pr-4">{project.location || "Chưa cập nhật địa điểm"}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
