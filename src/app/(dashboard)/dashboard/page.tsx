import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import prisma from '@/lib/prisma';
import { Building2, FolderOpen, FileText, Users } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { requireAuth, getAccessibleProjectIds } from '@/lib/rbac';

export default async function DashboardPage() {
  const session = await requireAuth();
  const accessibleProjectIds = await getAccessibleProjectIds(session);
  const projectWhere = accessibleProjectIds === null
    ? { deletedAt: null }
    : { deletedAt: null, id: { in: accessibleProjectIds } };
  const relatedProjectWhere = accessibleProjectIds === null
    ? { deletedAt: null }
    : { deletedAt: null, id: { in: accessibleProjectIds } };

  const [
    totalProjects,
    activeProjects,
    completedProjects,
    totalDocuments,
    totalContracts,
    totalSuppliers,
    recentReports
  ] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.project.count({ where: { ...projectWhere, status: 'ACTIVE' } }),
    prisma.project.count({ where: { ...projectWhere, status: 'COMPLETED' } }),
    prisma.document.count({ where: { deletedAt: null, project: relatedProjectWhere } }),
    prisma.contract.count({ where: { deletedAt: null, project: relatedProjectWhere } }),
    accessibleProjectIds === null
      ? prisma.supplier.count({ where: { deletedAt: null } })
      : Promise.resolve(0),
    prisma.siteReport.findMany({
      take: 5,
      where: { project: relatedProjectWhere },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: true, project: true }
    })
  ]);

  const hasData = totalProjects > 0 || totalDocuments > 0 || totalContracts > 0 || totalSuppliers > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
        <EmptyState 
          title="Chưa có dữ liệu hệ thống" 
          description="Hệ thống ERP vừa được khởi tạo. Hãy bắt đầu bằng cách thêm mới dự án, tài liệu hoặc nhà cung cấp." 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
      
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Tổng công trình</CardTitle>
            <Building2 className="h-4 w-4 text-slate-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{totalProjects}</div>
            <p className="text-[10px] md:text-xs text-slate-500">
              {activeProjects} đang thi công, {completedProjects} hoàn thành
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Số tài liệu</CardTitle>
            <FolderOpen className="h-4 w-4 text-slate-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{totalDocuments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Số hợp đồng</CardTitle>
            <FileText className="h-4 w-4 text-slate-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{totalContracts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Nhà cung cấp</CardTitle>
            <Users className="h-4 w-4 text-slate-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{totalSuppliers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 md:col-span-4">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Báo cáo hiện trường gần đây</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {recentReports.length > 0 ? (
              <div className="space-y-4">
                {recentReports.map(report => (
                  <div key={report.id} className="flex items-start md:items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0 flex-col md:flex-row gap-2 md:gap-0">
                    <div>
                      <p className="font-medium text-slate-900 text-sm md:text-base">{report.project.name}</p>
                      <p className="text-xs md:text-sm text-slate-500">{report.title || "Báo cáo hiện trường"}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xs md:text-sm font-medium text-slate-900">{format(new Date(report.reportDate), 'dd/MM/yyyy')}</p>
                      <p className="text-[10px] md:text-xs text-slate-500">{report.createdBy.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 md:py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm md:text-base font-semibold text-slate-700">Chưa có báo cáo hiện trường</p>
                <p className="text-xs md:text-sm text-slate-500 mt-1 mb-4">Các cập nhật tiến độ công trường sẽ hiển thị tại đây.</p>
                <Link href="/projects" className="text-xs md:text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors">
                  Xem danh sách Công trình
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
