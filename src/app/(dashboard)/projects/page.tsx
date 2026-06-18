import { EmptyState } from "@/components/ui/empty-state";
import prisma from "@/lib/prisma";
import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProjectStatus } from "@prisma/client";
import { format } from "date-fns";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewAllProjects, canManageProjects, getAccessibleProjectIds, ROLE_DISPLAY_NAMES } from "@/lib/rbac";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const q = params.q || "";
  const statusFilter = params.status || "";

  const isHighLevel = canViewAllProjects(session);
  const canManage = canManageProjects(session);
  const isCommander = session.role === "CHIEF_COMMANDER";

  // Build where condition based on role
  const whereCondition: any = {
    deletedAt: null,
  };

  // If user can't view all projects, filter to assigned ones
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

  const projects = await prisma.project.findMany({
    where: whereCondition,
    orderBy: { createdAt: 'desc' }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
        {canManage && (
          <Link href="/projects/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2">
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
                defaultValue={q}
                placeholder="Tìm kiếm công trình..." 
                className="w-full pl-9 pr-4 py-2 text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select 
                name="status"
                id="project-status-filter"
                defaultValue={statusFilter}
                className="flex-1 sm:w-auto px-3 py-2 text-sm text-slate-900 font-medium border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PLANNING">Chuẩn bị</option>
                <option value="ACTIVE">Đang thi công</option>
                <option value="ON_HOLD">Tạm dừng</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Hủy</option>
              </select>
              <button type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2">Lọc</button>
              {(q || statusFilter) && (
                <Link href="/projects" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 h-10 px-3 py-2">
                  Xóa
                </Link>
              )}
            </div>
          </form>
        </div>

        {projects.length > 0 ? (
          <>
            {/* Desktop View */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-900">
                  <tr>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Mã công trình</th>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Tên công trình</th>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Chủ đầu tư</th>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Địa điểm</th>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Trạng thái</th>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Ngày bắt đầu - Kết thúc</th>
                    <th className="px-6 py-3 font-semibold text-right whitespace-nowrap">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {projects.map(project => (
                    <tr key={project.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{project.code}</td>
                      <td className="px-6 py-4">
                        <Link href={`/projects/${project.id}`} className="font-medium text-blue-600 hover:underline">
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">{project.investor || "Chưa cập nhật"}</td>
                      <td className="px-6 py-4">{project.location || "Chưa cập nhật"}</td>
                      <td className="px-6 py-4">{getStatusBadge(project.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs text-slate-500 whitespace-nowrap">
                          <span>Bắt đầu: {project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : 'Chưa cập nhật'}</span>
                          <span>Kết thúc: {project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : 'Chưa cập nhật'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Link href={`/projects/${project.id}`} className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 h-8 px-3">
                          Xem
                        </Link>
                        {canManage && (
                          <Link href={`/projects/${project.id}/edit`} className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 h-8 px-3 ml-2">
                            Sửa
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet View */}
            <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50">
              {projects.map(project => (
                <div key={project.id} className="p-3 space-y-2 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                        {project.code}
                      </span>
                      {getStatusBadge(project.status)}
                    </div>
                    <Link href={`/projects/${project.id}`} className="text-sm font-bold text-blue-600 hover:underline line-clamp-2 leading-tight">
                      {project.name}
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-0.5 text-xs text-slate-600">
                    <p className="truncate"><span className="text-slate-400">Chủ đầu tư:</span> <span className="font-medium text-slate-700">{project.investor || "Chưa cập nhật"}</span></p>
                    <p className="truncate"><span className="text-slate-400">Vị trí:</span> <span className="font-medium text-slate-700">{project.location || "Chưa cập nhật"}</span></p>
                    <div className="text-[11px] text-slate-500 mt-1">
                      <div className="flex flex-col gap-0.5">
                        <span>Bắt đầu: {project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : 'Chưa cập nhật'}</span>
                        <span>Kết thúc: {project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : 'Chưa cập nhật'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex gap-2">
                    <Link href={`/projects/${project.id}`} className="flex-1 inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-8 px-2">
                      Chi tiết
                    </Link>
                    {canManage && (
                      <Link href={`/projects/${project.id}/edit`} className="flex-1 inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-8 px-2">
                        Sửa
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8">
            <EmptyState 
              title={isCommander ? "Chưa được giao công trình" : "Không tìm thấy công trình"}
              description={isCommander ? "Bạn chưa được giao công trình nào. Vui lòng liên hệ Giám đốc hoặc Phó giám đốc." : (q || statusFilter ? "Không có dữ liệu phù hợp với bộ lọc hiện tại." : "Bắt đầu tạo công trình mới để quản lý.")}
              icon={<Building2 className="h-6 w-6 text-slate-500" />}
            />
          </div>
        )}
      </div>
    </div>
  );
}
