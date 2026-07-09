export const dynamic = "force-dynamic";
export const revalidate = 0;
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { FolderOpen, Building2, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAccessibleProjectIds } from "@/lib/rbac";
import { getGlobalProjectContext } from "@/lib/project-context";
import { PageHeading, ContentCard, FilterBar } from "@/components/ui/enterprise";
import { Button } from "@/components/ui/button";

export default async function DocumentsOverviewPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; projectId?: string }>
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?reason=session_expired");
  }

  const params = await searchParams;
  const urlProjectId = typeof params.projectId === "string" ? params.projectId : undefined;
  const globalContext = await getGlobalProjectContext(session, urlProjectId);
  // We DO NOT redirect to globalContext.selectedProjectId here anymore.
  // "Route luôn thắng cookie/global state": if the user visits /documents, they should see "Toàn hệ thống".

  const q = params.q || "";

  const whereCondition: Prisma.ProjectWhereInput = {
    deletedAt: null,
  };

  if (q) {
    whereCondition.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }

  // Nếu không phải ADMIN/DIRECTOR thì chỉ lấy project mà user được assign
  const accessibleIds = await getAccessibleProjectIds(session);
  if (accessibleIds !== null) {
    whereCondition.id = { in: accessibleIds };
  }

  const projects = await prisma.project.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { documentFolders: { where: { deletedAt: null } } }
      },
      documents: {
        where: { deletedAt: null },
        select: { id: true }
      }
    }
  });

  return (
    <div className="app-page space-y-6">
      <PageHeading
        title="Quản lý tài liệu"
        description="Truy cập hồ sơ theo từng công trình và thư mục nghiệp vụ."
      />

      <ContentCard className="overflow-hidden">
        <div className="border-b border-slate-100 bg-white p-4 sm:p-5">
          <form className="flex max-w-2xl flex-col gap-3 sm:flex-row" method="GET" action="/documents">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
              <input 
                type="text" 
                name="q"
                defaultValue={q}
                placeholder="Tìm công trình theo tên hoặc mã..." 
                className="form-control h-11 pl-10 pr-4 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" className="h-11 px-6">
                Lọc dữ liệu
              </Button>
              {q && (
                <Link href="/documents">
                  <Button variant="secondary" className="h-11">
                    Xóa
                  </Button>
                </Link>
              )}
            </div>
          </form>
        </div>

        {projects.length > 0 ? (
          <div className="p-5 sm:p-6 bg-slate-50/50">
            {(() => {
              const count = projects.length;
              const density = count >= 25 ? "list" : count >= 10 ? "compact" : "comfortable";
              
              return (
                <div className={`${
                  density === 'list' 
                    ? 'flex flex-col gap-2' 
                    : density === 'compact'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                }`}>
                  {projects.map(project => (
                    <Link href={`/documents/${project.id}`} key={project.id} className="block group outline-none">
                      <div className={`${
                        density === 'list'
                          ? 'flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all'
                          : density === 'compact'
                            ? 'rounded-xl border border-slate-200/80 bg-white p-4 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full flex flex-col'
                            : 'rounded-[20px] border border-slate-200/80 bg-white p-5 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full flex flex-col'
                      }`}>
                        
                        {/* LIST VIEW */}
                        {density === 'list' ? (
                          <>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 shrink-0 rounded-lg bg-blue-50/80 flex items-center justify-center">
                                <FolderOpen className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 truncate text-[14px] leading-tight transition-colors">{project.name}</h3>
                                <p className="text-[12px] text-slate-500 font-medium truncate mt-0.5">{project.code}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 shrink-0">
                              <div className="flex items-center gap-1.5 text-[12px] text-slate-600 font-medium">
                                <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                                {project._count.documentFolders} thư mục
                              </div>
                              <div className="flex items-center gap-1.5 text-[12px] text-slate-600 font-medium w-[100px]">
                                <svg className="h-3.5 w-3.5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                {project.documents ? project.documents.length : 0} tài liệu
                              </div>
                            </div>
                          </>
                        ) : (
                          /* GRID VIEWS (Compact / Comfortable) */
                          <>
                            <div className="flex items-start gap-3.5 mb-4">
                              <div className={`${density === 'compact' ? 'h-10 w-10 rounded-lg' : 'h-12 w-12 rounded-xl'} bg-blue-50/80 flex items-center justify-center group-hover:bg-blue-100/80 group-hover:scale-105 transition-all duration-300 shrink-0 ring-4 ring-white shadow-sm`}>
                                <FolderOpen className={`${density === 'compact' ? 'h-5 w-5' : 'h-6 w-6'} text-blue-600 drop-shadow-sm`} />
                              </div>
                              <div className="flex-1 pt-1 min-w-0">
                                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 truncate text-[14px] sm:text-[15px] leading-tight mb-1 transition-colors" title={project.name}>{project.name}</h3>
                                <p className="text-[12px] sm:text-[13px] text-slate-500 font-medium flex items-center gap-1.5 truncate" title={project.code}>
                                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{project.code}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-slate-100/80">
                              <div className="flex items-center gap-5">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-6 w-6 rounded-md bg-amber-50 flex items-center justify-center shrink-0">
                                    <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
                                  </div>
                                  <span className="text-[13px] font-semibold text-slate-700">{project._count.documentFolders}</span>
                                  {density === 'comfortable' && <span className="text-[13px] text-slate-500">thư mục</span>}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="h-6 w-6 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                                    <svg className="h-3.5 w-3.5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                  </div>
                                  <span className="text-[13px] font-semibold text-slate-700">{project.documents ? project.documents.length : 0}</span>
                                  {density === 'comfortable' && <span className="text-[13px] text-slate-500">tài liệu</span>}
                                </div>
                              </div>
                              {project.updatedAt && density === 'comfortable' && (
                                <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 mt-0.5">
                                  <svg className="h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                  <span className="truncate">Hoạt động gần nhất: {new Date(project.updatedAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-8">
            <EmptyState 
              title="Không tìm thấy công trình" 
              description={q ? "Không có công trình nào khớp với từ khóa tìm kiếm." : "Bạn chưa được phân quyền vào dự án nào hoặc hệ thống chưa có dự án."} 
              icon={<Building2 className="h-12 w-12 text-slate-300" />}
            />
          </div>
        )}
      </ContentCard>
    </div>
  );
}
