import { EmptyState } from "@/components/ui/empty-state";
import prisma from "@/lib/prisma";
import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { formatDateVN } from "@/lib/utils";
import { ProjectsListClient } from "@/components/projects/project-list-client";
import { ProjectsKPISummary } from "@/components/projects/projects-kpi-summary";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewAllProjects, canManageProjects, getAccessibleProjectIds } from "@/lib/rbac";
import { PageHeading, FilterBar, ContentCard, Pagination } from "@/components/ui/enterprise";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 15;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const params = await searchParams;
  const q = params.q || "";
  const validStatuses = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
  const statusFilter = validStatuses.includes(params.status || "") ? (params.status as string) : "";
  const currentPage = Math.max(1, Number(params.page) || 1);

  const isHighLevel = canViewAllProjects(session);
  const canManage = canManageProjects(session);
  const isCommander = session.role === "CHIEF_COMMANDER";

  // Base condition for global KPIs
  const baseWhereCondition: any = {
    deletedAt: null,
  };

  if (!isHighLevel) {
    const accessibleIds = await getAccessibleProjectIds(session);
    if (accessibleIds !== null) {
      baseWhereCondition.id = { in: accessibleIds };
    }
  }

  // Condition for list filtering
  const whereCondition = { ...baseWhereCondition };

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

  // Fetch KPIs and List Total concurrently
  const [totalItems, totalCount, activeCount, attentionCount, completedCount] = await Promise.all([
    prisma.project.count({ where: whereCondition }),
    prisma.project.count({ where: baseWhereCondition }),
    prisma.project.count({ where: { ...baseWhereCondition, status: "ACTIVE" } }),
    prisma.project.count({ where: { ...baseWhereCondition, status: { in: ["ON_HOLD", "CANCELLED"] } } }),
    prisma.project.count({ where: { ...baseWhereCondition, status: "COMPLETED" } }),
  ]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const projects = await prisma.project.findMany({
    where: whereCondition,
    orderBy: { createdAt: 'desc' },
    take: ITEMS_PER_PAGE,
    skip: skip,
  });

  const projectRows = projects.map((project) => {
    let dateRangeLabel = "Chưa cập nhật";
    if (project.startDate || project.endDate) {
      const startStr = project.startDate ? formatDateVN(project.startDate) : "—";
      const endStr = project.endDate ? formatDateVN(project.endDate) : "—";
      dateRangeLabel = `${startStr} → ${endStr}`;
    }

    return {
      id: project.id,
      code: project.code,
      name: project.name,
      investor: project.investor ?? null,
      location: project.location ?? null,
      status: project.status,
      dateRangeLabel,
    };
  });

  const pageTitle = isCommander ? "Công trình của tôi" : "Quản lý Công trình";
  
  // Base URL for pagination links
  const baseUrl = `/projects?q=${encodeURIComponent(q)}&status=${encodeURIComponent(statusFilter)}`;

  return (
    <div className="app-page space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1 sm:px-0">
        <div className="min-w-0">
          <h1 className="text-[22px] sm:text-[24px] font-black text-slate-900 tracking-tight">{pageTitle}</h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 mt-1">Theo dõi danh sách, trạng thái và lịch thi công</p>
        </div>
        {canManage && (
          <Link href="/projects/new" className="shrink-0">
            <Button variant="primary" size="default" className="w-full sm:w-auto gap-2 rounded-[12px] h-11">
              <Plus className="h-5 w-5" />
              Tạo công trình
            </Button>
          </Link>
        )}
      </div>

      {/* KPI Summary Cards */}
      <ProjectsKPISummary 
        totalCount={totalCount}
        activeCount={activeCount}
        attentionCount={attentionCount}
        completedCount={completedCount}
      />

      {/* Filter Toolbar */}
      <div className="rounded-[16px] bg-white border border-slate-200/60 p-3 shadow-sm">
        <form className="flex flex-col gap-3" method="GET" action="/projects">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                name="q"
                id="project-search"
                autoComplete="off"
                defaultValue={q}
                placeholder="Tìm mã, tên công trình..." 
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-slate-50 border-slate-200 outline-none focus:border-blue-400 focus:bg-white text-[14px]"
              />
            </div>
            {/* Desktop native select, mobile native select via full width block */}
            <div className="hidden sm:block">
              <select 
                name="status"
                id="project-status-filter"
                defaultValue={statusFilter}
                className="h-11 w-[180px] rounded-[12px] bg-slate-50 border-slate-200 px-4 text-[14px] outline-none focus:border-blue-400"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PLANNING">Chuẩn bị</option>
                <option value="ACTIVE">Đang thi công</option>
                <option value="ON_HOLD">Tạm dừng</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Hủy</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:hidden">
            <select 
              name="status"
              defaultValue={statusFilter}
              className="flex-1 h-11 rounded-[12px] bg-slate-50 border-slate-200 px-3 text-[14px] outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PLANNING">Chuẩn bị</option>
              <option value="ACTIVE">Đang thi công</option>
              <option value="ON_HOLD">Tạm dừng</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Hủy</option>
            </select>
            <Button type="submit" variant="primary" className="h-11 px-6 rounded-[12px]">Lọc</Button>
            {(q || statusFilter) && (
              <Link href="/projects" className="h-11 px-4 flex items-center justify-center border border-slate-200 rounded-[12px] text-slate-600 bg-white active:bg-slate-50">
                Xóa
              </Link>
            )}
          </div>
          
          <div className="hidden sm:flex items-center gap-2">
            <Button type="submit" variant="primary" className="h-11 px-6 rounded-[12px]">Lọc dữ liệu</Button>
            {(q || statusFilter) && (
              <Link href="/projects">
                <Button variant="outline" className="h-11 rounded-[12px]">Xóa lọc</Button>
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="bg-transparent sm:bg-white sm:border sm:border-slate-200/60 sm:rounded-[16px] sm:shadow-sm sm:overflow-hidden">
        {projects.length > 0 ? (
          <>
            <ProjectsListClient projects={projectRows} canManage={canManage} />

            <div className="bg-white rounded-[16px] border border-slate-200/60 mt-3 sm:mt-0 sm:rounded-none sm:border-0 sm:border-t p-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={ITEMS_PER_PAGE}
                baseUrl={baseUrl}
              />
            </div>
          </>
        ) : (
          <div className="p-12 bg-white rounded-[16px] border border-slate-200/60 shadow-sm mt-3 sm:mt-0 sm:rounded-none sm:border-0 sm:shadow-none">
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
