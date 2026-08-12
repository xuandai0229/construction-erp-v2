import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getMaterialItems,
  getProjectStocks,
  getRecentTransactions,
  requireProjectPermissions,
  getPortfolioOverview,
  getPortfolioCatalog,
  getPortfolioStocks,
  getPortfolioTransactions,
} from "./actions";
import type {
  MaterialItemDto,
  MaterialMovementDto,
  ProjectStockDto,
  PortfolioOverviewDto,
  PortfolioCatalogItemDto,
  PortfolioStockItemDto,
} from "./actions";
import { MaterialsWorkspace } from "@/components/materials/materials-workspace";
import { getMaterialPermissions } from "@/lib/materials/materials-permissions";
import { listMaterialProposals, listMaterialProposalsForProjects } from "@/lib/material-proposals/actions";
import { resolveMaterialAccess } from "@/lib/materials/materials-access";

export const metadata = {
  title: "Quản lý vật tư | ERP Công trình",
  description: "Theo dõi nhập, xuất, tồn kho và nhu cầu vật tư tại công trường và toàn công ty",
};

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const resolvedParams = await searchParams;
  const urlProjectId = typeof resolvedParams.projectId === "string" ? resolvedParams.projectId : undefined;
  const scopeParam = typeof resolvedParams.scope === "string" ? resolvedParams.scope : undefined;

  const accessContext = await resolveMaterialAccess(session, urlProjectId, scopeParam);

  if (accessContext.dataScope === "NONE" || accessContext.permittedProjects.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Chưa được phân quyền công trình</h1>
        <p className="text-sm text-slate-500 max-w-md">
          Bạn chưa được phân công làm việc ở công trình nào. Vui lòng liên hệ Quản trị viên để được cấp quyền.
        </p>
      </div>
    );
  }

  let portfolioOverview: PortfolioOverviewDto | undefined;
  let portfolioCatalog: PortfolioCatalogItemDto[] = [];
  let portfolioStocks: PortfolioStockItemDto[] = [];
  let portfolioProposals: any[] = [];
  let portfolioTransactions: MaterialMovementDto[] = [];

  let initialStocks: ProjectStockDto[] = [];
  let initialTransactions: MaterialMovementDto[] = [];
  let materialItems: MaterialItemDto[] = [];
  let materialProposals: any[] = [];
  let wbsItems: any[] = [];

  let permissions = getMaterialPermissions(session.role);

  if (accessContext.isPortfolioMode) {
    portfolioOverview = await getPortfolioOverview(accessContext.permittedProjectIds);
    portfolioCatalog = await getPortfolioCatalog(accessContext.permittedProjectIds);
    portfolioStocks = await getPortfolioStocks(accessContext.permittedProjectIds);
    portfolioProposals = await listMaterialProposalsForProjects(accessContext.permittedProjectIds);
    portfolioTransactions = await getPortfolioTransactions(accessContext.permittedProjectIds);
  } else if (accessContext.selectedProjectId) {
    try {
      permissions = await requireProjectPermissions(session, accessContext.selectedProjectId);
      materialItems = await getMaterialItems(accessContext.selectedProjectId);
      initialStocks = await getProjectStocks(accessContext.selectedProjectId);
      initialTransactions = await getRecentTransactions(accessContext.selectedProjectId);
      materialProposals = await listMaterialProposals(accessContext.selectedProjectId);

      const db = (await import("@/lib/prisma")).default;
      const template = await db.fieldProgressTemplate.findFirst({
        where: { projectId: accessContext.selectedProjectId, deletedAt: null },
      });
      if (template) {
        wbsItems = await db.fieldProgressItem.findMany({
          where: { templateId: template.id, deletedAt: null },
          include: { parent: true },
        });
      }
    } catch {
      // Access denied for single project
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Truy cập bị từ chối</h1>
          <p className="text-sm text-slate-500 max-w-md">
            Bạn không có quyền xem dữ liệu vật tư của công trình này.
          </p>
        </div>
      );
    }
  }

  return (
    <MaterialsWorkspace
      projects={accessContext.permittedProjects}
      materialItems={materialItems}
      initialStocks={initialStocks}
      initialTransactions={initialTransactions}
      initialProjectId={accessContext.selectedProjectId || undefined}
      permissions={permissions}
      accessContext={JSON.parse(JSON.stringify(accessContext))}
      portfolioOverview={portfolioOverview ? JSON.parse(JSON.stringify(portfolioOverview)) : undefined}
      portfolioCatalog={JSON.parse(JSON.stringify(portfolioCatalog))}
      portfolioStocks={JSON.parse(JSON.stringify(portfolioStocks))}
      portfolioProposals={JSON.parse(JSON.stringify(portfolioProposals))}
      portfolioTransactions={JSON.parse(JSON.stringify(portfolioTransactions))}
      materialProposals={JSON.parse(JSON.stringify(materialProposals))}
      wbsItems={JSON.parse(JSON.stringify(wbsItems))}
      currentUserRole={session.role}
      currentUserId={session.id}
    />
  );
}
