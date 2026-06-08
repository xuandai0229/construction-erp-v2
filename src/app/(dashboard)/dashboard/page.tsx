import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import prisma from '@/lib/prisma';
import { Building2, FolderOpen, FileText, Users } from 'lucide-react';
import { format } from 'date-fns';

export default async function DashboardPage() {
  const [
    totalProjects,
    activeProjects,
    completedProjects,
    totalDocuments,
    totalContracts,
    totalSuppliers,
    recentReports
  ] = await Promise.all([
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.project.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    prisma.project.count({ where: { status: 'COMPLETED', deletedAt: null } }),
    prisma.document.count({ where: { deletedAt: null } }),
    prisma.contract.count({ where: { deletedAt: null } }),
    prisma.supplier.count({ where: { deletedAt: null } }),
    prisma.siteReport.findMany({
      take: 5,
      where: { project: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      include: { author: true, project: true }
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
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng công trình</CardTitle>
            <Building2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-slate-500">
              {activeProjects} đang thi công, {completedProjects} hoàn thành
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Số tài liệu</CardTitle>
            <FolderOpen className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Số hợp đồng</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContracts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nhà cung cấp</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuppliers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Báo cáo hiện trường gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {recentReports.length > 0 ? (
              <div className="space-y-4">
                {recentReports.map(report => (
                  <div key={report.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-slate-900">{report.project.name}</p>
                      <p className="text-sm text-slate-500">{report.workDone.substring(0, 50)}...</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">{format(new Date(report.reportDate), 'dd/MM/yyyy')}</p>
                      <p className="text-xs text-slate-500">{report.author.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-slate-500">Chưa có báo cáo nào</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
