import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, MapPin, User, ListTree, FolderOpen, FileText, ClipboardCheck, BarChart2, Package } from "lucide-react";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { format } from "date-fns";
import { requireProjectAccessOrRedirect, canManageProjects } from "@/lib/rbac";

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await requireProjectAccessOrRedirect(resolvedParams.id);

  const canManage = canManageProjects(session);

  const project = await prisma.project.findUnique({
    where: { id: resolvedParams.id, deletedAt: null },
    include: {
      documentFolders: {
        where: { parentId: null }
      }
    }
  });

  if (!project) {
    notFound();
  }

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
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            {getStatusBadge(project.status)}
          </div>
          <p className="text-sm text-slate-500 mt-1">Mã: {project.code}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <Link href="/projects" className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-100 text-slate-900 h-9 sm:h-10 px-3 sm:px-4">
            Quay lại
          </Link>
          {canManage && (
            <>
              <Link href={`/projects/${project.id}/edit`} className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-100 text-slate-900 h-9 sm:h-10 px-3 sm:px-4">
                Sửa
              </Link>
              <div className="w-full sm:w-auto mt-2 sm:mt-0 flex justify-end">
                <DeleteProjectButton id={project.id} projectName={project.name} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Thông tin chung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-slate-500 flex items-center"><User className="h-4 w-4 mr-1"/> Chủ đầu tư</span>
                <p className="font-medium">{project.investor || "Chưa cập nhật"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 flex items-center"><MapPin className="h-4 w-4 mr-1"/> Địa điểm</span>
                <p className="font-medium">{project.location || "Chưa cập nhật"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 flex items-center"><Calendar className="h-4 w-4 mr-1"/> Ngày bắt đầu</span>
                <p className="font-medium">{project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : "Chưa cập nhật"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 flex items-center"><Calendar className="h-4 w-4 mr-1"/> Ngày dự kiến kết thúc</span>
                <p className="font-medium">{project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : "Chưa cập nhật"}</p>
              </div>
            </div>
            {project.description && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-slate-500 text-sm">Ghi chú</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center">
                <FolderOpen className="h-4 w-4 mr-2"/> Thư mục
              </CardTitle>
              <Link href={`/documents/${project.id}`} className="text-xs text-blue-600 hover:underline">
                Quản lý &rarr;
              </Link>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm text-slate-600">
                {project.documentFolders.length > 0 ? (
                  <>
                    {project.documentFolders.slice(0, 4).map(folder => (
                      <li key={folder.id} className="flex items-center">
                        <FolderOpen className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="truncate">{folder.name}</span>
                      </li>
                    ))}
                    {project.documentFolders.length > 4 && (
                      <li className="pt-2">
                        <Link href={`/documents/${project.id}`} className="text-xs text-blue-600 hover:underline">
                          + {project.documentFolders.length - 4} thư mục khác
                        </Link>
                      </li>
                    )}
                  </>
                ) : <li>Chưa có thư mục</li>}
              </ul>
            </CardContent>
          </Card>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mt-6 md:mt-8 mb-3 md:mb-4">Các phân hệ quản lý</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Link href={`/projects/${project.id}/field-progress`} className="block group">
          <Card className="hover:border-blue-400 hover:shadow-lg transition-all h-full border-2 border-slate-200">
            <CardContent className="p-4 md:p-5 flex flex-row items-center md:flex-col md:text-center md:space-y-3 gap-4 md:gap-0">
              <div className="shrink-0 bg-blue-50 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all shadow-sm">
                <ListTree className="h-6 w-6 md:h-7 md:w-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Bảng khối lượng gốc</h3>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed mt-0.5 line-clamp-2 md:line-clamp-none">Thiết lập hạng mục, công việc, mũi thi công.</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${project.id}/field-progress/daily`} className="block group">
          <Card className="hover:border-emerald-400 hover:shadow-lg transition-all h-full border-2 border-slate-200">
            <CardContent className="p-4 md:p-5 flex flex-row items-center md:flex-col md:text-center md:space-y-3 gap-4 md:gap-0">
              <div className="shrink-0 bg-emerald-50 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 group-hover:scale-110 transition-all shadow-sm">
                <ClipboardCheck className="h-6 w-6 md:h-7 md:w-7 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Nhập khối lượng theo ngày</h3>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed mt-0.5 line-clamp-2 md:line-clamp-none">Nhập khối lượng thực hiện theo từng ngày.</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${project.id}/field-progress/summary`} className="block group">
          <Card className="hover:border-indigo-400 hover:shadow-lg transition-all h-full border-2 border-slate-200">
            <CardContent className="p-4 md:p-5 flex flex-row items-center md:flex-col md:text-center md:space-y-3 gap-4 md:gap-0">
              <div className="shrink-0 bg-indigo-50 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 group-hover:scale-110 transition-all shadow-sm">
                <BarChart2 className="h-6 w-6 md:h-7 md:w-7 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Tổng hợp khối lượng</h3>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed mt-0.5 line-clamp-2 md:line-clamp-none">Theo dõi lũy kế, phát sinh và tỷ lệ hoàn thành.</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${project.id}/material-requests`} className="block group">
          <Card className="hover:border-amber-400 hover:shadow-lg transition-all h-full border-2 border-slate-200">
            <CardContent className="p-4 md:p-5 flex flex-row items-center md:flex-col md:text-center md:space-y-3 gap-4 md:gap-0">
              <div className="shrink-0 bg-amber-50 w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center group-hover:bg-amber-100 group-hover:scale-110 transition-all shadow-sm">
                <Package className="h-6 w-6 md:h-7 md:w-7 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Đề xuất vật tư</h3>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed mt-0.5 line-clamp-2 md:line-clamp-none">Tạo và theo dõi yêu cầu cấp vật tư.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
