import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveProjects, getMaterialItems, getProjectStocks, getRecentTransactions } from "./actions";
import { MaterialsWorkspace } from "@/components/materials/materials-workspace";

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
  const initialProjectId = typeof resolvedParams.projectId === "string" ? resolvedParams.projectId : undefined;

  const projects = await getActiveProjects();
  let initialStocks: any[] = [];
  let initialTransactions: any[] = [];
  let materialItems: any[] = [];

  const accessibleProjectIds = new Set(projects.map((project) => project.id));
  const projectIdToLoad =
    initialProjectId && accessibleProjectIds.has(initialProjectId)
      ? initialProjectId
      : projects.length > 0
        ? projects[0].id
        : undefined;

  if (projectIdToLoad) {
    materialItems = await getMaterialItems(projectIdToLoad);
    initialStocks = await getProjectStocks(projectIdToLoad);
    initialTransactions = await getRecentTransactions(projectIdToLoad);
  }

  return (
    <MaterialsWorkspace 
      projects={projects}
      materialItems={materialItems}
      initialStocks={initialStocks}
      initialTransactions={initialTransactions}
      initialProjectId={projectIdToLoad}
      currentUser={{ id: session.id, role: session.role }}
    />
  );
}
