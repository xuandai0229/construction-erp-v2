"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Search, Info, X, FileText, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatWorkDate } from "@/lib/date/work-date";
import { formatQuantity } from "@/lib/field-progress";

interface SummaryMobileViewProps {
  displayItems: any[];
  dynamicDates: Date[];
  mode: string;
  formattedFromDate: string;
  includesUnapproved: boolean;
}

export function SummaryMobileView({
  displayItems,
  dynamicDates,
  mode,
  formattedFromDate,
  includesUnapproved
}: SummaryMobileViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "HAS_ENTRIES" | "NO_ENTRIES" | "COMPLETED" | "OVER_VOLUME">("ALL");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    // Mặc định mở group đầu tiên có phát sinh
    const state: Record<string, boolean> = {};
    let foundFirst = false;
    for (const item of displayItems) {
      if (item.itemType === "GROUP") {
        if (!foundFirst && item.periodTotal > 0) {
          state[item.id] = true;
          foundFirst = true;
        } else {
          state[item.id] = false;
        }
      }
    }
    // Nếu không có group nào có phát sinh, mở group đầu tiên
    if (!foundFirst && displayItems.length > 0 && displayItems[0].itemType === "GROUP") {
      state[displayItems[0].id] = true;
    }
    return state;
  });
  
  const [activeItem, setActiveItem] = useState<any | null>(null);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Build tree for filtering
  const treeData = useMemo(() => {
    const groups: { group: any; items: any[] }[] = [];
    let currentGroup: { group: any; items: any[] } | null = null;

    displayItems.forEach(item => {
      if (item.itemType === "GROUP") {
        currentGroup = { group: item, items: [] };
        groups.push(currentGroup);
      } else if (currentGroup) {
        currentGroup.items.push(item);
      }
    });

    return groups;
  }, [displayItems]);

  // Apply filters
  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    return treeData.map(g => {
      const filteredItems = g.items.filter(item => {
        // Search filter
        const matchSearch = item.workContent?.toLowerCase().includes(term) || 
                            g.group.categoryName?.toLowerCase().includes(term) ||
                            item.constructionCrew?.toLowerCase().includes(term);
        
        if (!matchSearch && term !== "") return false;

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

      return { ...g, items: filteredItems };
    }).filter(g => g.items.length > 0 || g.group.categoryName?.toLowerCase().includes(term));
  }, [treeData, searchTerm, filterStatus, includesUnapproved]);

  const isEmpty = filteredGroups.length === 0 && displayItems.length > 0;

  return (
    <div className="md:hidden flex flex-col space-y-4">
      {/* Search & Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="relative mb-3">
          <label htmlFor="mobile-search-input" className="sr-only">Tìm kiếm công việc, hạng mục, mũi thi công</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="mobile-search-input"
            name="mobile-search-input"
            type="text"
            aria-label="Tìm kiếm công việc, hạng mục"
            placeholder="Tìm công việc, hạng mục, mũi thi công..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 pb-1">
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
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all border ${
                filterStatus === f.id 
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm" 
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h3 className="text-[15px] font-bold text-slate-800 mb-1">Không có công việc phù hợp</h3>
          <p className="text-[13px] text-slate-500">Hãy đổi bộ lọc hoặc khoảng thời gian để xem dữ liệu khác.</p>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filteredGroups.map(g => {
          const isExpanded = expandedGroups[g.group.id] ?? false;
          const designQty = g.group.designQty;
          const cumulative = g.group.cumulative;
          const percent = designQty > 0 ? ((cumulative / designQty) * 100).toFixed(2) : null;
          
          return (
            <div key={g.group.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <button 
                onClick={() => toggleGroup(g.group.id)}
                className="w-full text-left p-3.5 bg-slate-50 flex items-start gap-3 active:bg-slate-100 transition-colors"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? `Thu gọn hạng mục ${g.group.categoryName}` : `Mở rộng hạng mục ${g.group.categoryName}`}
              >
                <div className="flex-1">
                  <h3 className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2 mb-1.5">{g.group.categoryName}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <span className="text-slate-500 font-medium">{g.items.length} công việc</span>
                    <span className="text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">Trong kỳ: {g.group.periodTotal > 0 ? formatQuantity(g.group.periodTotal) : "0"}</span>
                    <span className="text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">Lũy kế: {formatQuantity(cumulative)}</span>
                    {percent && <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">Tỷ lệ: {percent}%</span>}
                  </div>
                </div>
                <div className="mt-0.5">
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="flex flex-col divide-y divide-slate-100">
                  {g.items.map(item => {
                    const iDesignQty = item.designQty;
                    const iCumBefore = item.cumulativeBefore;
                    const iPeriodTotal = item.periodTotal;
                    const iCum = item.cumulative;
                    const iPercentNum = iDesignQty > 0 ? (iCum / iDesignQty) * 100 : 0;
                    const iPercent = iDesignQty > 0 ? iPercentNum.toFixed(2) : null;
                    const iOver = iDesignQty > 0 && (iPercentNum > 100 || (includesUnapproved && (iCumBefore + iPeriodTotal > iDesignQty)));

                    const daysWithEntries = dynamicDates.filter(d => (item.dayTotals[formatWorkDate(d)] || 0) > 0);

                    return (
                      <div key={item.id} className={`p-3.5 ${iOver ? 'bg-red-50/30' : 'bg-white'}`}>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h4 className="text-[14px] font-bold text-slate-800 leading-snug line-clamp-2">{item.workContent}</h4>
                          <Button 
                            variant="ghost" 
                            className="h-10 px-3 text-[12px] bg-slate-100 hover:bg-slate-200 text-blue-600 font-semibold shrink-0"
                            onClick={() => setActiveItem(item)}
                            aria-label={`Xem chi tiết công việc ${item.workContent}`}
                          >
                            Chi tiết
                          </Button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-[12px] text-slate-500 font-medium mb-3">
                          <div className="bg-slate-100 px-2 py-0.5 rounded line-clamp-2">Mũi thi công: <span className="text-slate-700">{item.constructionCrew || "—"}</span></div>
                          <div className="bg-slate-100 px-2 py-0.5 rounded inline-block w-fit">Đơn vị: <span className="text-slate-700">{item.unit || "—"}</span></div>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 mb-3">
                          <div className="bg-slate-50 border border-slate-100 rounded text-center py-2 px-1">
                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Tổng TK</div>
                            <div className="text-[12px] font-bold text-slate-800">{iDesignQty > 0 ? formatQuantity(iDesignQty) : "—"}</div>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded text-center py-2 px-1">
                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Trước kỳ</div>
                            <div className="text-[12px] font-bold text-slate-700">{iCumBefore > 0 ? formatQuantity(iCumBefore) : "0"}</div>
                          </div>
                          <div className="bg-blue-50/80 border border-blue-100 rounded text-center py-2 px-1">
                            <div className="text-[10px] text-blue-600 uppercase font-bold mb-0.5">Trong kỳ</div>
                            <div className="text-[12px] font-bold text-blue-700">{iPeriodTotal > 0 ? formatQuantity(iPeriodTotal) : "0"}</div>
                          </div>
                          <div className={`rounded text-center py-2 px-1 border relative ${iOver ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-100'}`}>
                            <div className={`text-[10px] uppercase font-bold mb-0.5 ${iOver ? 'text-red-600' : 'text-emerald-700'}`}>Tỷ lệ</div>
                            <div className={`text-[12px] font-bold ${iOver ? 'text-red-700' : 'text-emerald-800'}`}>{iPercent ? `${iPercent}%` : "—"}</div>
                            {iOver && <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full shadow-sm">VƯỢT</div>}
                          </div>
                        </div>

                        {daysWithEntries.length > 0 && (
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Ngày có phát sinh:</span>
                            {daysWithEntries.slice(0, 3).map(d => {
                              const dateStr = formatWorkDate(d);
                              const qty = item.dayTotals[dateStr];
                              return (
                                <div key={dateStr} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-700 flex items-center gap-1 shadow-sm">
                                  <span>{dateStr.slice(8, 10)}/{dateStr.slice(5, 7)}</span>
                                  <span className="text-slate-300">·</span>
                                  <span className="text-blue-600">{formatQuantity(qty)}</span>
                                </div>
                              );
                            })}
                            {daysWithEntries.length > 3 && (
                              <div className="text-[10px] font-semibold text-slate-400 ml-1">+{daysWithEntries.length - 3} ngày khác</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm p-0 md:hidden">
          <div className="w-full bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
              <h3 className="font-bold text-slate-900 text-[15px]">Chi tiết công việc</h3>
              <Button variant="ghost" className="h-9 w-9 p-0 rounded-full bg-slate-200 hover:bg-slate-300" onClick={() => setActiveItem(null)} aria-label="Đóng chi tiết">
                <X className="h-5 w-5 text-slate-700" />
              </Button>
            </div>
            
            <div className="overflow-y-auto p-4 space-y-4">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">{activeItem.parent?.categoryName || "Hạng mục"}</div>
                <h4 className="text-[15px] font-bold text-slate-900 leading-snug">{activeItem.workContent}</h4>
              </div>
              
              <div className="flex flex-wrap gap-2 text-[12px] font-medium text-slate-600">
                <span className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">Mũi thi công: <span className="font-bold text-slate-800">{activeItem.constructionCrew || "—"}</span></span>
                <span className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">Đơn vị: <span className="font-bold text-slate-800">{activeItem.unit || "—"}</span></span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Tổng thiết kế</div>
                  <div className="text-[16px] font-bold text-slate-900">{activeItem.designQty > 0 ? formatQuantity(activeItem.designQty) : "—"}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Trước kỳ</div>
                  <div className="text-[16px] font-bold text-slate-900">{activeItem.cumulativeBefore > 0 ? formatQuantity(activeItem.cumulativeBefore) : "0"}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="text-[11px] text-blue-600 uppercase font-bold mb-1">Trong kỳ</div>
                  <div className="text-[16px] font-bold text-blue-700">{activeItem.periodTotal > 0 ? formatQuantity(activeItem.periodTotal) : "0"}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-[11px] text-emerald-700 uppercase font-bold mb-1">Tỷ lệ hoàn thành</div>
                  <div className="text-[16px] font-bold text-emerald-800">{activeItem.designQty > 0 ? `${((activeItem.cumulative / activeItem.designQty) * 100).toFixed(2)}%` : "—"}</div>
                </div>
              </div>

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
                        <div key={dateStr} className="flex justify-between items-center bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                          <span className="text-[12px] font-semibold text-slate-600">{dateStr.slice(8, 10)}/{dateStr.slice(5, 7)}/{dateStr.slice(0, 4)}</span>
                          <span className="text-[13px] font-bold text-blue-600">{formatQuantity(qty)}</span>
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
