import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, MapPin, User, ListTree, FolderOpen, FileText, ClipboardCheck, History } from "lucide-react";
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

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center"><FolderOpen className="h-4 w-4 mr-2"/> Thư mục mặc định</CardTitle>
            </CardHeader>
            <CardContent>
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
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mt-8 mb-4">Các phân hệ quản lý</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-blue-300 transition-colors cursor-pointer group">
          <CardContent className="p-6 text-center space-y-2">
            <div className="mx-auto bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <ListTree className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium">Hạng mục (WBS)</h3>
            <p className="text-xs text-slate-500">Quản lý các hạng mục thi công, tiến độ và ngân sách chi tiết.</p>
          </CardContent>
        </Card>
        
        <Card className="hover:border-blue-300 transition-colors cursor-pointer group">
          <CardContent className="p-6 text-center space-y-2">
            <div className="mx-auto bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium">Hợp đồng</h3>
            <p className="text-xs text-slate-500">Quản lý hợp đồng thầu chính, thầu phụ và nhà cung cấp.</p>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-300 transition-colors cursor-pointer group">
          <CardContent className="p-6 text-center space-y-2">
            <div className="mx-auto bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <ClipboardCheck className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium">Báo cáo hiện trường</h3>
            <p className="text-xs text-slate-500">Ghi nhận nhật ký thi công, thời tiết, sự cố hằng ngày.</p>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-300 transition-colors cursor-pointer group">
          <CardContent className="p-6 text-center space-y-2">
            <div className="mx-auto bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <History className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium">Nhật ký hệ thống</h3>
            <p className="text-xs text-slate-500">Truy vết mọi thay đổi và cập nhật trên dự án này.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
