import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeft, Building2, Calendar, MapPin, User, ListTree, FolderOpen, ClipboardCheck, BarChart2, Package, ChevronRight, CalendarCheck, MoreVertical, Search, Plus, Pencil } from "lucide-react";
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
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] border border-[var(--border)] px-3.5 py-2.5 min-h-[66px] flex flex-col justify-center">
      <span className="text-[12px] font-medium text-[var(--muted-foreground)] mb-1 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-[var(--muted-foreground)] opacity-70" />
        {label}
      </span>
      <div className="text-[13.5px] font-semibold text-[var(--foreground)] truncate" title={typeof value === 'string' ? value : undefined}>
        {value || <span className="text-[var(--muted-foreground)] opacity-70 font-normal">—</span>}
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
      
      {/* =========================================
          MOBILE LAYOUT
          ========================================= */}
      <div className="sm:hidden space-y-6 px-1">
        
        {/* 10.1 PROJECT HERO & 10.2 PROJECT SNAPSHOT */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-black text-[var(--muted-foreground)] uppercase tracking-widest">{project.code}</span>
            <div className="flex items-center gap-2">
              {getStatusBadge(project.status)}
              <div className="w-8 h-8 rounded-full bg-[var(--border)] flex items-center justify-center text-slate-600">
                <MoreVertical className="w-4 h-4" />
              </div>
            </div>
          </div>
          <h1 className="text-[20px] font-black text-[var(--foreground)] leading-snug line-clamp-2">
            {project.name}
          </h1>

          <div className="mt-5 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-dashed border-[var(--border)] pb-3">
              <span className="text-[13px] text-[var(--muted-foreground)] font-medium">Chủ đầu tư</span>
              <span className="text-[13px] font-bold text-[var(--foreground)] truncate max-w-[65%] text-right">{project.investor || "—"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dashed border-[var(--border)] pb-3">
              <span className="text-[13px] text-[var(--muted-foreground)] font-medium">Địa điểm</span>
              <span className="text-[13px] font-bold text-[var(--foreground)] truncate max-w-[65%] text-right">{project.location || "—"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dashed border-[var(--border)] pb-3">
              <span className="text-[13px] text-[var(--muted-foreground)] font-medium">Khởi công</span>
              <span className="text-[13px] font-bold text-[var(--foreground)]">{project.startDate ? formatDateVN(project.startDate) : "—"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-dashed border-[var(--border)] pb-3">
              <span className="text-[13px] text-[var(--muted-foreground)] font-medium">Hoàn thành</span>
              <span className="text-[13px] font-bold text-[var(--foreground)]">{project.endDate ? formatDateVN(project.endDate) : "—"}</span>
            </div>
          </div>
        </div>

        {/* 10.3 MODULE NAVIGATION */}
        <div className="flex flex-col gap-3 pt-2">
          <Link href={`/projects/${project.id}/field-progress`} className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3.5 shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mr-3">
              <ListTree className="w-5 h-5"/>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-bold text-[var(--foreground)] truncate">Hạng mục & Công việc</h3>
              <p className="text-[12px] text-[var(--muted-foreground)] truncate mt-0.5">{hasWbs ? "Quản lý hạng mục thi công" : "Chưa thiết lập WBS"}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] opacity-70 shrink-0"/>
          </Link>

          {hasWbs ? (
            <Link href={`/projects/${project.id}/field-progress/daily`} className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3.5 shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mr-3">
                <ClipboardCheck className="w-5 h-5"/>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-bold text-[var(--foreground)] truncate">Khối lượng thực hiện</h3>
                <p className="text-[12px] text-[var(--muted-foreground)] truncate mt-0.5">Cập nhật khối lượng theo ngày</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] opacity-70 shrink-0"/>
            </Link>
          ) : (
             <div className="flex items-center bg-[var(--surface-subtle)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3.5 opacity-60">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600/50 flex items-center justify-center shrink-0 mr-3">
                <ClipboardCheck className="w-5 h-5"/>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-bold text-[var(--foreground)] truncate">Khối lượng thực hiện</h3>
                <p className="text-[12px] text-[var(--muted-foreground)] truncate mt-0.5">Cần thiết lập WBS trước</p>
              </div>
            </div>
          )}

          {hasWbs ? (
            <Link href={`/projects/${project.id}/field-progress/summary`} className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3.5 shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mr-3">
                <BarChart2 className="w-5 h-5"/>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-bold text-[var(--foreground)] truncate">Tổng hợp khối lượng</h3>
                <p className="text-[12px] text-[var(--muted-foreground)] truncate mt-0.5">Lũy kế và tiến độ</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] opacity-70 shrink-0"/>
            </Link>
          ) : (
            <div className="flex items-center bg-[var(--surface-subtle)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3.5 opacity-60">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600/50 flex items-center justify-center shrink-0 mr-3">
                <BarChart2 className="w-5 h-5"/>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-bold text-[var(--foreground)] truncate">Tổng hợp khối lượng</h3>
                <p className="text-[12px] text-[var(--muted-foreground)] truncate mt-0.5">Cần thiết lập WBS trước</p>
              </div>
            </div>
          )}
        </div>

        {/* 10.4 DOCUMENT SUMMARY */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-3 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-amber-500" />
              <h2 className="text-[15px] font-bold text-[var(--foreground)]">Hồ sơ & Tài liệu</h2>
            </div>
            <Link href={`/documents/${project.id}`} className="text-[13px] font-semibold text-blue-600 hover:text-blue-700">
              Xem tất cả
            </Link>
          </div>
          <div className="space-y-2">
            {project.documentFolders.slice(0, 3).map(folder => (
              <Link key={folder.id} href={`/documents/${project.id}?folder=${folder.id}`} className="flex items-center justify-between gap-3 group bg-[var(--surface-subtle)] rounded-lg p-2.5 hover:bg-[var(--border)] active:bg-slate-200 transition-colors">
                <span className="text-[13px] font-medium text-[var(--foreground)] truncate">{formatFolderName(folder.name)}</span>
                <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] opacity-70" />
              </Link>
            ))}
            {project.documentFolders.length === 0 && (
              <div className="text-[13px] text-[var(--muted-foreground)] py-2 text-center">Chưa có thư mục nào</div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================
          DESKTOP LAYOUT (Hidden on mobile)
          ========================================= */}
      <div className="hidden min-h-[76px] items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-card)] sm:flex">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <h1 className="min-w-0 truncate text-[22px] font-bold leading-tight tracking-tight text-[var(--foreground)] xl:text-2xl">{project.name}</h1>
          <span className="hidden shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)] lg:inline-flex">
            {project.code}
          </span>
          <span className="shrink-0">{getStatusBadge(project.status)}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/projects" aria-label="Danh sách công trình" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] focus:outline-none">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden xl:inline">Danh sách</span>
          </Link>
          {canManage && (
            <Link href={`/projects/${project.id}/edit`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-[var(--shadow-button)] transition-colors hover:bg-blue-700 focus:outline-none">
              <Pencil className="h-4 w-4" />
              Sửa
            </Link>
          )}
          {canManage && (
            <DeleteProjectButton id={project.id} projectName={project.name} className="h-9 px-3 text-sm bg-transparent border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors" />
          )}
        </div>
      </div>
      
      {/* Desktop Main Content Wrap */}
      <div className="hidden sm:grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-stretch">
        {/* Thông tin chung */}
        <div className="h-full">
          <div className="rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col h-full">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--surface-subtle)]">
              <div className="w-8 h-8 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-blue-600 shadow-[var(--shadow-card)] shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-[15px] font-bold text-[var(--foreground)]">Thông tin chung</h2>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoTile label="Chủ đầu tư" value={project.investor} icon={User} />
                <InfoTile label="Địa điểm" value={project.location} icon={MapPin} />
                <InfoTile label="Ngày bắt đầu" value={project.startDate ? formatDateVN(project.startDate) : null} icon={Calendar} />
                <InfoTile label="Ngày dự kiến hoàn thành" value={project.endDate ? formatDateVN(project.endDate) : null} icon={CalendarCheck} />

                <div className="sm:col-span-2 pt-3 mt-1 border-t border-[var(--border)]">
                  <span className="text-[12px] font-medium text-[var(--muted-foreground)] mb-1.5 block">Ghi chú</span>
                  {project.description ? (
                    <p className="text-[13.5px] text-[var(--foreground)] whitespace-pre-wrap leading-relaxed" title={project.description}>{project.description}</p>
                  ) : (
                    <p className="text-[var(--muted-foreground)] opacity-70 text-[13.5px]">—</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thư mục */}
        <div className="h-full">
          <div className="rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden flex flex-col h-full">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-amber-600 shadow-[var(--shadow-card)] shrink-0">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <h2 className="text-[15px] font-bold text-[var(--foreground)]">Thư mục</h2>
              </div>
              <Link href={`/documents/${project.id}`} className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Quản lý &rarr;
              </Link>
            </div>
            <div className="p-3 flex-1 flex flex-col">
              {project.documentFolders.length > 0 ? (
                <div className="space-y-1 flex flex-col h-full">
                  {project.documentFolders.slice(0, 5).map(folder => (
                    <Link key={folder.id} href={`/documents/${project.id}?folder=${folder.id}`} className="flex items-center gap-3 px-3 py-2 rounded-[12px] hover:bg-[var(--surface-subtle)] transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-amber-50/50 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                        <FolderOpen className="w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-colors" />
                      </div>
                      <span className="text-[13.5px] font-medium text-[var(--foreground)] group-hover:text-[var(--foreground)] truncate" title={formatFolderName(folder.name)}>
                        {formatFolderName(folder.name)}
                      </span>
                    </Link>
                  ))}
                  {project.documentFolders.length > 5 && (
                    <div className="px-3 pt-2 pb-1 text-center border-t border-slate-50 mt-auto">
                      <Link href={`/documents/${project.id}`} className="text-[12px] font-medium text-[var(--muted-foreground)] hover:text-blue-600 transition-colors">
                        + {project.documentFolders.length - 5} thư mục khác
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6 px-4 text-center h-full">
                  <FolderOpen className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-[13px] text-[var(--muted-foreground)]">Chưa có thư mục nào</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:block pt-2">
        <h2 className="text-[17px] font-bold text-[var(--foreground)] mb-4 tracking-tight">Khối lượng thi công</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">

          <Link href={`/projects/${project.id}/field-progress`} className="group flex flex-col rounded-[var(--radius-lg)] sm:rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border)] p-3.5 sm:p-4 shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] hover:border-blue-200">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/60 flex items-center justify-center text-blue-600 mb-2 sm:mb-3 shrink-0 transition-transform duration-300 group-hover:scale-105">
              <ListTree className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <h3 className="font-bold text-[var(--foreground)] text-[13px] sm:text-[14px] mb-1">Hạng mục & Công việc</h3>
            <p className="text-[12px] sm:text-[12.5px] text-[var(--muted-foreground)] leading-relaxed mb-3 line-clamp-2 sm:line-clamp-none">Quản lý danh mục hạng mục, công việc, đơn vị và khối lượng thiết kế của công trình.</p>
            <div className="mt-auto pt-2.5 sm:pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <span className={`text-[11px] sm:text-[12px] font-semibold ${hasWbs ? 'text-emerald-600' : 'text-[var(--muted-foreground)] opacity-70'}`}>
                {hasWbs ? 'Đã thiết lập' : 'Chưa thiết lập'}
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--muted-foreground)] opacity-70 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {hasWbs ? (
            <Link href={`/projects/${project.id}/field-progress/daily`} className="group flex flex-col rounded-[var(--radius-lg)] sm:rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border)] p-3.5 sm:p-4 shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] hover:border-emerald-200">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 flex items-center justify-center text-emerald-600 mb-2 sm:mb-3 shrink-0 transition-transform duration-300 group-hover:scale-105">
                <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="font-bold text-[var(--foreground)] text-[13px] sm:text-[14px] mb-1">Khối lượng thực hiện</h3>
              <p className="text-[12px] sm:text-[12.5px] text-[var(--muted-foreground)] leading-relaxed mb-3 line-clamp-2 sm:line-clamp-none">Cập nhật và theo dõi khối lượng thi công thực tế theo từng ngày.</p>
              <div className="mt-auto pt-2.5 sm:pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] sm:text-[12px] font-semibold text-[var(--muted-foreground)]">
                  Cập nhật khối lượng
                </span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--muted-foreground)] opacity-70 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ) : (
            <div aria-disabled="true" className="group flex flex-col rounded-[var(--radius-lg)] sm:rounded-[var(--radius-xl)] bg-[var(--surface-subtle)] border border-[var(--border)] p-3.5 sm:p-4 cursor-not-allowed opacity-60">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600/50 mb-2 sm:mb-3 shrink-0">
                <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="font-bold text-[var(--foreground)] text-[13px] sm:text-[14px] mb-1">Khối lượng thực hiện</h3>
              <p className="text-[12px] sm:text-[12.5px] text-[var(--muted-foreground)] leading-relaxed mb-3 line-clamp-2 sm:line-clamp-none">Cập nhật và theo dõi khối lượng thi công thực tế theo từng ngày.</p>
              <div className="mt-auto pt-2.5 sm:pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] sm:text-[12px] font-semibold text-[var(--muted-foreground)] opacity-70">
                  Cần thiết lập WBS
                </span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--border)] flex items-center justify-center text-slate-300">
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
            </div>
          )}

          {hasWbs ? (
            <Link href={`/projects/${project.id}/field-progress/summary`} className="group flex flex-col rounded-[var(--radius-lg)] sm:rounded-[var(--radius-xl)] bg-[var(--surface)] border border-[var(--border)] p-3.5 sm:p-4 shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] hover:border-indigo-200">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/60 flex items-center justify-center text-indigo-600 mb-2 sm:mb-3 shrink-0 transition-transform duration-300 group-hover:scale-105">
                <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="font-bold text-[var(--foreground)] text-[13px] sm:text-[14px] mb-1">Tổng hợp khối lượng</h3>
              <p className="text-[12px] sm:text-[12.5px] text-[var(--muted-foreground)] leading-relaxed mb-3 line-clamp-2 sm:line-clamp-none">Theo dõi khối lượng thiết kế, khối lượng đã thực hiện, lũy kế và tỷ lệ hoàn thành.</p>
              <div className="mt-auto pt-2.5 sm:pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] sm:text-[12px] font-semibold text-[var(--muted-foreground)]">
                  Báo cáo chi tiết
                </span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--muted-foreground)] opacity-70 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ) : (
            <div aria-disabled="true" className="group flex flex-col rounded-[var(--radius-lg)] sm:rounded-[var(--radius-xl)] bg-[var(--surface-subtle)] border border-[var(--border)] p-3.5 sm:p-4 cursor-not-allowed opacity-60">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600/50 mb-2 sm:mb-3 shrink-0">
                <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="font-bold text-[var(--foreground)] text-[13px] sm:text-[14px] mb-1">Tổng hợp khối lượng</h3>
              <p className="text-[12px] sm:text-[12.5px] text-[var(--muted-foreground)] leading-relaxed mb-3 line-clamp-2 sm:line-clamp-none">Theo dõi khối lượng thiết kế, khối lượng đã thực hiện, lũy kế và tỷ lệ hoàn thành.</p>
              <div className="mt-auto pt-2.5 sm:pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] sm:text-[12px] font-semibold text-[var(--muted-foreground)] opacity-70">
                  Cần thiết lập WBS
                </span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--border)] flex items-center justify-center text-slate-300">
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
