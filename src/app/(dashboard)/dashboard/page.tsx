import { Card, CardContent } from '@/components/ui/card';
import prisma from '@/lib/prisma';
import { Building2, AlertTriangle, ArrowRight, Activity, Clock, FileText, FileCheck, ClipboardList, CalendarCheck, Layers } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import Link from 'next/link';
import { requireAuth, getAccessibleProjectIds } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default async function DashboardPage() {
  const session = await requireAuth();
  const accessibleProjectIds = await getAccessibleProjectIds(session);
  const projectWhere = accessibleProjectIds === null
    ? { deletedAt: null }
    : { deletedAt: null, id: { in: accessibleProjectIds } };
  const relatedProjectWhere = accessibleProjectIds === null
    ? { deletedAt: null }
    : { deletedAt: null, id: { in: accessibleProjectIds } };

  // Vietnam timezone: UTC+7
  const now = new Date();
  const todayStartUTC = new Date(startOfDay(now).getTime() - 7 * 60 * 60 * 1000);
  const todayEndUTC = new Date(endOfDay(now).getTime() - 7 * 60 * 60 * 1000);

  const [
    activeProjects,
    completedProjects,
    entriesToday,
    attentionProjectsCount,
    recentProjects,
    recentDocs,
    recentEntries,
    recentContracts
  ] = await Promise.all([
    prisma.project.count({ where: { ...projectWhere, status: 'ACTIVE' } }),
    prisma.project.count({ where: { ...projectWhere, status: 'COMPLETED' } }),

    // Count entries created today (Vietnam time)
    prisma.fieldProgressEntry.count({
      where: {
        deletedAt: null,
        project: relatedProjectWhere,
        createdAt: { gte: todayStartUTC, lte: todayEndUTC }
      }
    }),

    prisma.project.count({
      where: {
        ...projectWhere,
        status: 'ACTIVE',
        OR: [
          {
            fieldProgressTemplates: {
              none: { deletedAt: null },
            },
          },
          {
            fieldProgressEntries: {
              none: {
                deletedAt: null,
                createdAt: { gte: todayStartUTC, lte: todayEndUTC },
              },
            },
          },
        ],
      },
    }),

    // Top 3 projects to watch — include WBS/template info for status indicators
    prisma.project.findMany({
      where: { ...projectWhere, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: {
        id: true, name: true, investor: true, status: true, startDate: true, updatedAt: true,
        fieldProgressTemplates: {
          where: { deletedAt: null },
          select: { id: true },
          take: 1,
        },
        _count: {
          select: {
            fieldProgressEntries: {
              where: {
                deletedAt: null,
                createdAt: { gte: todayStartUTC, lte: todayEndUTC }
              }
            }
          }
        }
      }
    }),

    // Recent activities (documents, entries, contracts)
    prisma.document.findMany({ where: { deletedAt: null, project: relatedProjectWhere }, orderBy: { createdAt: 'desc' }, take: 3, include: { project: true } }),
    prisma.fieldProgressEntry.findMany({ where: { deletedAt: null, project: relatedProjectWhere }, orderBy: { createdAt: 'desc' }, take: 3, include: { project: true, item: true } }),
    prisma.contract.findMany({ where: { deletedAt: null, project: relatedProjectWhere }, orderBy: { createdAt: 'desc' }, take: 3, include: { project: true } })
  ]);

  const activities = [
    ...recentDocs.map(d => ({ type: 'DOCUMENT' as const, date: d.createdAt, title: `Tải lên tài liệu "${d.originalName}"`, project: d.project?.name || 'Hệ thống chung', status: null as string | null })),
    ...recentEntries.map(e => ({ type: 'PROGRESS' as const, date: e.createdAt, title: `Nhập khối lượng hiện trường`, project: e.project?.name || 'Hệ thống chung', status: e.status as string | null })),
    ...recentContracts.map(c => ({ type: 'CONTRACT' as const, date: c.createdAt, title: `Hợp đồng "${c.name}" ${c.status === 'ACTIVE' ? 'có hiệu lực' : 'đã cập nhật'}`, project: c.project?.name || 'Hệ thống chung', status: null as string | null }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'DOCUMENT': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'PROGRESS': return <Activity className="w-4 h-4 text-emerald-500" />;
      case 'CONTRACT': return <FileCheck className="w-4 h-4 text-orange-500" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActivityBadge = (activity: { type: string; status: string | null }) => {
    if (activity.type === 'PROGRESS') {
      if (activity.status === 'APPROVED') return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600">Đã duyệt</span>;
      if (activity.status === 'SUBMITTED') return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">Đã gửi</span>;
      if (activity.status === 'DRAFT') return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">Nháp</span>;
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600">Khối lượng</span>;
    }
    switch (activity.type) {
      case 'DOCUMENT': return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">Tài liệu</span>;
      case 'CONTRACT': return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-600">Hợp đồng</span>;
      default: return null;
    }
  };

  // Count every accessible ACTIVE project that lacks WBS or today's progress.
  const totalNeedAttention = attentionProjectsCount;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto bg-slate-50/30 min-h-full">
      {/* Header text */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mb-2">Tổng quan</h1>
        <p className="text-sm text-slate-500 font-medium">Theo dõi nhanh tình hình công trình và cập nhật hiện trường.</p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[13px] font-bold text-slate-900 mb-1">Công trình đang thi công</p>
              <h3 className="text-[32px] font-extrabold text-blue-600 leading-none mb-2">{activeProjects}</h3>
              <p className="text-[11px] font-medium text-slate-400">{activeProjects} đang thi công, {completedProjects} hoàn thành</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[13px] font-bold text-slate-900 mb-1">Cập nhật hôm nay</p>
              <h3 className={cn("text-[32px] font-extrabold leading-none mb-2", entriesToday > 0 ? "text-emerald-600" : "text-blue-600")}>{entriesToday}</h3>
              <p className="text-[11px] font-medium text-slate-400">{entriesToday > 0 ? `${entriesToday} bản ghi khối lượng` : 'Chưa có cập nhật'}</p>
            </div>
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", entriesToday > 0 ? "bg-emerald-50" : "bg-slate-50")}>
              <CalendarCheck className={cn("w-5 h-5", entriesToday > 0 ? "text-emerald-600" : "text-slate-400")} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[13px] font-bold text-slate-900 mb-1">Lượt nhập hôm nay</p>
              <h3 className={cn("text-[32px] font-extrabold leading-none mb-2", entriesToday > 0 ? "text-indigo-600" : "text-blue-600")}>{entriesToday}</h3>
              <p className="text-[11px] font-medium text-slate-400">{entriesToday > 0 ? `${entriesToday} bản ghi khối lượng` : 'Chưa nhập khối lượng'}</p>
            </div>
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", entriesToday > 0 ? "bg-indigo-50" : "bg-slate-50")}>
              <ClipboardList className={cn("w-5 h-5", entriesToday > 0 ? "text-indigo-600" : "text-slate-400")} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-5 flex justify-between items-start">
            <div>
              <p className="text-[13px] font-bold text-slate-900 mb-1">Cần chú ý</p>
              <h3 className={cn("text-[32px] font-extrabold leading-none mb-2", totalNeedAttention > 0 ? "text-orange-600" : "text-blue-600")}>{totalNeedAttention}</h3>
              <p className="text-[11px] font-medium text-slate-400">{totalNeedAttention > 0 ? "Cần kiểm tra" : "Không có việc cần xử lý"}</p>
            </div>
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", totalNeedAttention > 0 ? "bg-orange-50" : "bg-emerald-50")}>
              <AlertTriangle className={cn("w-5 h-5", totalNeedAttention > 0 ? "text-orange-500" : "text-emerald-500")} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6 mt-6 items-start">

        {/* Left Col (60%) */}
        <div className="lg:col-span-3">
          <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white h-fit">
            <div className="p-5 sm:px-6 sm:py-5 border-b border-slate-100/60 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" /> Công trình cần theo dõi
              </h2>
              <Link href="/projects" className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <CardContent className="p-0">
              {recentProjects.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                    <Building2 className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Chưa có công trình cần theo dõi</p>
                  <Button asChild variant="ghost" className="text-blue-600 text-xs mt-1">
                    <Link href="/projects">Xem danh sách công trình</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentProjects.map(project => {
                    const hasWBS = project.fieldProgressTemplates.length > 0;
                    const todayEntryCount = project._count.fieldProgressEntries;
                    return (
                      <div key={project.id} className="p-4 sm:px-6 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-start gap-4">
                          {/* Thumbnail Placeholder */}
                          <div className="w-[72px] h-[54px] rounded-lg bg-slate-100 shrink-0 border border-slate-200 overflow-hidden flex items-center justify-center relative">
                            <Building2 className="w-6 h-6 text-slate-300 absolute" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-slate-200/40 to-transparent"></div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-[14px] font-bold text-slate-900 truncate">{project.name}</h3>
                              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                                Đang thi công
                              </span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 truncate">
                              <UserIcon className="w-3 h-3 text-slate-400 shrink-0" /> Chủ đầu tư: {project.investor || 'Nội bộ công ty'}
                            </p>
                          </div>
                        </div>

                        {/* Status indicators + Quick actions row */}
                        <div className="mt-2.5 ml-0 sm:ml-[88px] flex flex-wrap items-center gap-x-4 gap-y-1.5">
                          {/* Status indicators */}
                          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            WBS: {hasWBS
                              ? <span className="text-emerald-600 font-semibold">Đã thiết lập</span>
                              : <span className="text-orange-500 font-semibold">Chưa thiết lập</span>
                            }
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                            <CalendarCheck className="w-3 h-3" />
                            Hôm nay: {todayEntryCount > 0
                              ? <span className="text-emerald-600 font-semibold">Đã nhập ({todayEntryCount})</span>
                              : <span className="text-orange-500 font-semibold">Chưa nhập</span>
                            }
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            Cập nhật: {format(new Date(project.updatedAt), 'dd/MM/yyyy')}
                          </span>

                          {/* Divider */}
                          <span className="hidden sm:block w-px h-3.5 bg-slate-200"></span>

                          {/* Quick action links */}
                          <div className="flex items-center gap-3">
                            <Link href={`/projects/${project.id}`} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors">
                              Mở <ArrowRight className="w-3 h-3" />
                            </Link>
                            <Link href={`/projects/${project.id}/field-progress/daily`} className="text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-md transition-colors">
                              Nhập hôm nay
                            </Link>
                            <Link href={`/projects/${project.id}/field-progress/summary`} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                              Tổng hợp
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col (40%) */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white h-fit">
            <div className="p-5 sm:px-6 sm:py-5 border-b border-slate-100/60 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" /> Hoạt động gần đây
              </h2>
            </div>
            <CardContent className="p-5 sm:p-6">
              {activities.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-slate-100">
                    <Clock className="w-4 h-4 text-slate-300" />
                  </div>
                  <p className="text-[13px] font-medium text-slate-500">Chưa có hoạt động gần đây.</p>
                </div>
              ) : (
                <div className="relative space-y-5 before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {activities.map((activity, index) => (
                    <div key={index} className="relative flex items-start gap-3.5">
                      {/* Timeline Icon */}
                      <div className="relative z-10 w-8 h-8 flex items-center justify-center bg-white rounded-full border shadow-sm shrink-0 border-slate-200">
                        {getActivityIcon(activity.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5 pb-1">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <p className="text-[10px] font-bold text-slate-400 tracking-wider">
                            {format(activity.date, 'dd/MM/yyyy')}
                          </p>
                          {getActivityBadge(activity)}
                        </div>
                        <h4 className="text-[13px] font-bold text-slate-900 leading-snug mb-0.5 pr-2 line-clamp-1">
                          {activity.title}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-500 truncate">
                          {activity.project}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  );
}
