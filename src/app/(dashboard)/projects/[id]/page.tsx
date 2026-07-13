import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { Building2, Calendar, MapPin, User, ListTree, FolderOpen, ClipboardCheck, BarChart2, Package, ChevronRight, CalendarCheck } from "lucide-react";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import Link from "next/link";
import { formatDateVN } from "@/lib/utils";
import { requireProjectAccessOrRedirect, canManageProjects } from "@/lib/rbac";
import { getProjectStatusMeta } from "@/lib/project-status";
import { type ElementType, type ReactNode } from "react";

const folderPrefixMap: Record<string, string> = {
  "01": "01. Hồ sơ pháp lý công trình",
  "02": "02. Bản vẽ thiết kế",
  "03": "03. Biên bản nghiệm thu",
  "04": "04. Vật tư thiết bị",
  "05": "05. Hình ảnh tiến độ",
};

function formatFolderName(name: string) {
  const match = name.match(/^(\d{2})/);
  if (match && folderPrefixMap[match[1]]) {
    return folderPrefixMap[match[1]];
  }
  return name.replace(/^(\d+)_/, '$1. ').replace(/_/g, ' ');
}

function InfoTile({ label, value, icon: Icon }: { label: string, value: ReactNode, icon: ElementType }) {
  return (
    <div className="rounded-[14px] bg-slate-50/70 border border-slate-100 px-3.5 py-2.5 min-h-[66px] flex flex-col justify-center">
      <span className="text-[12px] font-medium text-slate-500 mb-1 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        {label}
      </span>
      <div className="text-[13.5px] font-semibold text-slate-900 truncate" title={typeof value === 'string' ? value : undefined}>
        {value || <span className="text-slate-400 font-normal">—</span>}
      </div>
    </div>
  );
}

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await requireProjectAccessOrRedirect(resolvedParams.id);

  const canManage = canManageProjects(session);

  const project = await prisma.project.findFirst({
    where: { id: resolvedParams.id, deletedAt: null },
    include: {
      documentFolders: {
        where: { parentId: null, deletedAt: null },
        orderBy: { name: 'asc' }
      },
      _count: {
        select: {
          fieldProgressTemplates: {
            where: { deletedAt: null }
          }
        }
      }
    }
  });

  if (!project) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    const meta = getProjectStatusMeta(status);
    return <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>;
  };

  const hasWbs = project._count.fieldProgressTemplates > 0;

  return (
    <div className="app-page space-y-5 max-w-[1600px] mx-auto pb-10">
      {/* Header / Hero */}
      <div className="rounded-[20px] bg-white border border-slate-200/70 shadow-[0_14px_40px_rgba(15,23,42,0.04)] p-5 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5">

        {/* Abstract Dot Grid Decoration */}
        <div
          className="absolute inset-y-0 right-0 w-[400px] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 100%)',
            maskImage: 'linear-gradient(to right, transparent, black 100%)',
            opacity: 0.15
          }}
        />

        <div className="relative z-10 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight truncate">{project.name}</h1>
            {getStatusBadge(project.status)}
          </div>
          <div className="mt-3 flex items-center">
            <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-500 px-2.5 py-1 rounded-[6px] text-[13px] font-medium border border-slate-200/50">
              Mã: {project.code}
            </span>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 shrink-0">
          <Link href="/projects" className="inline-flex items-center justify-center rounded-[12px] bg-white border border-slate-200/80 px-4 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none h-[36px]">
            Quay lại
          </Link>
          {canManage && (
            <Link href={`/projects/${project.id}/edit`} className="inline-flex items-center justify-center rounded-[12px] bg-blue-600 px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none h-[36px]">
              Sửa
            </Link>
          )}
          {canManage && (
            <DeleteProjectButton id={project.id} projectName={project.name} className="h-[36px] px-2.5 text-[12px] bg-transparent border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors ml-1" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-stretch">
        {/* Thông tin chung */}
        <div className="h-full">
          <div className="rounded-[20px] bg-white border border-slate-200/70 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <div className="w-8 h-8 rounded-[10px] bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-[15px] font-bold text-slate-900">Thông tin chung</h2>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoTile label="Chủ đầu tư" value={project.investor} icon={User} />
                <InfoTile label="Địa điểm" value={project.location} icon={MapPin} />
                <InfoTile label="Ngày bắt đầu" value={project.startDate ? formatDateVN(project.startDate) : null} icon={Calendar} />
                <InfoTile label="Ngày dự kiến hoàn thành" value={project.endDate ? formatDateVN(project.endDate) : null} icon={CalendarCheck} />

                <div className="sm:col-span-2 pt-3 mt-1 border-t border-slate-100">
                  <span className="text-[12px] font-medium text-slate-500 mb-1.5 block">Ghi chú</span>
                  {project.description ? (
                    <p className="text-[13.5px] text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-2" title={project.description}>{project.description}</p>
                  ) : (
                    <p className="text-slate-400 text-[13.5px]">—</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thư mục */}
        <div className="h-full">
          <div className="rounded-[20px] bg-white border border-slate-200/70 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-white border border-slate-100 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <h2 className="text-[15px] font-bold text-slate-900">Thư mục</h2>
              </div>
              <Link href={`/documents/${project.id}`} className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Quản lý &rarr;
              </Link>
            </div>
            <div className="p-3 flex-1 flex flex-col">
              {project.documentFolders.length > 0 ? (
                <div className="space-y-1 flex flex-col h-full">
                  {project.documentFolders.slice(0, 5).map(folder => (
                    <Link key={folder.id} href={`/documents/${project.id}?folder=${folder.id}`} className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-slate-50 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-amber-50/50 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                        <FolderOpen className="w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-colors" />
                      </div>
                      <span className="text-[13.5px] font-medium text-slate-700 group-hover:text-slate-900 truncate" title={formatFolderName(folder.name)}>
                        {formatFolderName(folder.name)}
                      </span>
                    </Link>
                  ))}
                  {project.documentFolders.length > 5 && (
                    <div className="px-3 pt-2 pb-1 text-center border-t border-slate-50 mt-auto">
                      <Link href={`/documents/${project.id}`} className="text-[12px] font-medium text-slate-500 hover:text-blue-600 transition-colors">
                        + {project.documentFolders.length - 5} thư mục khác
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6 px-4 text-center h-full">
                  <FolderOpen className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-[13px] text-slate-500">Chưa có thư mục nào</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <h2 className="text-[17px] font-bold text-slate-900 mb-4 tracking-tight">Phân hệ quản lý</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">

          <Link href={`/projects/${project.id}/field-progress`} className="group flex flex-col rounded-[20px] bg-white border border-slate-200/70 p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/60 flex items-center justify-center text-blue-600 mb-3 shrink-0 transition-transform duration-300 group-hover:scale-105">
              <ListTree className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-[14px] mb-1">Bảng khối lượng gốc</h3>
            <p className="text-[12.5px] text-slate-500 leading-relaxed mb-3">Thiết lập hạng mục, công việc, định mức cho công trình.</p>
            <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className={`text-[12px] font-semibold ${hasWbs ? 'text-emerald-600' : 'text-slate-400'}`}>
                {hasWbs ? 'Đã thiết lập' : 'Chưa thiết lập'}
              </span>
              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {hasWbs ? (
            <Link href={`/projects/${project.id}/field-progress/daily`} className="group flex flex-col rounded-[20px] bg-white border border-slate-200/70 p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-200">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 flex items-center justify-center text-emerald-600 mb-3 shrink-0 transition-transform duration-300 group-hover:scale-105">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-[14px] mb-1">Nhập khối lượng ngày</h3>
              <p className="text-[12.5px] text-slate-500 leading-relaxed mb-3">Nhập khối lượng thi công thực tế tại hiện trường.</p>
              <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-slate-500">
                  Cập nhật tiến độ
                </span>
                <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ) : (
            <div aria-disabled="true" className="group flex flex-col rounded-[20px] bg-slate-50/70 border border-slate-200/50 p-4 cursor-not-allowed opacity-60">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600/50 mb-3 shrink-0">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-700 text-[14px] mb-1">Nhập khối lượng ngày</h3>
              <p className="text-[12.5px] text-slate-500 leading-relaxed mb-3">Nhập khối lượng thi công thực tế tại hiện trường.</p>
              <div className="mt-auto pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-slate-400">
                  Cần thiết lập WBS
                </span>
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}

          {hasWbs ? (
            <Link href={`/projects/${project.id}/field-progress/summary`} className="group flex flex-col rounded-[20px] bg-white border border-slate-200/70 p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/60 flex items-center justify-center text-indigo-600 mb-3 shrink-0 transition-transform duration-300 group-hover:scale-105">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-[14px] mb-1">Tổng hợp khối lượng</h3>
              <p className="text-[12.5px] text-slate-500 leading-relaxed mb-3">Xem báo cáo lũy kế, tỷ lệ hoàn thành so với kế hoạch.</p>
              <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-slate-500">
                  Báo cáo chi tiết
                </span>
                <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ) : (
            <div aria-disabled="true" className="group flex flex-col rounded-[20px] bg-slate-50/70 border border-slate-200/50 p-4 cursor-not-allowed opacity-60">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600/50 mb-3 shrink-0">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-700 text-[14px] mb-1">Tổng hợp khối lượng</h3>
              <p className="text-[12.5px] text-slate-500 leading-relaxed mb-3">Xem báo cáo lũy kế, tỷ lệ hoàn thành so với kế hoạch.</p>
              <div className="mt-auto pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-slate-400">
                  Cần thiết lập WBS
                </span>
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
