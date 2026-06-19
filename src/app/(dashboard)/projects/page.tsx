import { EmptyState } from "@/components/ui/empty-state";
import prisma from "@/lib/prisma";
import { Building2, Plus, Search, ChevronLeft, ChevronRight, PenSquare, Eye, ClipboardList, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProjectStatus } from "@prisma/client";
import { format } from "date-fns";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewAllProjects, canManageProjects, getAccessibleProjectIds } from "@/lib/rbac";

const ITEMS_PER_PAGE = 15;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const q = params.q || "";
  const statusFilter = params.status || "";
  const currentPage = Number(params.page) || 1;

  const isHighLevel = canViewAllProjects(session);
  const canManage = canManageProjects(session);
  const isCommander = session.role === "CHIEF_COMMANDER";

  // Build where condition based on role
  const whereCondition: any = {
    deletedAt: null,
  };

  if (!isHighLevel) {
    const accessibleIds = await getAccessibleProjectIds(session);
    if (accessibleIds !== null) {
      whereCondition.id = { in: accessibleIds };
    }
  }

  if (q) {
    whereCondition.OR = [
      { code: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { investor: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (statusFilter) {
    whereCondition.status = statusFilter;
  }

  // Fetch total count for pagination
  const totalItems = await prisma.project.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const projects = await prisma.project.findMany({
    where: whereCondition,
    orderBy: { createdAt: 'desc' },
    take: ITEMS_PER_PAGE,
    skip: skip,
  });

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'PLANNING': return <StatusBadge variant="neutral">Chuẩn bị</StatusBadge>;
      case 'ACTIVE': return <StatusBadge variant="success">Đang thi công</StatusBadge>;
      case 'ON_HOLD': return <StatusBadge variant="warning">Tạm dừng</StatusBadge>;
      case 'COMPLETED': return <StatusBadge variant="success">Hoàn thành</StatusBadge>;
      case 'CANCELLED': return <StatusBadge variant="danger">Hủy</StatusBadge>;
      default: return <StatusBadge variant="neutral">{status}</StatusBadge>;
    }
  };

  const pageTitle = isCommander ? "Công trình của tôi" : "Quản lý Công trình";
  
  // Base URL for pagination links
  const baseUrl = `/projects?q=${encodeURIComponent(q)}&status=${encodeURIComponent(statusFilter)}`;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
        {canManage && (
          <Link href="/projects/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Tạo công trình
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-3 md:p-4 bg-white">
          <form className="flex flex-col sm:flex-row gap-3" method="GET" action="/projects">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                name="q"
                id="project-search"
                autoComplete="off"
                defaultValue={q}
                placeholder="Tìm kiếm mã, tên công trình, chủ đầu tư..." 
                className="w-full pl-9 pr-4 py-2 text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select 
                name="status"
                id="project-status-filter"
                defaultValue={statusFilter}
                className="flex-1 sm:w-auto px-3 py-2 text-sm text-slate-900 font-medium border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PLANNING">Chuẩn bị</option>
                <option value="ACTIVE">Đang thi công</option>
                <option value="ON_HOLD">Tạm dừng</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Hủy</option>
              </select>
              <button type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none h-10 px-5 py-2">
                Lọc
              </button>
              {(q || statusFilter) && (
                <Link href="/projects" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 h-10 px-4 py-2">
                  Xóa lọc
                </Link>
              )}
            </div>
          </form>
        </div>

        {projects.length > 0 ? (
          <>
            {/* Desktop View (lg and up) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold whitespace-nowrap">Mã công trình</th>
                    <th className="px-5 py-3.5 font-semibold whitespace-nowrap">Tên công trình</th>
                    <th className="px-5 py-3.5 font-semibold whitespace-nowrap">Chủ đầu tư</th>
                    <th className="px-5 py-3.5 font-semibold whitespace-nowrap">Địa điểm</th>
                    <th className="px-5 py-3.5 font-semibold whitespace-nowrap">Trạng thái</th>
                    <th className="px-5 py-3.5 font-semibold whitespace-nowrap">Thời gian</th>
                    <th className="px-5 py-3.5 font-semibold text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {projects.map(project => (
                    <tr key={project.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-4 font-semibold text-slate-900">{project.code}</td>
                      <td className="px-5 py-4">
                        <Link href={`/projects/${project.id}`} className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{project.investor || "—"}</td>
                      <td className="px-5 py-4 text-slate-700">{project.location || "—"}</td>
                      <td className="px-5 py-4">{getStatusBadge(project.status)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col text-[13px] text-slate-500 whitespace-nowrap gap-1">
                          <span><span className="text-slate-400">Bắt đầu:</span> {project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : '—'}</span>
                          <span><span className="text-slate-400">Kết thúc:</span> {project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-60 lg:group-hover:opacity-100 transition-opacity">
                          <Link href={`/projects/${project.id}`} className="inline-flex items-center justify-center rounded text-[13px] font-semibold transition-colors text-slate-700 hover:text-blue-700 hover:bg-blue-50 h-8 px-2.5" title="Xem chi tiết">
                            <Eye className="w-4 h-4 mr-1.5" /> Xem
                          </Link>
                          {canManage && (
                            <Link href={`/projects/${project.id}/edit`} className="inline-flex items-center justify-center rounded text-[13px] font-semibold transition-colors text-slate-700 hover:text-blue-700 hover:bg-blue-50 h-8 px-2.5" title="Chỉnh sửa">
                              <PenSquare className="w-4 h-4 mr-1.5" /> Sửa
                            </Link>
                          )}
                          <div className="w-px h-4 bg-slate-200 mx-1"></div>
                          <Link href={`/projects/${project.id}/field-progress/daily`} className="inline-flex items-center justify-center rounded text-[13px] font-semibold transition-colors text-emerald-600 hover:bg-emerald-50 h-8 px-2.5" title="Nhập khối lượng" aria-label={`Nhập khối lượng cho công trình ${project.name}`}>
                            Nhập KL
                          </Link>
                          <Link href={`/projects/${project.id}/field-progress/summary`} className="inline-flex items-center justify-center rounded text-[13px] font-semibold transition-colors text-indigo-600 hover:bg-indigo-50 h-8 px-2.5" title="Tổng hợp khối lượng" aria-label={`Tổng hợp khối lượng cho công trình ${project.name}`}>
                            Tổng hợp
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet View (< lg) */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/50">
              {projects.map(project => (
                <div key={project.id} className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm flex flex-col hover:shadow-md transition-shadow">
                  <div className="mb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[12px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md shrink-0">
                        {project.code}
                      </span>
                      {getStatusBadge(project.status)}
                    </div>
                    <Link href={`/projects/${project.id}`} className="text-[15px] font-bold text-blue-600 hover:text-blue-800 line-clamp-2 leading-tight">
                      {project.name}
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1.5 text-[13px] text-slate-600 mb-4">
                    <p className="truncate"><span className="text-slate-400">Chủ đầu tư:</span> <span className="font-medium text-slate-800">{project.investor || "—"}</span></p>
                    <p className="truncate"><span className="text-slate-400">Vị trí:</span> <span className="font-medium text-slate-800">{project.location || "—"}</span></p>
                    <div className="flex justify-between items-center text-slate-500 mt-1 bg-slate-50 p-2 rounded-md border border-slate-100">
                      <span>{project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : '—'}</span>
                      <span className="text-slate-300">→</span>
                      <span>{project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : '—'}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    <Link href={`/projects/${project.id}`} className="flex-1 inline-flex items-center justify-center rounded-lg text-[13px] font-semibold transition-colors border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-9">
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Chi tiết
                    </Link>
                    {canManage && (
                      <Link href={`/projects/${project.id}/edit`} className="flex-1 inline-flex items-center justify-center rounded-lg text-[13px] font-semibold transition-colors border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-9">
                        <PenSquare className="w-3.5 h-3.5 mr-1.5" /> Sửa
                      </Link>
                    )}
                    <div className="w-full flex gap-2 mt-1">
                      <Link href={`/projects/${project.id}/field-progress/daily`} className="flex-1 inline-flex items-center justify-center rounded-lg text-[13px] font-semibold transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100 h-9" title="Nhập khối lượng" aria-label={`Nhập khối lượng cho công trình ${project.name}`}>
                        <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Nhập KL
                      </Link>
                      <Link href={`/projects/${project.id}/field-progress/summary`} className="flex-1 inline-flex items-center justify-center rounded-lg text-[13px] font-semibold transition-colors bg-indigo-50 text-indigo-700 hover:bg-indigo-100 h-9" title="Tổng hợp khối lượng" aria-label={`Tổng hợp khối lượng cho công trình ${project.name}`}>
                        <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" /> Tổng hợp
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="border-t border-slate-200 p-4 bg-white flex items-center justify-between">
                <p className="text-sm text-slate-500 font-medium">
                  Hiển thị <span className="font-semibold text-slate-900">{skip + 1}</span> đến <span className="font-semibold text-slate-900">{Math.min(skip + ITEMS_PER_PAGE, totalItems)}</span> trong số <span className="font-semibold text-slate-900">{totalItems}</span> công trình
                </p>
                <div className="flex items-center gap-2">
                  <Link 
                    href={`${baseUrl}&page=${Math.max(1, currentPage - 1)}`}
                    className={`inline-flex items-center justify-center rounded-md h-9 w-9 border border-slate-300 transition-colors ${currentPage === 1 ? 'pointer-events-none opacity-50 bg-slate-50 text-slate-400' : 'bg-white hover:bg-slate-50 text-slate-700'}`}
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                  <span className="text-sm font-semibold text-slate-900 px-2">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <Link 
                    href={`${baseUrl}&page=${Math.min(totalPages, currentPage + 1)}`}
                    className={`inline-flex items-center justify-center rounded-md h-9 w-9 border border-slate-300 transition-colors ${currentPage === totalPages ? 'pointer-events-none opacity-50 bg-slate-50 text-slate-400' : 'bg-white hover:bg-slate-50 text-slate-700'}`}
                    aria-label="Trang sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12">
            <EmptyState 
              title={isCommander ? "Chưa được giao công trình" : "Không tìm thấy công trình"}
              description={isCommander ? "Bạn chưa được giao công trình nào. Vui lòng liên hệ Giám đốc hoặc Phó giám đốc." : (q || statusFilter ? "Không có dữ liệu phù hợp với bộ lọc hiện tại." : "Bắt đầu tạo công trình mới để quản lý.")}
              icon={<Building2 className="h-8 w-8 text-slate-400" />}
            />
          </div>
        )}
      </div>
    </div>
  );
}
