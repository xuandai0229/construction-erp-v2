import React, { useState, useEffect, useCallback } from "react";
import { Calendar, FileText, BarChart3, AlertTriangle, CheckCircle2, Clock, XCircle, FileWarning, Lightbulb, Users, Wrench, ShieldAlert, ClipboardList, CalendarRange } from "lucide-react";
import { type CreateReportFormData } from "../types";
import { getWeeklyReportSummary } from "@/app/(dashboard)/reports/actions";

interface WeeklyReportFormProps {
  form: CreateReportFormData;
  updateField: (field: string, value: any) => void;
  errors: Record<string, string>;
}

// Helper: get Monday of the week containing a date
function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function getWeekSunday(mondayStr: string): string {
  const d = new Date(mondayStr + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

function formatDateVN(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

type WeeklyPreview = {
  dayStatuses: { date: string; hasReport: boolean; approvedCount: number; submittedCount: number; draftCount: number; rejectedCount: number }[];
  stats: { approvedReports: number; submittedReports: number; rejectedReports: number; emptyDays: number; workLineCount: number; attachmentCount: number };
  groups: { categoryId: string; categoryName: string; items: { workContent: string; unit?: string; quantity: number; dates: string[] }[] }[];
  emptyReason: string | null;
};

export function WeeklyReportForm({ form, updateField, errors }: WeeklyReportFormProps) {
  const [preview, setPreview] = useState<WeeklyPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const inputClass = "w-full h-11 px-3 text-[14px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
  const textareaClass = "w-full min-h-[100px] p-3 text-[14px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 resize-y leading-relaxed";

  // When user picks a date, auto-calculate week range
  const handleWeekDatePick = useCallback((dateStr: string) => {
    const monday = getWeekMonday(dateStr);
    const sunday = getWeekSunday(monday);
    updateField("weekStartDate", monday);
    updateField("weekEndDate", sunday);
  }, [updateField]);

  // Load preview when project + date range are set
  useEffect(() => {
    if (!form.projectId || !form.weekStartDate || !form.weekEndDate) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setIsLoadingPreview(true);
      try {
        const start = new Date(form.weekStartDate + "T00:00:00+07:00");
        const end = new Date(form.weekEndDate + "T23:59:59+07:00");
        const data = await getWeeklyReportSummary(form.projectId, start, end, { includeSubmitted: true, includeDraft: true });
        if (!cancelled) setPreview(data as WeeklyPreview);
      } catch (e) {
        console.error("Failed to load weekly preview:", e);
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [form.projectId, form.weekStartDate, form.weekEndDate]);

  const totalWorkItems = preview?.groups?.reduce((acc, g) => acc + g.items.length, 0) || 0;
  const totalQuantity = preview?.groups?.reduce((acc, g) => acc + g.items.reduce((s, i) => s + i.quantity, 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Section A: Tuần báo cáo */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50/80 px-5 py-3.5 border-b border-indigo-100 flex items-center gap-2.5">
          <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600">
            <CalendarRange className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-indigo-800 text-[15px]">Tuần báo cáo</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Chọn ngày trong tuần <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.weekStartDate || ""}
                onChange={e => handleWeekDatePick(e.target.value)}
                className={`${inputClass} ${errors.weekStartDate ? "border-red-400" : ""}`}
              />
              {errors.weekStartDate && <p className="text-[11px] text-red-500 font-medium">{errors.weekStartDate}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Từ ngày</label>
              <input type="date" value={form.weekStartDate || ""} readOnly className={`${inputClass} bg-slate-50 text-slate-600`} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Đến ngày</label>
              <input type="date" value={form.weekEndDate || ""} readOnly className={`${inputClass} bg-slate-50 text-slate-600`} />
            </div>
          </div>
          {form.weekStartDate && form.weekEndDate && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-[14px] text-indigo-800 font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              Từ ngày <strong>{formatDateVN(form.weekStartDate)}</strong> đến ngày <strong>{formatDateVN(form.weekEndDate)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Section B: Dữ liệu báo cáo ngày */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-emerald-50/80 px-5 py-3.5 border-b border-emerald-100 flex items-center gap-2.5">
          <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-emerald-800 text-[15px]">Dữ liệu báo cáo ngày trong tuần</h3>
        </div>
        <div className="p-5">
          {!form.projectId || !form.weekStartDate ? (
            <div className="py-8 text-center text-slate-500 text-[13px]">
              Chọn công trình và tuần báo cáo để xem dữ liệu tổng hợp.
            </div>
          ) : isLoadingPreview ? (
            <div className="py-8 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
              <p className="text-[13px] text-slate-500">Đang tải dữ liệu báo cáo ngày...</p>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatBadge label="Tổng BC ngày" value={preview.dayStatuses.filter(d => d.hasReport).length} color="blue" />
                <StatBadge label="Đã duyệt" value={preview.stats.approvedReports} color="emerald" />
                <StatBadge label="Chờ duyệt" value={preview.stats.submittedReports} color="amber" />
                <StatBadge label="Từ chối" value={preview.stats.rejectedReports} color="red" />
                <StatBadge label="Ngày trống" value={preview.stats.emptyDays} color="slate" />
              </div>

              {/* Day status row */}
              <div className="flex gap-1.5 flex-wrap">
                {preview.dayStatuses.map((d, i) => {
                  const dayLabel = new Date(d.date + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
                  let bg = "bg-slate-100 text-slate-400";
                  if (d.approvedCount > 0) bg = "bg-emerald-100 text-emerald-700";
                  else if (d.submittedCount > 0) bg = "bg-amber-100 text-amber-700";
                  else if (d.draftCount > 0) bg = "bg-blue-100 text-blue-700";
                  else if (d.rejectedCount > 0) bg = "bg-red-100 text-red-700";
                  return (
                    <div key={d.date} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${bg}`} title={d.date}>
                      {dayLabel}
                    </div>
                  );
                })}
              </div>

              {/* Warnings */}
              {preview.stats.submittedReports > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                  <span>Tuần này còn <strong>{preview.stats.submittedReports}</strong> báo cáo ngày chưa được duyệt.</span>
                </div>
              )}
              {preview.emptyReason === "NO_REPORTS_IN_RANGE" && (
                <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-600">
                  <FileWarning className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
                  <span>Chưa có báo cáo ngày trong khoảng tuần này. Bạn vẫn có thể lưu nháp báo cáo tuần và bổ sung sau.</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Section C: Bảng tổng hợp khối lượng tuần */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-blue-50/80 px-5 py-3.5 border-b border-blue-100 flex items-center gap-2.5">
          <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-blue-800 text-[15px]">Tổng hợp khối lượng tuần</h3>
          {totalWorkItems > 0 && (
            <span className="ml-auto text-[12px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">{totalWorkItems} hạng mục</span>
          )}
        </div>
        <div className="p-4">
          {!preview || preview.groups.length === 0 ? (
            <div className="py-8 text-center">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-[13px] text-slate-500 font-medium">
                {!form.projectId || !form.weekStartDate
                  ? "Chọn công trình và tuần để xem tổng hợp khối lượng."
                  : "Chưa có dữ liệu khối lượng từ báo cáo ngày đã duyệt trong tuần này."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[700px] text-[13px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="w-12 px-3 py-3 text-center">STT</th>
                    <th className="px-4 py-3">Hạng mục / Công việc</th>
                    <th className="w-16 px-2 py-3 text-center">ĐVT</th>
                    <th className="w-28 px-3 py-3 text-right">KL tuần này</th>
                    <th className="w-20 px-3 py-3 text-center">Số ngày</th>
                    <th className="w-48 px-3 py-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.groups.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                      <tr className="bg-slate-50/70">
                        <td colSpan={6} className="px-4 py-2 font-bold text-slate-700 text-[12px] uppercase tracking-wide border-b border-slate-100">
                          {group.categoryName}
                        </td>
                      </tr>
                      {group.items.map((item, iIdx) => (
                        <tr key={`${gIdx}-${iIdx}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 text-center text-slate-400">{iIdx + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{item.workContent}</td>
                          <td className="px-2 py-2.5 text-center text-slate-600">{item.unit || "-"}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-blue-700">{item.quantity.toLocaleString("vi-VN")}</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">{item.dates.length}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-[12px]">Từ {item.dates.length} BC ngày</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section D: Nhận xét tổng hợp tuần */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5">
          <div className="bg-violet-100 p-1.5 rounded-lg text-violet-600">
            <ClipboardList className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-800 text-[15px]">Nhận xét tổng hợp tuần</h3>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-slate-400" /> Tình hình thi công trong tuần
            </label>
            <textarea
              value={form.summary || ""}
              onChange={e => updateField("summary", e.target.value)}
              className={`${textareaClass} ${errors.summary ? "border-red-400" : ""}`}
              placeholder="Tổng hợp tiến độ, khối lượng hoàn thành, các công tác chính trong tuần..."
            />
            {errors.summary && <p className="text-[11px] text-red-500 font-medium">{errors.summary}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" /> Nguồn lực sử dụng trong tuần
              </label>
              <textarea
                value={form.labor || ""}
                onChange={e => updateField("labor", e.target.value)}
                className={textareaClass}
                placeholder="Nhân công, máy móc, thiết bị đã sử dụng..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-slate-400" /> Vật tư sử dụng trong tuần
              </label>
              <textarea
                value={form.materials || ""}
                onChange={e => updateField("materials", e.target.value)}
                className={textareaClass}
                placeholder="Vật tư chính đã nhập/sử dụng trong tuần..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-slate-400" /> Chất lượng / An toàn lao động
            </label>
            <textarea
              value={form.quality || ""}
              onChange={e => updateField("quality", e.target.value)}
              className={textareaClass}
              placeholder="Đánh giá chất lượng thi công, tình hình an toàn lao động trong tuần..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                <FileWarning className="w-4 h-4 text-slate-400" /> Vướng mắc phát sinh
              </label>
              <textarea
                value={form.issues || ""}
                onChange={e => updateField("issues", e.target.value)}
                className={textareaClass}
                placeholder="Các vấn đề phát sinh, khó khăn cần giải quyết..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-slate-400" /> Kiến nghị / Đề xuất
              </label>
              <textarea
                value={form.recommendations || ""}
                onChange={e => updateField("recommendations", e.target.value)}
                className={textareaClass}
                placeholder="Đề xuất, kiến nghị lên cấp trên..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" /> Kế hoạch tuần sau
            </label>
            <textarea
              value={form.weeklyNote?.legacyNote || ""}
              onChange={e => updateField("weeklyNote", { ...(form.weeklyNote || { version: 1 }), legacyNote: e.target.value })}
              className={textareaClass}
              placeholder="Công việc dự kiến thực hiện trong tuần tiếp theo..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-center ${colors[color] || colors.slate}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-[20px] font-black leading-tight">{value}</p>
    </div>
  );
}
