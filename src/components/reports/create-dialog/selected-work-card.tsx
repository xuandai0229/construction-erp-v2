import React from "react";
import { X, AlertCircle } from "lucide-react";
import { type ReportWorkLine } from "../types";
import { formatPercentSafe } from "@/lib/reports/report-format-utils";

export function SelectedWorkCard({
  line,
  index,
  updateWorkLine,
  removeWorkLine
}: {
  line: Omit<ReportWorkLine, 'id'>;
  index: number;
  updateWorkLine: (index: number, field: keyof Omit<ReportWorkLine, 'id'>, value: any) => void;
  removeWorkLine: (index: number) => void;
}) {
  const design = Number(line.designQuantity || 0);
  const before = Number(line.quantityBefore ?? line.cumulativeBeforeDate ?? 0);
  const sameDay = Number(line.todayQuantity || 0);
  const todayInput = Number(line.quantityToday || 0);
  const remainingBeforeInput = Number(line.remainingQuantity || 0);
  const remainingAfterInput = remainingBeforeInput - todayInput;
  
  const isOver = todayInput > remainingBeforeInput;
  const isDone = remainingBeforeInput <= 0 && todayInput === 0;

  const currentPercent = design > 0 ? formatPercentSafe(Math.min(100, ((before + sameDay + todayInput) / design) * 100), 2) : '0.00%';

  const inputClass = "w-full h-11 px-3 text-[14px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400";

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden relative transition-all ${isOver ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-200 hover:border-slate-300'}`}>
      <button 
        type="button" 
        onClick={() => removeWorkLine(index)}
        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
        title="Xóa công việc khỏi báo cáo"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="bg-slate-50/50 p-4 border-b border-slate-100 pr-12">
        {line.categoryName && <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{line.categoryName}</div>}
        <h4 className="font-bold text-[15px] text-slate-900 leading-tight">
          {line.code ? `[${line.code}] ` : ''}{line.workContent}
        </h4>
        <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
          <span className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium shadow-sm">Thiết kế: <strong className="text-slate-900">{design} {line.unit}</strong></span>
          <span className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium shadow-sm">Đã nhập lũy kế: <strong className="text-slate-900">{before}</strong></span>
          {sameDay > 0 && <span className="bg-orange-50 border border-orange-100 text-orange-700 px-2 py-0.5 rounded-md font-medium shadow-sm">Đã nhập trong ngày: <strong className="font-bold">{sameDay}</strong></span>}
          <span className="bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold shadow-sm">Còn lại: {remainingBeforeInput}</span>
          <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-bold shadow-sm">Tiến độ sau nhập: {currentPercent}</span>
        </div>
      </div>

      <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[13px] font-semibold text-slate-700">Khối lượng thực hiện hôm nay <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type="number"
              value={line.quantityToday || ''}
              onChange={e => updateWorkLine(index, "quantityToday", Number(e.target.value))}
              placeholder="0.0"
              className={`${inputClass} pr-12 font-bold text-lg ${isOver ? 'border-red-400 bg-red-50 text-red-700' : ''}`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{line.unit}</div>
          </div>
          {isOver && (
            <div className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> 
              <span>Khối lượng nhập vượt phần còn lại. Thiết kế: {design} {line.unit}, đã nhập: {before} {line.unit}, còn lại: {remainingBeforeInput} {line.unit}.</span>
            </div>
          )}
          {isDone && !isOver && (
            <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5" /> Hạng mục đã hoàn thành.
            </div>
          )}
        </div>

        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[13px] font-semibold text-slate-700">Ghi chú vấn đề / Vị trí</label>
          <input
            type="text"
            value={line.note || ''}
            onChange={e => updateWorkLine(index, "note", e.target.value)}
            placeholder="Khu vực, số cấu kiện, vướng mắc..."
            className={inputClass}
          />
        </div>

        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[13px] font-semibold text-slate-700">Đề xuất / Xử lý</label>
          <input
            type="text"
            value={line.proposalNote || ''}
            onChange={e => updateWorkLine(index, "proposalNote", e.target.value)}
            placeholder="Ý kiến, đề xuất xử lý..."
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
