"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createProject, updateProject } from "@/app/(dashboard)/projects/actions";
import Link from "next/link";

interface ProjectFormProps {
  initialData?: any;
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

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state?.error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium text-slate-700">Mã công trình <span className="text-red-500">*</span></label>
          <input
            id="code"
            name="code"
            type="text"
            required
            defaultValue={initialData?.code}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Ví dụ: CT-001"
            readOnly={!!initialData}
            title={initialData ? "Không được sửa mã công trình" : ""}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">Tên công trình <span className="text-red-500">*</span></label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initialData?.name}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="owner" className="text-sm font-medium text-slate-700">Chủ đầu tư</label>
          <input
            id="owner"
            name="owner"
            type="text"
            defaultValue={initialData?.owner || ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="location" className="text-sm font-medium text-slate-700">Địa điểm</label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={initialData?.location || ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium text-slate-700">Trạng thái</label>
          <select
            id="status"
            name="status"
            defaultValue={initialData?.status || "PLANNING"}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="PLANNING">Lập kế hoạch</option>
            <option value="ACTIVE">Đang thi công</option>
            <option value="ON_HOLD">Tạm dừng</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="startDate" className="text-sm font-medium text-slate-700">Ngày bắt đầu</label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={formatDate(initialData?.startDate)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="endDate" className="text-sm font-medium text-slate-700">Ngày dự kiến hoàn thành</label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={formatDate(initialData?.endDate)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium text-slate-700">Mô tả / Ghi chú</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initialData?.description || ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end space-x-4 border-t border-slate-200 pt-6">
        <Button type="button" variant="outline" asChild>
          <Link href="/projects">Hủy</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang xử lý..." : initialData ? "Lưu thay đổi" : "Tạo công trình"}
        </Button>
      </div>
    </form>
  );
}
