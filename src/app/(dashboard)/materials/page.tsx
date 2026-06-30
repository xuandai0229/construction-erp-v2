import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveProjects, getMaterialItems, getProjectStocks, getRecentTransactions, requireProjectPermissions } from "./actions";
import type { MaterialItemDto, MaterialMovementDto, ProjectStockDto } from "./actions";
import { MaterialsWorkspace } from "@/components/materials/materials-workspace";
import { getMaterialPermissions, MaterialPermissionSet } from "@/lib/materials/materials-permissions";

import { getGlobalProjectContext } from "@/lib/project-context";

export const metadata = {
  title: "Quản lý vật tư | ERP Công trình",
  description: "Theo dõi nhập, xuất, tồn kho và nhu cầu vật tư tại công trường",
};

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const resolvedParams = await searchParams;
  const urlProjectId = typeof resolvedParams.projectId === "string" ? resolvedParams.projectId : undefined;

  const projects = await getActiveProjects();
  const globalContext = await getGlobalProjectContext(session, urlProjectId);
  
  let initialStocks: ProjectStockDto[] = [];
  let initialTransactions: MaterialMovementDto[] = [];
  let materialItems: MaterialItemDto[] = [];

  const projectIdToLoad = globalContext.selectedProjectId || undefined;

  let permissions: MaterialPermissionSet | undefined;

  if (projectIdToLoad) {
    try {
      permissions = await requireProjectPermissions(session, projectIdToLoad);
      materialItems = await getMaterialItems(projectIdToLoad);
      initialStocks = await getProjectStocks(projectIdToLoad);
      initialTransactions = await getRecentTransactions(projectIdToLoad);
    } catch {
      // If access is denied, ignore loading data for this project
    }
  }

  // If no permissions could be loaded (no projects or denied), use empty permissions
  if (!permissions) {
    permissions = getMaterialPermissions();
  }

  if (projects.length === 0 || (projectIdToLoad && !permissions.canView)) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Truy cập bị từ chối</h1>
        <p className="text-slate-500">Bạn không có quyền xem phân hệ vật tư của công trình này.</p>
      </div>
    );
  }

  return (
    <MaterialsWorkspace 
      projects={projects}
      materialItems={materialItems}
      initialStocks={initialStocks}
      initialTransactions={initialTransactions}
      initialProjectId={projectIdToLoad}
      permissions={permissions}
    />
  );
}
