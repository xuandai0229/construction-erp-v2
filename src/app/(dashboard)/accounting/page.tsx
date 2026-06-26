import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPaymentRequestsData } from "./actions";
import { AccountingWorkspace } from "./components/accounting-workspace";

export const metadata = {
  title: "Kế toán & thanh toán | ERP Công trình",
  description: "Quản lý hồ sơ thanh toán, hóa đơn và dòng tiền dự án.",
};

export default async function AccountingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getPaymentRequestsData();

  if (!data.globalPermissions.canView) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Truy cập bị từ chối</h1>
        <p className="text-slate-500">Bạn không có quyền xem phân hệ kế toán & thanh toán.</p>
      </div>
    );
  }

  return (
    <AccountingWorkspace
      paymentRequests={data.paymentRequests}
      projects={data.projects}
      suppliers={data.suppliers}
      contracts={data.contracts}
      globalPermissions={data.globalPermissions}
      currentUserId={session.id}
    />
  );
}
