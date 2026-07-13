import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Calendar, FileText, BarChart3, AlertTriangle, CheckCircle2, Clock, XCircle, FileWarning, Lightbulb, Users, Wrench, ShieldAlert, ClipboardList, CalendarRange, ListPlus } from "lucide-react";
import { type CreateReportFormData } from "../types";
import { getWeeklyReportSummary } from "@/app/(dashboard)/reports/actions";
import { getVietnamDateString, getVietnamIsoWeekInfo } from "@/lib/reports/report-timezone";
import { formatNumberSafe, formatPercentSafe } from "@/lib/reports/report-format-utils";
import { ContentCard } from "@/components/ui/enterprise";

import { WorkPicker, type PickerWorkItem } from "./work-picker";

interface WeeklyReportFormProps {
  form: CreateReportFormData;
  updateField: (field: string, value: any) => void;
  errors: Record<string, string>;
  workItems?: PickerWorkItem[];
  activeTab: "result" | "plan" | "notes";
  setActiveTab: (tab: "result" | "plan" | "notes") => void;
}

function formatDateVN(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

type WeeklyPreview = {
  dayStatuses: { date: string; hasReport: boolean; approvedCount: number; submittedCount: number; draftCount: number; rejectedCount: number }[];
  stats: { approvedReports: number; submittedReports: number; rejectedReports: number; emptyDays: number; workLineCount: number; workItemCount?: number; attachmentCount: number; totalQuantityInWeek?: number };
  groups: {
    categoryId: string;
    categoryName: string;
    items: {
      workContent: string;
      unit?: string;
      designQuantity: number;
      quantityBeforeWeek: number;
      quantityInWeek: number;
      quantity: number;
      quantityToDate: number;
      remainingQuantity: number;
      progressPercent: number;
      dates: string[];
      hasIssue?: boolean;
    }[];
  }[];
  emptyReason: string | null;
};

export function WeeklyReportForm({ form, updateField, errors, workItems = [], activeTab, setActiveTab }: WeeklyReportFormProps) {
  const [preview, setPreview] = useState<WeeklyPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  function parseYmdLocal(ymd: string) {
    const [year, month, day] = ymd.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function formatYmdToVietnamDayLabel(ymd: string) {
    const date = parseYmdLocal(ymd);
    const weekday = date.getDay();
    const weekdayLabel = weekday === 0 ? "CN" : `Thứ ${weekday + 1}`;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${weekdayLabel}, ${dd}/${mm}`;
  }

  const inputClass = "w-full h-11 px-3 text-[14px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";
  const textareaClass = "w-full min-h-[100px] p-3 text-[14px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 resize-y leading-relaxed";

  const handleWeekDatePick = useCallback((dateStr: string) => {
    const { weekStartDate, weekEndDate } = getVietnamIsoWeekInfo(dateStr);
    updateField("weekStartDate", weekStartDate);
    updateField("weekEndDate", weekEndDate);
  }, [updateField]);

  const setRelativeWeek = useCallback((offsetWeeks: number) => {
    const base = new Date();
    base.setDate(base.getDate() + offsetWeeks * 7);
    const { weekStartDate, weekEndDate } = getVietnamIsoWeekInfo(base);
    updateField("weekStartDate", weekStartDate);
    updateField("weekEndDate", weekEndDate);
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
  
  // Calculate default next week dates
  const nextWeekPlanDefaultStart = useMemo(() => {
    if (!form.weekEndDate) return "";
    const d = new Date(form.weekEndDate + "T00:00:00+07:00");
    d.setDate(d.getDate() + 1);
    return getVietnamDateString(d);
  }, [form.weekEndDate]);
  
  const nextWeekPlanDefaultEnd = useMemo(() => {
    if (!nextWeekPlanDefaultStart) return "";
    const d = new Date(nextWeekPlanDefaultStart + "T00:00:00+07:00");
    d.setDate(d.getDate() + 6);
    return getVietnamDateString(d);
  }, [nextWeekPlanDefaultStart]);

  const handleSelectWorkItems = useCallback((items: PickerWorkItem[]) => {
    const currentPlan = form.weeklyNote?.nextWeekPlan || [];
    
    const newPlans = items.map(item => {
      // Check if already in plan
      if (currentPlan.some(p => p.fieldProgressItemId === item.fieldProgressItemId)) return null;
      
      return {
        fieldProgressItemId: item.fieldProgressItemId,
        workContent: item.name,
        unit: item.unit,
        remainingQuantity: item.remainingQuantity,
        plannedQuantityNextWeek: item.remainingQuantity > 0 ? Math.min(item.remainingQuantity, item.designQuantity * 0.1) : 0,
        plannedStartDate: nextWeekPlanDefaultStart,
        plannedEndDate: nextWeekPlanDefaultEnd,
      };
    }).filter(Boolean) as any[];

    if (newPlans.length > 0) {
      updateField("weeklyNote", {
        ...(form.weeklyNote || { version: 2 }),
        nextWeekPlan: [...currentPlan, ...newPlans]
      });
    }
  }, [form.weeklyNote, nextWeekPlanDefaultStart, nextWeekPlanDefaultEnd, updateField]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("result")}
          className={`pb-3 text-[14px] font-bold border-b-2 transition-colors ${activeTab === "result" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Kết quả tuần
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("plan")}
          className={`pb-3 text-[14px] font-bold border-b-2 transition-colors ${activeTab === "plan" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Kế hoạch tuần sau
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`pb-3 text-[14px] font-bold border-b-2 transition-colors ${activeTab === "notes" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Nhận xét & minh chứng
        </button>
      </div>

      {/* Summary Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <CalendarRange className="w-5 h-5 text-slate-400 shrink-0" />
        <div className="flex flex-col text-[13px] text-slate-700">
          {form.weekStartDate && form.weekEndDate ? (
            <>
              <div><span className="font-semibold text-slate-500">Kỳ báo cáo:</span> <strong className="text-blue-700 ml-1">{formatDateVN(form.weekStartDate)} - {formatDateVN(form.weekEndDate)}</strong></div>
              <div><span className="font-semibold text-slate-500">Kế hoạch tuần sau:</span> <strong className="text-emerald-700 ml-1">{formatDateVN(nextWeekPlanDefaultStart)} - {formatDateVN(nextWeekPlanDefaultEnd)}</strong></div>
            </>
          ) : (
            <>
              <div className="font-semibold">Chưa chọn kỳ báo cáo</div>
              <div className="text-slate-500">Kế hoạch tuần sau sẽ tự động tính sau khi chọn kỳ báo cáo</div>
            </>
          )}
        </div>
      </div>

      {activeTab === "result" && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Section A: Tuần báo cáo */}
          <ContentCard className="overflow-hidden">
            <div className="bg-indigo-50/80 px-5 py-3.5 border-b border-indigo-100 flex items-center gap-2.5">
              <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600">
                <CalendarRange className="w-4 h-4" />
              </div>
          <h3 className="font-bold text-indigo-800 text-[15px]">Tuần báo cáo</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <button type="button" onClick={() => setRelativeWeek(-1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-50">
                  Tuần trước
                </button>
                <button type="button" onClick={() => setRelativeWeek(0)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-bold text-indigo-700 hover:bg-indigo-100">
                  Tuần này
                </button>
                <span className="text-[12px] text-slate-500 ml-2">Có thể chỉnh trực tiếp từ ngày/đến ngày nếu cần chọn khoảng riêng.</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Chọn ngày trong tuần <span className="text-red-500">*</span></label>
                  <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                    type="date"
                    data-testid="weekly-picker-date"
                    value={form.weekStartDate || ""}
                    onChange={e => handleWeekDatePick(e.target.value)}
                    className={`${inputClass} ${errors.weekStartDate ? "border-red-400" : ""}`}
                  />
                  {errors.weekStartDate && <p className="text-[11px] text-red-500 font-medium">{errors.weekStartDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Từ ngày</label>
                  <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" type="date" data-testid="weekly-start-date" value={form.weekStartDate || ""} onChange={e => updateField("weekStartDate", e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700">Đến ngày</label>
                  <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" type="date" data-testid="weekly-end-date" value={form.weekEndDate || ""} onChange={e => updateField("weekEndDate", e.target.value)} className={inputClass} />
                </div>
              </div>
              {form.weekStartDate && form.weekEndDate && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-[14px] text-indigo-800 font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                  Kết quả thực hiện trong kỳ báo cáo từ ngày <strong>{formatDateVN(form.weekStartDate)}</strong> đến ngày <strong>{formatDateVN(form.weekEndDate)}</strong>
                </div>
              )}
              {form.weekStartDate && new Date(form.weekStartDate) > new Date() && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[14px] text-amber-800 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  Tuần này chưa xảy ra, chưa có báo cáo ngày để tổng hợp. Bạn chỉ có thể lập kế hoạch tuần tới.
                </div>
              )}
            </div>
          </ContentCard>

          {/* Section B: Dữ liệu báo cáo ngày */}
          <ContentCard className="overflow-hidden">
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
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <StatBadge label="Tổng báo cáo ngày" value={preview.dayStatuses.filter(d => d.hasReport).length} color="blue" />
                    <StatBadge label="Đã duyệt" value={preview.stats.approvedReports} color="emerald" />
                    <StatBadge label="Chờ duyệt" value={preview.stats.submittedReports} color="amber" />
                    <StatBadge label="Từ chối" value={preview.stats.rejectedReports} color="red" />
                    <StatBadge label="Ngày trống" value={preview.stats.emptyDays} color="slate" />
                  </div>

                  {/* Day status row */}
                  <div className="flex gap-1.5 flex-wrap">
                    {preview.dayStatuses.map((d, i) => {
                      const dayLabel = formatYmdToVietnamDayLabel(d.date);
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
                      <span>Chưa có báo cáo ngày đã duyệt trong tuần này.</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </ContentCard>

          {/* Section C: Bảng tổng hợp khối lượng tuần */}
          <ContentCard className="overflow-hidden">
            <div className="bg-blue-50/80 px-5 py-3.5 border-b border-blue-100 flex items-center gap-2.5">
              <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-blue-800 text-[15px]">Kết quả thực hiện trong kỳ báo cáo</h3>
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
                      : "Chưa có báo cáo ngày đã duyệt trong tuần này."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse min-w-[700px] text-[13px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-bold">
                      <tr>
                        <th className="w-12 px-2 py-3 text-center">STT</th>
                        <th className="px-3 py-3">Hạng mục / Công việc</th>
                        <th className="w-16 px-2 py-3 text-center">Đơn vị</th>
                        <th className="w-20 px-2 py-3 text-right">Thiết kế</th>
                        <th className="w-20 px-2 py-3 text-right">Trước tuần</th>
                        <th className="w-20 px-2 py-3 text-right text-blue-700">Tuần này</th>
                        <th className="w-20 px-2 py-3 text-right">Lũy kế</th>
                        <th className="w-20 px-2 py-3 text-right">Còn lại</th>
                        <th className="w-16 px-2 py-3 text-center">% HT</th>
                        <th className="w-32 px-3 py-3 text-center">Ngày phát sinh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.groups.map((group, gIdx) => (
                        <React.Fragment key={gIdx}>
                          <tr className="bg-slate-50/70">
                            <td colSpan={10} className="px-3 py-2 font-bold text-slate-700 text-[12px] uppercase tracking-wide border-b border-slate-100">
                              {group.categoryName}
                            </td>
                          </tr>
                          {group.items.map((item, iIdx) => {
                            const dateLabels = item.dates.map(d => new Date(d + "T00:00:00").toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' })).join(", ");
                            return (
                            <tr key={`${gIdx}-${iIdx}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="px-2 py-2.5 text-center text-slate-400">{iIdx + 1}</td>
                              <td className="px-3 py-2.5 font-medium text-slate-800">{item.workContent}</td>
                              <td className="px-2 py-2.5 text-center text-slate-600">{item.unit || "-"}</td>
                              <td className="px-2 py-2.5 text-right text-slate-600">{formatNumberSafe(item.designQuantity)}</td>
                              <td className="px-2 py-2.5 text-right text-slate-600">{formatNumberSafe(item.quantityBeforeWeek)}</td>
                              <td className="px-2 py-2.5 text-right font-bold text-blue-700">{formatNumberSafe(item.quantity)}</td>
                              <td className="px-2 py-2.5 text-right text-emerald-600 font-semibold">{formatNumberSafe(item.quantityToDate)}</td>
                              <td className="px-2 py-2.5 text-right text-slate-600">{formatNumberSafe(item.remainingQuantity)}</td>
                              <td className="px-2 py-2.5 text-center text-slate-600">{formatPercentSafe(item.progressPercent)}</td>
                              <td className="px-3 py-2.5 text-center text-[11px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]" title={dateLabels}>
                                {dateLabels}
                              </td>
                            </tr>
                          )})}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </ContentCard>
        </div>
      )}

      {activeTab === "plan" && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <ContentCard className="overflow-hidden">
            <div className="bg-blue-50/80 px-5 py-3.5 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-blue-800 text-[15px]">Kế hoạch tuần sau</h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const itemsFromPreview = preview?.groups.flatMap(g => g.items.filter(i => i.remainingQuantity > 0)) || [];
                    const defaultPlans = itemsFromPreview.map(i => ({
                      fieldProgressItemId: i.workContent,
                      workContent: i.workContent,
                      unit: i.unit,
                      remainingQuantity: i.remainingQuantity,
                      plannedQuantityNextWeek: i.remainingQuantity > 0 ? Math.min(i.remainingQuantity, i.designQuantity * 0.1) : 0,
                      plannedStartDate: nextWeekPlanDefaultStart,
                      plannedEndDate: nextWeekPlanDefaultEnd,
                    }));
                    updateField("weeklyNote", {
                      ...(form.weeklyNote || { version: 2 }),
                      nextWeekPlan: defaultPlans.length > 0 ? defaultPlans : [{ fieldProgressItemId: `new-${Date.now()}`, workContent: "Công việc mới", unit: "", remainingQuantity: 0, plannedQuantityNextWeek: 0, plannedStartDate: nextWeekPlanDefaultStart, plannedEndDate: nextWeekPlanDefaultEnd }]
                    });
                  }}
                  className="text-[12px] bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  Tự động lấy từ khối lượng còn lại
                </button>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="text-[12px] bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  Chọn công việc gốc
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentPlan = form.weeklyNote?.nextWeekPlan || [];
                    updateField("weeklyNote", {
                      ...(form.weeklyNote || { version: 2 }),
                      nextWeekPlan: [...currentPlan, { fieldProgressItemId: `new-${Date.now()}`, workContent: "Công việc mới", unit: "", remainingQuantity: 0, plannedQuantityNextWeek: 0, plannedStartDate: nextWeekPlanDefaultStart, plannedEndDate: nextWeekPlanDefaultEnd }]
                    });
                  }}
                  className="text-[12px] bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 shadow-sm"
                >
                  + Thêm dòng thủ công
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {form.weeklyNote?.nextWeekPlan && form.weeklyNote.nextWeekPlan.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-[13px] min-w-[800px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-bold">
                      <tr>
                        <th className="px-3 py-2 w-8">#</th>
                        <th className="px-3 py-2 min-w-[200px]">Công việc</th>
                        <th className="px-2 py-2 w-16 text-center">Đơn vị</th>
                        <th className="px-2 py-2 w-24 text-right">Còn lại HT</th>
                        <th className="px-2 py-2 w-28 text-right text-blue-700">Dự kiến tuần tới</th>
                        <th className="px-2 py-2 w-32">Từ ngày</th>
                        <th className="px-2 py-2 w-32">Đến ngày</th>
                        <th className="px-2 py-2 w-32">Phụ trách</th>
                        <th className="px-2 py-2 w-32">Vật tư</th>
                        <th className="px-2 py-2 w-32">Thiết bị</th>
                        <th className="px-2 py-2 w-32">Ghi chú/Rủi ro</th>
                        <th className="px-2 py-2 w-12 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.weeklyNote.nextWeekPlan.map((plan, idx) => (
                        <tr key={plan.fieldProgressItemId || idx} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-400 text-center">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" type="text" value={plan.workContent} onChange={(e) => {
                              const newPlan = [...(form.weeklyNote?.nextWeekPlan || [])];
                              newPlan[idx].workContent = e.target.value;
                              updateField("weeklyNote", { ...form.weeklyNote, nextWeekPlan: newPlan });
                            }} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none px-1 py-0.5" />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" type="text" value={plan.unit || ""} onChange={(e) => {
                              const newPlan = [...(form.weeklyNote?.nextWeekPlan || [])];
                              newPlan[idx].unit = e.target.value;
                              updateField("weeklyNote", { ...form.weeklyNote, nextWeekPlan: newPlan });
                            }} className="w-full bg-transparent border-b border-dashed border-slate-300 text-center focus:border-blue-500 outline-none px-1 py-0.5" />
                          </td>
                          <td className="px-2 py-2 text-right text-slate-600 font-medium">
                             {plan.remainingQuantity ? formatNumberSafe(plan.remainingQuantity) : "0"}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" type="number" min="0" step="any" value={plan.plannedQuantityNextWeek || ""} onChange={(e) => {
                              const newPlan = [...(form.weeklyNote?.nextWeekPlan || [])];
                              newPlan[idx].plannedQuantityNextWeek = Number(e.target.value);
                              updateField("weeklyNote", { ...form.weeklyNote, nextWeekPlan: newPlan });
                            }} className="w-full bg-transparent border-b border-blue-300 text-right text-blue-700 font-bold focus:border-blue-600 outline-none px-1 py-0.5" />
                            {(plan.plannedQuantityNextWeek || 0) > (plan.remainingQuantity || 0) && (
                              <div className="text-[10px] text-red-500 font-semibold mt-1">Vượt còn lại</div>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" type="date" value={plan.plannedStartDate || ""} onChange={(e) => {
                              const newPlan = [...(form.weeklyNote?.nextWeekPlan || [])];
                              newPlan[idx].plannedStartDate = e.target.value;
                              updateField("weeklyNote", { ...form.weeklyNote, nextWeekPlan: newPlan });
                            }} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none px-1 py-0.5 text-xs" />
                          </td>
                          <td className="px-2 py-2">
                            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" type="date" value={plan.plannedEndDate || ""} onChange={(e) => {
                              const newPlan = [...(form.weeklyNote?.nextWeekPlan || [])];
                              newPlan[idx].plannedEndDate = e.target.value;
                              updateField("weeklyNote", { ...form.weeklyNote, nextWeekPlan: newPlan });
                            }} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none px-1 py-0.5 text-xs" />
                          </td>
                          <td className="px-2 py-2">
                            <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" type="text" value={plan.constructionCrew || ""} onChange={(e) => {
                              const newPlan = [...(form.weeklyNote?.nextWeekPlan || [])];
                              newPlan[idx].constructionCrew = e.target.value;
                              updateField("weeklyNote", { ...form.weeklyNote, nextWeekPlan: newPlan });
                            }} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none px-1 py-0.5" placeholder="Tổ/đội..." />
                          </td>
                          <td className="px-2 py-2">
                            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" type="text" value={plan.materialNeeds || ""} onChange={(e) => {
                              const newPlan = [...(form.weeklyNote?.nextWeekPlan || [])];
                              newPlan[idx].materialNeeds = e.target.value;
                              updateField("weeklyNote", { ...form.weeklyNote, nextWeekPlan: newPlan });
                            }} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none px-1 py-0.5" placeholder="Vật tư..." />
                          </td>
                          <td className="px-2 py-2">
                            <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" type="text" value={plan.equipmentNeeds || ""} onChange={(e) => {
                              const newPlan = [...(form.weeklyNote?.nextWeekPlan || [])];
                              newPlan[idx].equipmentNeeds = e.target.value;
                              updateField("weeklyNote", { ...form.weeklyNote, nextWeekPlan: newPlan });
                            }} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none px-1 py-0.5" placeholder="Thiết bị..." />
                          </td>
                          <td className="px-2 py-2">
                            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" type="text" value={plan.riskNote || ""} onChange={(e) => {
                              const newPlan = [...(form.weeklyNote?.nextWeekPlan || [])];
                              newPlan[idx].riskNote = e.target.value;
                              updateField("weeklyNote", { ...form.weeklyNote, nextWeekPlan: newPlan });
                            }} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none px-1 py-0.5" placeholder="Ghi chú..." />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button type="button" onClick={() => {
                              const newPlan = form.weeklyNote?.nextWeekPlan?.filter((_, i) => i !== idx);
                              updateField("weeklyNote", { ...form.weeklyNote, nextWeekPlan: newPlan });
                            }} className="text-red-400 hover:text-red-600">
                              <XCircle className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-[13px] text-slate-500 font-medium">Chưa có kế hoạch tuần sau.</p>
                  <p className="text-[12px] text-slate-400 mt-1">Bấm &quot;Tự động lấy từ khối lượng còn lại&quot; hoặc thêm thủ công.</p>
                </div>
              )}
            </div>
          </ContentCard>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <ContentCard className="overflow-hidden">
            <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5">
              <div className="bg-violet-100 p-1.5 rounded-lg text-violet-600">
                <ClipboardList className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 text-[15px]">Nhận xét tổng hợp tuần</h3>
            </div>
            <div className="p-5 space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] text-slate-600 mb-2">
                Các nhận xét, hình ảnh và tài liệu bên dưới áp dụng cho kỳ báo cáo đã chọn. Kế hoạch tuần sau được quản lý riêng ở tab Kế hoạch tuần sau.
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-slate-400" /> Tình hình thi công trong tuần
                </label>
                <textarea  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
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
                  <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
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
                  <textarea  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
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
                <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
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
                  <textarea  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
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
                  <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                    value={form.recommendations || ""}
                    onChange={e => updateField("recommendations", e.target.value)}
                    className={textareaClass}
                    placeholder="Đề xuất, kiến nghị lên cấp trên..."
                  />
                </div>
              </div>
            </div>
          </ContentCard>
        </div>
      )}
      
      <WorkPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        workItems={workItems}
        onSelect={handleSelectWorkItems}
        projectCode={form.projectId} // we just need truthy
        projectName={form.projectId}
      />
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
