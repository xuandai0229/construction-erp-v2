"use client";

import { useState, useMemo, Fragment } from "react";
import { Search, X, Calendar, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatWorkDate } from "@/lib/date/work-date";
import { formatQuantity } from "@/lib/field-progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { CloseButton } from "@/components/ui/close-button";
import { EnterpriseTable } from "@/components/ui/enterprise";

interface SummaryDesktopViewProps {
  displayItems: any[];
  dynamicDates: Date[];
  mode: string;
  formattedFromDate: string;
  includesUnapproved: boolean;
}

function formatWorkDateShort(date: Date): string {
  const dateStr = formatWorkDate(date);
  return `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`;
}

export function SummaryDesktopView({
  displayItems,
  dynamicDates,
  mode,
  formattedFromDate,
  includesUnapproved
}: SummaryDesktopViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "HAS_ENTRIES" | "NO_ENTRIES" | "COMPLETED" | "OVER_VOLUME">("ALL");
  const [showDayColumns, setShowDayColumns] = useState(false);
  const [activeItem, setActiveItem] = useState<any | null>(null);

  // Apply filters
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return displayItems.filter(item => {
      // Search filter
      if (term !== "") {
        const matchSearch =
          item.categoryName?.toLowerCase().includes(term) ||
          item.workContent?.toLowerCase().includes(term) ||
          item.constructionCrew?.toLowerCase().includes(term) ||
          item.parent?.categoryName?.toLowerCase().includes(term);
        if (!matchSearch) return false;
      }

      // Groups always show if they have matching children (handled by showing them)
      if (item.itemType === "GROUP") return true;

      // Status filter
      const percentNum = item.designQty > 0 ? (item.cumulative / item.designQty) * 100 : 0;
      const isOver = item.designQty > 0 && (percentNum > 100 || (includesUnapproved && (item.cumulativeBefore + item.periodTotal > item.designQty)));

      switch (filterStatus) {
        case "HAS_ENTRIES": return item.periodTotal > 0;
        case "NO_ENTRIES": return item.periodTotal === 0;
        case "COMPLETED": return percentNum >= 100;
        case "OVER_VOLUME": return isOver;
        case "ALL":
        default: return true;
      }
    });
  }, [displayItems, searchTerm, filterStatus, includesUnapproved]);

  const thBase = "px-3 py-2.5 text-[12px] font-semibold text-slate-500 bg-slate-50 whitespace-nowrap border-b border-slate-200 sticky top-0 z-30 shadow-sm";
  const tdBase = "px-3 py-2.5 text-sm border-b border-slate-100 bg-white group-hover/row:bg-slate-50/50";

  return (
    <div className="hidden md:block">
      {/* Desktop search & chip filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <label htmlFor="summary-desktop-search" className="sr-only">Tìm kiếm công việc</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
            id="summary-desktop-search"
            name="summary-desktop-search"
            type="text"
            aria-label="Tìm kiếm công việc, hạng mục"
            placeholder="Tìm công việc, hạng mục, mũi thi công..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "HAS_ENTRIES", label: "Có phát sinh" },
            { id: "NO_ENTRIES", label: "Chưa phát sinh" },
            { id: "COMPLETED", label: "Đã hoàn thành" },
            { id: "OVER_VOLUME", label: "Vượt khối lượng" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id as any)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                filterStatus === f.id
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {dynamicDates.length > 0 && (
          <button
            onClick={() => setShowDayColumns(!showDayColumns)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
              showDayColumns
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            aria-label={showDayColumns ? "Ẩn cột ngày phát sinh" : "Xem bảng chi tiết theo ngày"}
          >
            {showDayColumns ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showDayColumns ? "Ẩn cột ngày" : "Xem chi tiết theo ngày"}
          </button>
        )}
      </div>

      {/* Table */}
      <EnterpriseTable className="hidden md:block shadow-sm">
        <table className="w-full text-left" style={{ tableLayout: 'auto', minWidth: showDayColumns ? '100%' : '100%' }}>
          <colgroup>
            <col style={{ width: '48px' }} />
            <col style={{ width: 'auto' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '64px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '90px' }} />
            {!showDayColumns && <col style={{ width: '160px' }} />}
            {showDayColumns && dynamicDates.map((d) => (
              <col key={formatWorkDate(d)} style={{ width: '90px' }} />
            ))}
            <col style={{ width: '72px' }} />
          </colgroup>
          <thead>
            <tr>
              <th className={`${thBase} text-center`}>STT</th>
              <th className={`${thBase} text-left`}>Hạng mục / Công việc</th>
              <th className={`${thBase} text-center`}>Mũi thi công</th>
              <th className={`${thBase} text-center`}>Đơn vị</th>
              <th className={`${thBase} text-right`}>Thiết kế</th>
              <th className={`${thBase} text-right`} title={`Tổng khối lượng đã duyệt trước ngày ${formattedFromDate}`}>Trước kỳ</th>
              <th className={`${thBase} text-right text-blue-700 bg-blue-50/80`}>Trong kỳ</th>
              <th className={`${thBase} text-right text-blue-700 bg-blue-50/80`}>Lũy kế</th>
              <th className={`${thBase} text-right`}>Tỷ lệ</th>
              {!showDayColumns && (
                <th className={`${thBase} text-left`}>Phát sinh</th>
              )}
              {showDayColumns && dynamicDates.map(d => (
                <th key={formatWorkDate(d)} className={`${thBase} text-right`}>{formatWorkDateShort(d)}</th>
              ))}
              <th className={`${thBase} text-center`}>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item: any, idx: number) => {
              const isGroup = item.itemType === "GROUP";
              const designQty = item.designQty;
              const cumulativeBefore = item.cumulativeBefore;
              const periodTotal = item.periodTotal;
              const cumulative = item.cumulative;

              let percent: string | null = null;
              let isOver = false;
              if (designQty > 0) {
                percent = ((cumulative / designQty) * 100).toFixed(2);
                const projectedTotal = cumulativeBefore + periodTotal;
                if (Number(percent) > 100 || (includesUnapproved && projectedTotal > designQty)) isOver = true;
              }

              const daysWithEntries = dynamicDates.filter(d => (item.dayTotals[formatWorkDate(d)] || 0) > 0);

              const rowBg = isGroup
                ? "bg-slate-50/70 [&>td]:bg-slate-50/70"
                : isOver
                ? "bg-red-50/40 [&>td]:bg-red-50/40 hover:bg-red-50/60"
                : "bg-white group/row";

              return (
                <tr key={item.id} className={`${rowBg} transition-colors`}>
                  <td className={`${tdBase} text-center text-slate-500 font-medium`}>{idx + 1}</td>
                  <td className={`${tdBase} text-left`} style={{ paddingLeft: `${(item.displayLevel || 0) * 20 + 12}px` }}>
                    {isGroup ? (
                      <div className="font-bold text-slate-900 truncate" title={item.categoryName}>{item.categoryName}</div>
                    ) : (
                      <>
                        <div className="text-[10px] text-slate-400 mb-0.5 truncate uppercase tracking-wider" title={item.parent?.categoryName}>{item.parent?.categoryName || "—"}</div>
                        <div className="font-semibold text-slate-800 truncate" title={item.workContent}>{item.workContent}</div>
                      </>
                    )}
                  </td>
                  <td className={`${tdBase} text-center truncate`} title={item.constructionCrew || ""}>
                    {item.constructionCrew ? <span className="text-slate-700 font-medium">{item.constructionCrew}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className={`${tdBase} text-center`}>
                    {isGroup ? <span className="text-slate-300">—</span> : item.unit ? <span className="text-slate-700 font-medium">{item.unit}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className={`${tdBase} text-right font-semibold ${isGroup ? 'text-slate-800' : 'text-slate-700'}`}>
                    {designQty > 0 ? formatQuantity(designQty) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className={`${tdBase} text-right ${isGroup ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                    {cumulativeBefore > 0 ? formatQuantity(cumulativeBefore) : "0"}
                  </td>
                  <td className={`${tdBase} text-right font-bold text-blue-700`}>
                    {periodTotal > 0 ? formatQuantity(periodTotal) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className={`${tdBase} text-right font-bold text-blue-800`}>
                    {formatQuantity(cumulative)}
                  </td>
                  <td className={`${tdBase} text-right`}>
                    {designQty === 0 ? (
                      <StatusBadge variant="neutral" size="sm">N/A</StatusBadge>
                    ) : (
                      <StatusBadge variant={isOver ? "danger" : (Number(percent) >= 100 ? "success" : "neutral")} size="sm">
                        {isOver && <span className="mr-1">⚠</span>}
                        {percent}%
                      </StatusBadge>
                    )}
                  </td>
                  {!showDayColumns && (
                    <td className={`${tdBase} text-left`}>
                      {daysWithEntries.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {daysWithEntries.slice(0, 3).map(d => {
                            const dateStr = formatWorkDate(d);
                            const qty = item.dayTotals[dateStr];
                            return (
                              <StatusBadge key={dateStr} variant="info" size="sm" className="gap-0.5 px-1.5 py-0.5 text-[11px] rounded">
                                {formatWorkDateShort(d)} · {formatQuantity(qty)}
                              </StatusBadge>
                            );
                          })}
                          {daysWithEntries.length > 3 && (
                            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">+{daysWithEntries.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  )}
                  {showDayColumns && dynamicDates.map(d => {
                    const dateStr = formatWorkDate(d);
                    const dayTotal = item.dayTotals[dateStr] || 0;
                    return (
                      <td key={dateStr} className={`${tdBase} text-right ${dayTotal > 0 ? 'text-blue-700 font-bold' : 'text-slate-300'}`}>
                        {dayTotal > 0 ? formatQuantity(dayTotal) : "—"}
                      </td>
                    );
                  })}
                  <td className={`${tdBase} text-center`}>
                    {!isGroup && (
                      <button
                        onClick={() => setActiveItem(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-md transition-colors"
                        aria-label={`Xem chi tiết công việc ${item.workContent}`}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        Xem
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={showDayColumns ? 10 + dynamicDates.length : 11} className="px-3 py-12 text-center text-slate-500 bg-slate-50">
                  Chưa có hạng mục công việc phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </EnterpriseTable>

      {/* Detail Drawer / Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
              <h3 className="font-bold text-slate-900 text-[16px]">Chi tiết công việc</h3>
              <CloseButton onClick={() => setActiveItem(null)} tone="neutral" />
            </div>

            <div className="overflow-y-auto px-5 py-4 space-y-5">
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-bold mb-1">{activeItem.parent?.categoryName || "Hạng mục"}</div>
                <h4 className="text-[16px] font-bold text-slate-900 leading-snug">{activeItem.workContent}</h4>
              </div>

              <div className="flex flex-wrap gap-2 text-[13px] font-medium text-slate-600">
                <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">Mũi thi công: <span className="font-bold text-slate-800">{activeItem.constructionCrew || "—"}</span></span>
                <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">Đơn vị: <span className="font-bold text-slate-800">{activeItem.unit || "—"}</span></span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Tổng thiết kế</div>
                  <div className="text-[18px] font-bold text-slate-900">{activeItem.designQty > 0 ? formatQuantity(activeItem.designQty) : "—"}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Trước kỳ</div>
                  <div className="text-[18px] font-bold text-slate-900">{activeItem.cumulativeBefore > 0 ? formatQuantity(activeItem.cumulativeBefore) : "0"}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                  <div className="text-[11px] text-blue-600 uppercase font-bold mb-1">Trong kỳ</div>
                  <div className="text-[18px] font-bold text-blue-700">{activeItem.periodTotal > 0 ? formatQuantity(activeItem.periodTotal) : "0"}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                  <div className="text-[11px] text-emerald-700 uppercase font-bold mb-1">Lũy kế đến nay</div>
                  <div className="text-[18px] font-bold text-emerald-800">{formatQuantity(activeItem.cumulative)}</div>
                </div>
              </div>

              {activeItem.designQty > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-slate-700 uppercase">Tỷ lệ hoàn thành</span>
                  <span className={`text-[20px] font-bold ${
                    (activeItem.cumulative / activeItem.designQty) * 100 > 100 ? 'text-red-600' : 'text-emerald-700'
                  }`}>
                    {((activeItem.cumulative / activeItem.designQty) * 100).toFixed(2)}%
                  </span>
                </div>
              )}

              {dynamicDates.filter(d => (activeItem.dayTotals[formatWorkDate(d)] || 0) > 0).length > 0 && (
                <div>
                  <h4 className="text-[13px] font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Các ngày có phát sinh trong kỳ
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {dynamicDates.filter(d => (activeItem.dayTotals[formatWorkDate(d)] || 0) > 0).map(d => {
                      const dateStr = formatWorkDate(d);
                      const qty = activeItem.dayTotals[dateStr];
                      return (
                        <div key={dateStr} className="flex justify-between items-center bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                          <span className="text-[13px] font-semibold text-slate-600">{dateStr.slice(8, 10)}/{dateStr.slice(5, 7)}/{dateStr.slice(0, 4)}</span>
                          <span className="text-[14px] font-bold text-blue-600">{formatQuantity(qty)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
