import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getContractsData } from "./actions";
import { ContractsWorkspace } from "@/components/contracts/contracts-workspace";

export const metadata = {
  title: "Quản lý hợp đồng | ERP Công trình",
  description: "Theo dõi hợp đồng, giá trị và tiến độ thực hiện.",
};

export default async function ContractsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { contracts, projects, suppliers, globalPermissions } = await getContractsData();

  if (!globalPermissions.canView) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Truy cập bị từ chối</h1>
        <p className="text-slate-500">Bạn không có quyền xem danh sách hợp đồng.</p>
      </div>
    );
  }

  return (
    <ContractsWorkspace
      contracts={contracts}
      projects={projects}
      suppliers={suppliers}
      globalPermissions={globalPermissions}
    />
  );
}
