"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createProject, updateProject } from "@/app/(dashboard)/projects/actions";
import Link from "next/link";
import { Info } from "lucide-react";

interface ProjectFormProps {
  initialData?: {
    id: string;
    code: string;
    name: string;
    investor?: string | null;
    location?: string | null;
    status?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    description?: string | null;
  } | null;
}

export function ProjectForm({ initialData }: ProjectFormProps) {
  const action = initialData 
    ? updateProject.bind(null, initialData.id) 
    : createProject;
    
  const [state, formAction, isPending] = useActionState(action, null);

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toISOString().split("T")[0];
  };

  const inputClass = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 read-only:bg-slate-50 read-only:text-slate-500 read-only:cursor-not-allowed transition-colors";

  return (
    <form action={formAction} className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 space-y-8">
        {state?.error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 font-medium">
            {state.error}
          </div>
        )}

        {/* Group 1: Thông tin cơ bản */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Thông tin cơ bản</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="code" className="text-sm font-semibold text-slate-700">Mã công trình <span className="text-red-500">*</span></label>
              <input
                id="code"
                name="code"
                type="text"
                required
                autoComplete="off"
                defaultValue={initialData?.code}
                className={inputClass}
                placeholder="VD: CT-001"
                readOnly={!!initialData}
                title={initialData ? "Không được sửa mã công trình" : ""}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-semibold text-slate-700">Tên công trình <span className="text-red-500">*</span></label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="off"
                defaultValue={initialData?.name}
                className={inputClass}
                placeholder="VD: Dự án Nguyễn Trãi"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="investor" className="text-sm font-semibold text-slate-700">Chủ đầu tư</label>
              <input
                id="investor"
                name="investor"
                type="text"
                autoComplete="off"
                defaultValue={initialData?.investor || ""}
                className={inputClass}
                placeholder="Nhập tên chủ đầu tư"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="location" className="text-sm font-semibold text-slate-700">Địa điểm</label>
              <input
                id="location"
                name="location"
                type="text"
                autoComplete="off"
                defaultValue={initialData?.location || ""}
                className={inputClass}
                placeholder="VD: Hà Nội"
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Group 2: Trạng thái & thời gian */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Trạng thái & thời gian</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-sm font-semibold text-slate-700">Trạng thái</label>
              <select
                id="status"
                name="status"
                defaultValue={initialData?.status || "PLANNING"}
                className={inputClass}
              >
                <option value="PLANNING">Chuẩn bị</option>
                <option value="ACTIVE">Đang thi công</option>
                <option value="ON_HOLD">Tạm dừng</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Hủy</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="startDate" className="text-sm font-semibold text-slate-700">Ngày bắt đầu</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                autoComplete="off"
                defaultValue={formatDate(initialData?.startDate)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="endDate" className="text-sm font-semibold text-slate-700">Ngày dự kiến hoàn thành</label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                autoComplete="off"
                defaultValue={formatDate(initialData?.endDate)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Group 3: Mô tả / Ghi chú */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Mô tả / Ghi chú</h3>
          <div className="space-y-1.5">
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={initialData?.description || ""}
              className={inputClass}
              placeholder="Nhập ghi chú hoặc mô tả về công trình..."
            />
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 pb-12 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Link href="/projects" className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2">
            Hủy
          </Link>
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium">
            {isPending ? "Đang xử lý..." : initialData ? "Lưu thay đổi" : "Tạo công trình"}
          </Button>
        </div>
      </div>

      {/* Info Card - Right Column on Desktop */}
      {!initialData && (
        <div className="xl:w-80 shrink-0">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3 text-blue-800">
              <Info className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm">Sau khi tạo công trình</h4>
            </div>
            <p className="text-sm text-blue-700/80 leading-relaxed">
              Hệ thống sẽ tự tạo các thư mục tài liệu mặc định: Hợp đồng, Bản vẽ, Dự toán, Nghiệm thu, Hóa đơn, Thanh toán, Hình ảnh hiện trường, Báo cáo ngày.
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
