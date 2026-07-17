"use client";

import { ClipboardList, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PurchaseRequestPlaceholder({ lowStockCount }: { lowStockCount: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] shadow-slate-950/[0.03]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-xl)] border border-blue-100 bg-blue-50 text-blue-700">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-950">Đề xuất mua vật tư</h2>
              <span className="inline-flex items-center rounded-[var(--radius-md)] bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                Sắp phát triển
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              Khu vực này sẽ gom vật tư sắp hết theo công trình, tạo phiếu đề xuất mua và chuyển sang luồng phê duyệt.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Nguồn đề xuất", "Tồn tối thiểu và nhu cầu công trường"],
            ["Luồng duyệt", "Chỉ huy trưởng, điều phối vật tư, ban giám đốc"],
            ["Theo dõi", "Số lượng đề xuất, đã mua, đã nhận"],
          ].map(([title, description]) => (
            <div key={title} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <div className="text-sm font-bold text-[var(--foreground)]">{title}</div>
              <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div title="Tính năng này đang trong quá trình thiết kế quy trình xử lý">
            <Button disabled className="w-full sm:w-auto bg-[var(--border)] text-[var(--muted-foreground)] opacity-70 cursor-not-allowed">
              Tạo đề xuất mua
            </Button>
          </div>
          <span className="text-xs font-medium text-[var(--muted-foreground)]">Chờ hoàn thiện quy trình phê duyệt.</span>
        </div>
      </div>

      {lowStockCount > 0 ? (
        <aside className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <div className="text-sm font-bold">Gợi ý từ tồn kho hiện tại</div>
              <p className="mt-1 text-sm leading-6">
                Có {lowStockCount} vật tư đang hết hoặc sắp chạm tồn tối thiểu. Khi quy trình mở, danh sách này sẽ là nguồn tạo đề xuất nhanh.
              </p>
            </div>
          </div>
        </aside>
      ) : (
        <aside className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-subtle)] p-5 text-[var(--muted-foreground)]">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--muted-foreground)] opacity-70" />
            <div>
              <div className="text-sm font-bold text-[var(--foreground)]">Chưa có gợi ý đề xuất</div>
              <p className="mt-1 text-sm leading-6">
                Công trình hiện không có vật tư nào chạm mốc tồn tối thiểu.
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
