"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronRight, FileText } from "lucide-react";
import { createSupervisionWeeklyDossier } from "@/app/(dashboard)/supervision/weekly/actions";
import { Button } from "@/components/ui/button";
import { ContentCard, PageHeader, PageHeading } from "@/components/ui/enterprise";
import type { SupervisionDatabaseReadiness } from "@/lib/supervision-weekly/database-readiness";

type Row = { id: string; reportNumber: string | null; weekStart: string; weekEnd: string; status: string; version: number; updatedAt: string; createdBy: { name: string } };

const statusLabel: Record<string, string> = { DRAFT: "Bản nháp", SUBMITTED: "Đã gửi", REVISION_REQUIRED: "Yêu cầu chỉnh sửa", APPROVED: "Đã duyệt", LOCKED: "Đã khóa" };
const statusClass: Record<string, string> = { DRAFT: "bg-slate-100 text-slate-700", SUBMITTED: "bg-amber-100 text-amber-800", REVISION_REQUIRED: "bg-rose-100 text-rose-700", APPROVED: "bg-emerald-100 text-emerald-700", LOCKED: "bg-indigo-100 text-indigo-700" };

function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)); }

export function WeeklyListClient({ rows, readiness }: { rows: Row[]; readiness?: SupervisionDatabaseReadiness }) {
  const router = useRouter();
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [pending, startTransition] = useTransition();
  const create = () => startTransition(async () => { const id = await createSupervisionWeeklyDossier(anchorDate); router.push(`/supervision/weekly/${id}/edit`); });
  if (readiness && !readiness.ready) {
    const title = {
      MIGRATION_NOT_APPLIED: "Chưa áp migration Giám sát",
      DATABASE_UNREACHABLE: "Không kết nối được cơ sở dữ liệu",
      DATABASE_PERMISSION_DENIED: "Không đủ quyền cơ sở dữ liệu",
      UNKNOWN: "Không thể kiểm tra cơ sở dữ liệu",
    }[readiness.reason];
    return <div className="space-y-5"><PageHeader><PageHeading title="Báo cáo tuần Giám sát" description="Phân hệ chưa sẵn sàng để truy xuất dữ liệu." /></PageHeader><ContentCard className="p-8"><h2 className="text-base font-bold text-slate-900">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{readiness.message}</p><p className="mt-3 text-xs text-slate-500">Thông tin kỹ thuật chi tiết được ghi ở server để quản trị viên chẩn đoán; không có dữ liệu báo cáo nào được hiển thị thay thế.</p></ContentCard></div>;
  }
  return <div className="space-y-5">
    <PageHeader>
      <PageHeading title="Báo cáo tuần Giám sát" description="Mỗi hồ sơ bao gồm Báo cáo kết quả tuần và Kế hoạch tuần tiếp theo." action={<div className="flex flex-wrap items-end gap-2"><label className="text-xs font-semibold text-slate-600">Chọn ngày trong tuần<input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-300 px-3 text-sm" /></label><Button onClick={create} disabled={pending}><CalendarPlus className="h-4 w-4" />{pending ? "Đang tạo…" : "Tạo hồ sơ tuần"}</Button></div>} />
    </PageHeader>
    <ContentCard className="overflow-hidden">
      {rows.length === 0 ? <div className="p-10 text-center text-sm text-slate-500"><FileText className="mx-auto mb-3 h-9 w-9 text-slate-300" />Chưa có hồ sơ tuần nào trong phạm vi của bạn.</div> : <div className="divide-y divide-slate-100">{rows.map((row) => <button key={row.id} onClick={() => router.push(`/supervision/weekly/${row.id}/edit`)} className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><FileText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{row.reportNumber || `Hồ sơ tuần ${dateText(row.weekStart)}`}</div><div className="mt-1 text-sm text-slate-500">{dateText(row.weekStart)} đến {dateText(row.weekEnd)} · Phiên bản {row.version} · {row.createdBy.name}</div></div><span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${statusClass[row.status]}`}>{statusLabel[row.status] || row.status}</span><ChevronRight className="h-5 w-5 text-slate-400" /></button>)}</div>}
    </ContentCard>
  </div>;
}
