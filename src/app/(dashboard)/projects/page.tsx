import { EmptyState } from "@/components/ui/empty-state";
import prisma from "@/lib/prisma";
import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProjectStatus } from "@prisma/client";
import { format } from "date-fns";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const params = await searchParams;
  const q = params.q || "";
  const statusFilter = params.status || "";

  const whereCondition: any = {
    deletedAt: null,
  };

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
      case 'PLANNING': return <Badge variant="neutral">Lập kế hoạch</Badge>;
      case 'ACTIVE': return <Badge variant="success">Đang thi công</Badge>;
      case 'ON_HOLD': return <Badge variant="warning">Tạm dừng</Badge>;
      case 'COMPLETED': return <Badge variant="default">Hoàn thành</Badge>;
      case 'CANCELLED': return <Badge variant="error">Đã hủy</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const buttonClass = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-100 text-slate-900 h-10 px-4 py-2";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Công trình</h1>
        <Link href="/projects/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2">
          <Plus className="h-4 w-4 mr-2" />
          Tạo công trình
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-4 bg-slate-50">
          <form className="flex flex-col sm:flex-row gap-4" method="GET" action="/projects">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                name="q"
                defaultValue={q}
                placeholder="Tìm kiếm công trình..." 
                className="w-full pl-9 pr-4 py-2 text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select 
              name="status"
              defaultValue={statusFilter}
              className="px-4 py-2 text-sm text-slate-900 font-medium border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PLANNING">Lập kế hoạch</option>
              <option value="ACTIVE">Đang thi công</option>
              <option value="ON_HOLD">Tạm dừng</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
            <button type="submit" className={buttonClass}>Lọc</button>
            {(q || statusFilter) && (
              <Link href="/projects" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 text-slate-700 h-10 px-4 py-2">
                Xóa
              </Link>
            )}
          </form>
        </div>

        {projects.length > 0 ? (
          <>
            {/* Desktop View */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-900">
                  <tr>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Mã CT</th>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Tên công trình</th>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Chủ đầu tư</th>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Địa điểm</th>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Trạng thái</th>
                    <th className="px-6 py-3 font-semibold whitespace-nowrap">Ngày BĐ - KT</th>
                    <th className="px-6 py-3 font-semibold text-right whitespace-nowrap">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {projects.map(project => (
                    <tr key={project.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{project.code}</td>
                      <td className="px-6 py-4">
                        <Link href={`/projects/${project.id}`} className="font-medium text-blue-600 hover:underline">
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">{project.investor || "-"}</td>
                      <td className="px-6 py-4">{project.location || "-"}</td>
                      <td className="px-6 py-4">{getStatusBadge(project.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs text-slate-500 whitespace-nowrap">
                          <span>BĐ: {project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : '-'}</span>
                          <span>KT: {project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Link href={`/projects/${project.id}`} className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-100 text-slate-900 h-8 px-3">
                          Xem
                        </Link>
                        <Link href={`/projects/${project.id}/edit`} className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-100 text-slate-900 h-8 px-3 ml-2">
                          Sửa
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet View */}
            <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50">
              {projects.map(project => (
                <div key={project.id} className="p-4 space-y-3 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          {project.code}
                        </span>
                        {getStatusBadge(project.status)}
                      </div>
                      <Link href={`/projects/${project.id}`} className="text-base font-medium text-blue-600 hover:underline line-clamp-2">
                        {project.name}
                      </Link>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1 text-sm text-slate-600">
                    <p><span className="text-slate-500">CĐT:</span> {project.investor || "-"}</p>
                    <p><span className="text-slate-500">Vị trí:</span> {project.location || "-"}</p>
                    <p className="text-xs text-slate-500">
                      Thời gian: {project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : '-'} đến {project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>


                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex gap-2">
                      <Link href={`/projects/${project.id}`} className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-100 text-slate-900 h-9 px-3">
                        Xem
                      </Link>
                      <Link href={`/projects/${project.id}/edit`} className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-100 text-slate-900 h-9 px-3">
                        Sửa
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8">
            <EmptyState 
              title="Không tìm thấy công trình" 
              description={q || statusFilter ? "Không có dữ liệu phù hợp với bộ lọc hiện tại." : "Bắt đầu tạo công trình mới để quản lý."} 
              icon={<Building2 className="h-6 w-6 text-slate-500" />}
            />
          </div>
        )}
      </div>
    </div>
  );
}
