import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSuppliers, getSupplierPermissionsForUser } from "./actions";
import { SuppliersWorkspace } from "@/components/suppliers/suppliers-workspace";

export const metadata = {
  title: "Nhà cung cấp & thầu phụ | ERP Công trình",
  description: "Quản lý danh bạ đối tác cung ứng và đơn vị thi công",
};

export default async function SuppliersPage() {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const [suppliers, permissions] = await Promise.all([
    getSuppliers(),
    getSupplierPermissionsForUser(),
  ]);

  if (!permissions.canView) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Truy cập bị từ chối</h1>
        <p className="text-slate-500">Bạn không có quyền xem danh sách đối tác.</p>
      </div>
    );
  }

  return (
    <SuppliersWorkspace
      suppliers={suppliers}
      permissions={permissions}
    />
  );
}
