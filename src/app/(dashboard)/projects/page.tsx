import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import prisma from "@/lib/prisma";
import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProjectStatus } from "@prisma/client";

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
      { owner: { contains: q, mode: 'insensitive' } },
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Công trình</h1>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            Tạo công trình
          </Link>
        </Button>
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
                placeholder="Tìm mã, tên công trình, chủ đầu tư..." 
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select 
              name="status"
              defaultValue={statusFilter}
              className="px-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PLANNING">Lập kế hoạch</option>
              <option value="ACTIVE">Đang thi công</option>
              <option value="ON_HOLD">Tạm dừng</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
            <Button type="submit" variant="outline">Lọc</Button>
            {(q || statusFilter) && (
              <Button type="button" variant="ghost" asChild>
                <Link href="/projects">Xóa</Link>
              </Button>
            )}
          </form>
        </div>

        {projects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-900">
                <tr>
                  <th className="px-6 py-3 font-semibold">Mã CT</th>
                  <th className="px-6 py-3 font-semibold">Tên công trình</th>
                  <th className="px-6 py-3 font-semibold">Chủ đầu tư</th>
                  <th className="px-6 py-3 font-semibold">Địa điểm</th>
                  <th className="px-6 py-3 font-semibold">Trạng thái</th>
                  <th className="px-6 py-3 font-semibold">Ngày BĐ - KT</th>
                  <th className="px-6 py-3 font-semibold text-right">Hành động</th>
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
                    <td className="px-6 py-4">{project.owner || "-"}</td>
                    <td className="px-6 py-4">{project.location || "-"}</td>
                    <td className="px-6 py-4">{getStatusBadge(project.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs text-slate-500 whitespace-nowrap">
                        <span>BĐ: {project.startDate ? new Date(project.startDate).toLocaleDateString('vi-VN') : '-'}</span>
                        <span>KT: {project.endDate ? new Date(project.endDate).toLocaleDateString('vi-VN') : '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <Button variant="outline" asChild className="h-8 text-xs px-3">
                        <Link href={`/projects/${project.id}/edit`}>Sửa</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
