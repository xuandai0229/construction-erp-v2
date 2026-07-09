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
    <div className="app-page space-y-6">
      <PageHeading
        title={pageTitle}
        description="Theo dõi danh sách, trạng thái và lịch thi công các công trình"
        action={
          canManage ? (
            <Link href="/projects/new">
              <Button variant="primary" size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Tạo công trình
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* KPI Summary Cards */}
      <ProjectsKPISummary 
        totalCount={totalCount}
        activeCount={activeCount}
        attentionCount={attentionCount}
        completedCount={completedCount}
      />

      {/* Filter Toolbar */}
      <FilterBar>
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
              className="form-control h-11 pl-10 pr-4 rounded-xl"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select 
              name="status"
              id="project-status-filter"
              defaultValue={statusFilter}
              className="form-control h-11 w-full sm:w-[180px] rounded-xl px-4"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PLANNING">Chuẩn bị</option>
              <option value="ACTIVE">Đang thi công</option>
              <option value="ON_HOLD">Tạm dừng</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Hủy</option>
            </select>
            <Button type="submit" variant="primary" className="h-11 px-6">
              Lọc
            </Button>
            {(q || statusFilter) && (
              <Link href="/projects">
                <Button variant="outline" className="h-11">
                  Xóa lọc
                </Button>
              </Link>
            )}
          </div>
        </form>
      </FilterBar>

      {/* Table Card */}
      <ContentCard className="overflow-hidden">
        {projects.length > 0 ? (
          <>
            <ProjectsListClient projects={projectRows} canManage={canManage} />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={ITEMS_PER_PAGE}
              baseUrl={baseUrl}
            />
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
      </ContentCard>
    </div>
  );
}
