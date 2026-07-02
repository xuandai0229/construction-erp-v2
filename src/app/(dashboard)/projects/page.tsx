import { EmptyState } from "@/components/ui/empty-state";
import prisma from "@/lib/prisma";
import { Building2, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDateVN } from "@/lib/utils";
import { ProjectsListClient } from "@/components/projects/project-list-client";
import { ProjectsKPISummary } from "@/components/projects/projects-kpi-summary";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewAllProjects, canManageProjects, getAccessibleProjectIds } from "@/lib/rbac";

const ITEMS_PER_PAGE = 15;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const session = await getSession();
  if (!session) redirect("/login");

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
    <div className="app-page space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
          <p className="text-[15px] text-slate-500 mt-1">
            Theo dõi danh sách, trạng thái và lịch thi công các công trình
          </p>
        </div>
        {canManage && (
          <Link href="/projects/new" className="inline-flex items-center gap-2 rounded-[14px] bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all duration-200 ease-out hover:bg-blue-700 hover:shadow-md active:scale-[0.99]">
            <Plus className="h-4 w-4" />
            Tạo công trình
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

      {/* Premium Toolbar */}
      <div className="rounded-[18px] border border-slate-200/70 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
        <form className="flex flex-col sm:flex-row gap-3" method="GET" action="/projects">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              name="q"
              id="project-search"
              autoComplete="off"
              defaultValue={q}
              placeholder="Tìm kiếm mã, tên công trình, chủ đầu tư..." 
              className="h-11 w-full rounded-xl border border-slate-200/70 bg-slate-50/50 pl-10 pr-4 text-[14px] text-slate-900 transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select 
              name="status"
              id="project-status-filter"
              defaultValue={statusFilter}
              className="h-11 w-full sm:w-[180px] rounded-xl border border-slate-200/70 bg-slate-50/50 px-4 text-[14px] text-slate-900 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PLANNING">Chuẩn bị</option>
              <option value="ACTIVE">Đang thi công</option>
              <option value="ON_HOLD">Tạm dừng</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Hủy</option>
            </select>
            <button type="submit" className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all duration-200 ease-out hover:bg-blue-700 hover:shadow-md active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-blue-500/10">
              Lọc
            </button>
            {(q || statusFilter) && (
              <Link href="/projects" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-900 focus:outline-none">
                Xóa lọc
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="rounded-[20px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">


        {projects.length > 0 ? (
          <>
            <ProjectsListClient projects={projectRows} canManage={canManage} />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500 font-medium">
                  Hiển thị <span className="font-semibold text-slate-900">{skip + 1}</span> đến <span className="font-semibold text-slate-900">{Math.min(skip + ITEMS_PER_PAGE, totalItems)}</span> trong số <span className="font-semibold text-slate-900">{totalItems}</span> công trình
                </p>
                <div className="flex items-center gap-2">
                  <Link 
                    href={`${baseUrl}&page=${Math.max(1, currentPage - 1)}`}
                    className={`inline-flex items-center justify-center rounded-md h-9 w-9 border border-slate-300 transition-colors ${currentPage === 1 ? 'pointer-events-none opacity-50 bg-slate-50 text-slate-400' : 'bg-white hover:bg-slate-50 text-slate-700'}`}
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                  <span className="text-sm font-semibold text-slate-900 px-2">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <Link 
                    href={`${baseUrl}&page=${Math.min(totalPages, currentPage + 1)}`}
                    className={`inline-flex items-center justify-center rounded-md h-9 w-9 border border-slate-300 transition-colors ${currentPage === totalPages ? 'pointer-events-none opacity-50 bg-slate-50 text-slate-400' : 'bg-white hover:bg-slate-50 text-slate-700'}`}
                    aria-label="Trang sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12">
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
