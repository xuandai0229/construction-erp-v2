"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { createProject, updateProject } from "@/app/(dashboard)/projects/actions";
import Link from "next/link";
import { Info, Eye } from "lucide-react";
import { toDateInputValue } from "@/lib/date-utils";
import { ProjectIdentity } from "@/components/projects/project-identity";

interface ProjectFormProps {
  initialData?: {
    id: string;
    code: string;
    name: string;
    displayName?: string | null;
    investor?: string | null;
    location?: string | null;
    status?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    description?: string | null;
    plannedDurationValue?: number | null;
    plannedDurationUnit?: "DAY" | "MONTH" | null;
  } | null;
}

export function ProjectForm({ initialData }: ProjectFormProps) {
  const action = initialData 
    ? updateProject.bind(null, initialData.id) 
    : createProject;
    
  const [state, formAction, isPending] = useActionState(action, null);

  const [legalName, setLegalName] = useState(initialData?.name || "");
  const [displayName, setDisplayName] = useState(initialData?.displayName || "");
  const [code, setCode] = useState(initialData?.code || "CT-2026-XXXX");
  const [location, setLocation] = useState(initialData?.location || "");

  const inputClass = "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 read-only:bg-[var(--surface-subtle)] read-only:text-[var(--muted-foreground)] read-only:cursor-not-allowed transition-colors";

  return (
    <form action={formAction} className="flex flex-col xl:flex-row gap-6">
      <div className="flex-1 space-y-8">
        {state?.error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 font-medium border border-red-200">
            {state.error}
          </div>
        )}

        {/* Group 1: Thông tin định danh công trình */}
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-4 uppercase tracking-wide">
            Định danh công trình
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="code" className="text-sm font-semibold text-[var(--foreground)]">
                Mã công trình <span className="text-red-500">*</span>
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                defaultValue={initialData?.code}
                onChange={(e) => setCode(e.target.value)}
                className={inputClass}
                placeholder="VD: CT-2026-0022"
                readOnly={!!initialData}
                title={initialData ? "Không được sửa mã công trình" : ""}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="plannedDurationValue" className="text-sm font-semibold text-[var(--foreground)]">
                Thời lượng thi công dự kiến
              </label>
              <div className="flex gap-2">
                <input 
                  id="plannedDurationValue" 
                  name="plannedDurationValue" 
                  type="number" 
                  min="1" 
                  step="1" 
                  defaultValue={initialData?.plannedDurationValue ?? ""} 
                  className={inputClass} 
                  placeholder="Ví dụ: 150" 
                />
                <select 
                  id="plannedDurationUnit" 
                  name="plannedDurationUnit" 
                  defaultValue={initialData?.plannedDurationUnit ?? "DAY"} 
                  className={`${inputClass} max-w-[120px]`}
                >
                  <option value="DAY">Ngày</option>
                  <option value="MONTH">Tháng</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="name" className="text-sm font-semibold text-[var(--foreground)]">
                Tên pháp lý công trình <span className="text-red-500">*</span>
              </label>
              <textarea
                id="name"
                name="name"
                rows={2}
                required
                defaultValue={initialData?.name}
                onChange={(e) => setLegalName(e.target.value)}
                className={inputClass}
                placeholder="Nhập tên pháp lý đầy đủ theo quyết định phê duyệt / hợp đồng..."
              />
              <p className="text-[12px] text-[var(--muted-foreground)] mt-1">
                Tên pháp lý đầy đủ dùng cho hồ sơ, báo cáo pháp lý và biên bản nghiệm thu.
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="displayName" className="text-sm font-semibold text-[var(--foreground)]">
                Tên hiển thị trên hệ thống
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                maxLength={120}
                defaultValue={initialData?.displayName || ""}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
                placeholder="VD: Bảo trì hạ tầng giao thông Xuân Phương 2026–2028"
              />
              <p className="text-[12px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                Tên ngắn giúp nhận biết công trình nhanh trong bảng, bộ chọn và dashboard. Tên pháp lý vẫn được giữ nguyên trong hồ sơ.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="investor" className="text-sm font-semibold text-[var(--foreground)]">Chủ đầu tư / Ban QLDA</label>
              <input
                id="investor"
                name="investor"
                type="text"
                defaultValue={initialData?.investor || ""}
                className={inputClass}
                placeholder="VD: Ban QLDA đầu tư - hạ tầng..."
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="location" className="text-sm font-semibold text-[var(--foreground)]">Địa điểm thi công</label>
              <input
                id="location"
                name="location"
                type="text"
                defaultValue={initialData?.location || ""}
                onChange={(e) => setLocation(e.target.value)}
                className={inputClass}
                placeholder="VD: Phường Xuân Phương"
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
              <label htmlFor="endDate" className="text-sm font-semibold text-[var(--foreground)]">Ngày hoàn thành dự kiến</label>
              <input
                id="endDate"
                name="endDate"
                type="date"
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
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={initialData?.description || ""}
              className={inputClass}
              placeholder="Nhập ghi chú hoặc thông tin bổ sung..."
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

      {/* Right Column: Live Preview & Guidance */}
      <div className="xl:w-80 shrink-0 space-y-4">
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3 text-slate-800 dark:text-slate-200 font-bold text-sm">
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Xem trước cách hiển thị</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Trong bảng công trình:
              </span>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <ProjectIdentity
                  name={legalName || "Tên công trình chưa nhập"}
                  displayName={displayName}
                  code={code || "CT-2026-XXXX"}
                  variant="table"
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Trong bộ chọn công trình:
              </span>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <ProjectIdentity
                  name={legalName || "Tên công trình chưa nhập"}
                  displayName={displayName}
                  code={code || "CT-2026-XXXX"}
                  location={location || "Địa điểm chưa nhập"}
                  status="ACTIVE"
                  variant="selector"
                />
              </div>
            </div>
          </div>
        </div>

        {!initialData && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-300 font-bold text-xs">
              <Info className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Sau khi tạo công trình</span>
            </div>
            <p className="text-[12px] text-blue-700 dark:text-blue-400 leading-relaxed">
              Hệ thống sẽ tự động khởi tạo hệ thống thư mục tài liệu mặc định: Hồ sơ pháp lý, Bản vẽ, Nghiệm thu, Vật tư thiết bị, Hình ảnh tiến độ và Báo cáo Chỉ huy trưởng.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
