"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { getProjectStatusMeta } from "@/lib/project-status";
import { EnterpriseTable } from "@/components/ui/enterprise";
import { ProjectIdentity } from "@/components/projects/project-identity";

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  displayName: string | null;
  investor: string | null;
  location: string | null;
  executionUnit: string | null;
  commanderName: string | null;
  status: string;
  dateRangeLabel: string | null;
  durationLabel: string | null;
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
      {/* Desktop View (lg and up) - 4 Grouped Columns */}
      <EnterpriseTable className="hidden lg:block border-x-0 sm:border-x border-t-0 sm:border-t rounded-none sm:rounded-[var(--radius-lg)]">
        <table className="w-full table-fixed text-left text-[14px] text-[var(--muted-foreground)]">
          <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)] text-[var(--muted-foreground)] uppercase text-[11px] font-bold tracking-wider sticky top-0 z-[5]">
            <tr>
              <th className="w-[34%] px-5 py-3.5 whitespace-nowrap">Công trình</th>
              <th className="w-[28%] px-5 py-3.5 whitespace-nowrap">Địa điểm & Phụ trách</th>
              <th className="w-auto px-5 py-3.5 whitespace-nowrap">Tiến độ</th>
              <th className="w-[165px] min-w-[165px] px-5 py-3.5 text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {projects.map((project) => (
              <tr 
                key={project.id} 
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(project.id)}
                onKeyDown={(e) => handleKeyDown(e, project.id)}
                className="group cursor-pointer border-b border-slate-200 transition-colors duration-150 ease-out hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              >
                {/* 1. Công trình */}
                <td className="px-5 py-4 align-top">
                  <ProjectIdentity
                    name={project.name}
                    displayName={project.displayName}
                    code={project.code}
                    executionUnit={project.executionUnit}
                    variant="table"
                    href={`/projects/${project.id}`}
                  />
                </td>

                {/* 2. Địa điểm & Phụ trách */}
                <td className="px-5 py-4 align-top text-[13px] text-slate-800">
                  {project.location ? (
                    <div className="font-semibold text-slate-950 line-clamp-1">
                      {project.location}
                    </div>
                  ) : (
                    <div className="text-[12px] text-slate-500 italic">
                      Chưa có địa điểm
                    </div>
                  )}

                  <div className="mt-1.5 text-[12.5px] text-slate-600 font-medium">
                    <span>Chỉ huy trưởng: </span>
                    <span className="font-bold text-slate-900">
                      {project.commanderName || "Chưa phân công chỉ huy trưởng"}
                    </span>
                  </div>

                  {project.investor && (
                    <div className="mt-1 text-[12px] text-slate-700 font-medium truncate max-w-[260px]">
                      CDT: <span className="font-semibold text-slate-900">{project.investor}</span>
                    </div>
                  )}
                </td>

                {/* 3. Tiến độ */}
                <td className="px-5 py-4 align-top text-[13px]">
                  <div className="mb-2">
                    {getStatusBadge(project.status)}
                  </div>
                  {project.dateRangeLabel && (
                    <div className="text-[12.5px] font-semibold text-slate-800 leading-snug">
                      {project.dateRangeLabel}
                    </div>
                  )}
                  {project.durationLabel && (
                    <div className="text-[12px] font-semibold text-slate-600 mt-0.5">
                      Thời gian: {project.durationLabel}
                    </div>
                  )}
                </td>

                {/* 4. Thao tác */}
                <td className="w-[165px] min-w-[165px] px-5 py-4 align-top text-right whitespace-nowrap shrink-0">
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <Link
                      href={`/projects/${project.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-[13px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] transition-all duration-150 shadow-2xs"
                    >
                      <Eye className="h-4 w-4" />
                      Xem
                    </Link>
                    {canManage && (
                      <Link
                        href={`/projects/${project.id}/edit`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 hover:text-slate-950 active:scale-[0.98] transition-all duration-150"
                      >
                        <Pencil className="h-4 w-4" />
                        Sửa
                      </Link>
                    )}
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
            className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 active:scale-[0.99] cursor-pointer"
          >
            <ProjectIdentity
              name={project.name}
              displayName={project.displayName}
              code={project.code}
              status={project.status}
              location={project.location}
              commanderName={project.commanderName}
              executionUnit={project.executionUnit}
              variant="card"
              href={`/projects/${project.id}`}
            />
            
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[12px] font-medium text-slate-700">
              <div>
                {project.dateRangeLabel || project.durationLabel || ""}
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <Link 
                    href={`/projects/${project.id}/edit`} 
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-md text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                )}
                <span className="text-blue-700 font-bold flex items-center gap-0.5">
                  Xem <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
