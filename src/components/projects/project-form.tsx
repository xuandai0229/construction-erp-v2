"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createProject, updateProject } from "@/app/(dashboard)/projects/actions";
import Link from "next/link";
import { Info } from "lucide-react";
import { toDateInputValue } from "@/lib/date-utils";

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

  const inputClass = "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] opacity-70 focus:opacity-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 read-only:bg-[var(--surface-subtle)] read-only:text-[var(--muted-foreground)] read-only:cursor-not-allowed transition-colors";

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
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-4 uppercase tracking-wide">Thông tin cơ bản</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="code" className="text-sm font-semibold text-[var(--foreground)]">Mã công trình <span className="text-red-500">*</span></label>
              <input
                id="code"
                name="code"
                type="text"
                required
                
                defaultValue={initialData?.code}
                className={inputClass}
                placeholder="VD: CT-001"
                readOnly={!!initialData}
                title={initialData ? "Không được sửa mã công trình" : ""}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-semibold text-[var(--foreground)]">Tên công trình <span className="text-red-500">*</span></label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="off"
                defaultValue={initialData?.name}
                className={inputClass}
                placeholder="VD: Công trình Nguyễn Trãi"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="investor" className="text-sm font-semibold text-[var(--foreground)]">Chủ đầu tư</label>
              <input
                id="investor"
                name="investor"
                type="text"
                
                defaultValue={initialData?.investor || ""}
                className={inputClass}
                placeholder="Nhập tên chủ đầu tư"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="location" className="text-sm font-semibold text-[var(--foreground)]">Địa điểm</label>
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

        <div className="h-px bg-[var(--border)]" />

        {/* Group 2: Trạng thái & thời gian */}
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-4 uppercase tracking-wide">Trạng thái & thời gian</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-sm font-semibold text-[var(--foreground)]">Trạng thái</label>
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
              <label htmlFor="startDate" className="text-sm font-semibold text-[var(--foreground)]">Ngày bắt đầu</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                
                defaultValue={toDateInputValue(initialData?.startDate)}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="endDate" className="text-sm font-semibold text-[var(--foreground)]">Ngày dự kiến hoàn thành</label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                autoComplete="off"
                defaultValue={toDateInputValue(initialData?.endDate)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-[var(--border)]" />

        {/* Group 3: Mô tả / Ghi chú */}
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-4 uppercase tracking-wide">Mô tả / Ghi chú</h3>
          <div className="space-y-1.5">
            <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              id="description"
              name="description"
              rows={4}
              defaultValue={initialData?.description || ""}
              className={inputClass}
              placeholder="Nhập ghi chú hoặc mô tả về công trình..."
            />
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--border)] pt-6 pb-12 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Link href="/projects" className="w-full sm:w-auto inline-flex items-center justify-center rounded-[var(--radius-md)] text-sm font-medium transition-colors border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--foreground)] h-10 px-4 py-2">
            Hủy
          </Link>
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-[var(--radius-md)] shadow-sm">
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
              Hệ thống sẽ tự tạo các thư mục tài liệu mặc định: Hồ sơ pháp lý, Bản vẽ, Nghiệm thu, Vật tư thiết bị, Hình ảnh tiến độ và Báo cáo hiện trường.
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
