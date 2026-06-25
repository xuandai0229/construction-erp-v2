import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveProjects, getMaterialItems, getProjectStocks, getRecentTransactions } from "./actions";
import { MaterialsWorkspace } from "@/components/materials/materials-workspace";

export const metadata = {
  title: "Quản lý vật tư | ERP Công trình",
  description: "Theo dõi nhập, xuất, tồn kho và nhu cầu vật tư tại công trường",
};

export default async function MaterialsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const resolvedParams = await searchParams;
  const initialProjectId = typeof resolvedParams.projectId === "string" ? resolvedParams.projectId : undefined;

  const projects = await getActiveProjects();
  const materialItems = await getMaterialItems();

  let initialStocks: any[] = [];
  let initialTransactions: any[] = [];

  const projectIdToLoad = initialProjectId || (projects.length > 0 ? projects[0].id : undefined);

  if (projectIdToLoad) {
    try {
      initialStocks = await getProjectStocks(projectIdToLoad);
      initialTransactions = await getRecentTransactions(projectIdToLoad);
    } catch (e) {
      console.error("Failed to load project material data:", e);
    }
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
