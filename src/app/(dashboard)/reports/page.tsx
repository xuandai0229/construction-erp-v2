import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

export const metadata = {
  title: "Báo cáo hiện trường | ERP Công trình",
};

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Báo cáo hiện trường</h1>
        <p className="text-slate-500 mt-1">Quản lý và theo dõi báo cáo công việc hàng ngày tại công trường</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-slate-500 shadow-sm">
        <ClipboardCheck className="h-16 w-16 text-blue-200 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Đang thiết kế lại phân hệ</h2>
        <p className="text-slate-600 max-w-md text-center">
          Phân hệ Báo cáo hiện trường đang được thiết kế lại theo luồng nhập liệu chuẩn ngoài công trường. Phiên bản mới sẽ sớm được cập nhật.
        </p>
      </div>
    </div>
  );
}
