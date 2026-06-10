import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, MapPin, User, ListTree, FolderOpen, FileText, ClipboardCheck, History, BarChart2 } from "lucide-react";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { format } from "date-fns";

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
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

  const buttonClass = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-100 text-slate-900 h-10 px-4 py-2";

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
        <div className="flex flex-wrap gap-2">
          <Link href="/projects" className={buttonClass}>
            Quay lại danh sách
          </Link>
          <Link href={`/projects/${project.id}/edit`} className={buttonClass}>
            Sửa thông tin
          </Link>
          <DeleteProjectButton id={project.id} projectName={project.name} />
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
                <span className="text-slate-500 flex items-center"><Calendar className="h-4 w-4 mr-1"/> Ngày dự kiến KT</span>
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
            <CardContent className="flex-1 overflow-y-auto max-h-48">
              <ul className="space-y-2 text-sm text-slate-600">
                {project.documentFolders.length > 0 ? project.documentFolders.map(folder => (
                  <li key={folder.id} className="flex items-center">
                    <FolderOpen className="h-3 w-3 mr-2 text-blue-500" />
                    {folder.name}
                  </li>
                )) : <li>Chưa có thư mục</li>}
              </ul>
            </CardContent>
          </Card>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mt-8 mb-4">Các phân hệ quản lý</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href={`/projects/${project.id}/field-progress`} className="block group">
          <Card className="hover:border-blue-400 hover:shadow-lg transition-all h-full border-2">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto bg-blue-50 w-14 h-14 rounded-xl flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all shadow-sm">
                <ListTree className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Bảng khối lượng gốc</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Thiết lập hạng mục, công việc, mũi thi công và khối lượng thiết kế.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${project.id}/field-progress/daily`} className="block group">
          <Card className="hover:border-emerald-400 hover:shadow-lg transition-all h-full border-2">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto bg-emerald-50 w-14 h-14 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 group-hover:scale-110 transition-all shadow-sm">
                <ClipboardCheck className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Nhập khối lượng theo ngày</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Nhập khối lượng thực hiện từng ngày cho từng công việc.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${project.id}/field-progress/summary`} className="block group">
          <Card className="hover:border-indigo-400 hover:shadow-lg transition-all h-full border-2">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto bg-indigo-50 w-14 h-14 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 group-hover:scale-110 transition-all shadow-sm">
                <BarChart2 className="h-7 w-7 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Tổng hợp khối lượng</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Theo dõi lũy kế, phát sinh theo kỳ, tỷ lệ hoàn thành và ngày có phát sinh.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/audit?project=${project.id}`} className="block group">
          <Card className="hover:border-slate-400 hover:shadow-lg transition-all h-full border-2">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto bg-slate-100 w-14 h-14 rounded-xl flex items-center justify-center group-hover:bg-slate-200 group-hover:scale-110 transition-all shadow-sm">
                <History className="h-7 w-7 text-slate-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Nhật ký hệ thống</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Xem lịch sử thay đổi dữ liệu của công trình.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
