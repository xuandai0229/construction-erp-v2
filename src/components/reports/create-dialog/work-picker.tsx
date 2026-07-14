import React, { useState, useMemo } from "react";
import { Search, Filter, CheckCircle2, AlertCircle, Building2, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";

export type PickerWorkItem = {
  id: string;
  fieldProgressItemId: string;
  code?: string | null;
  categoryName?: string | null;
  name: string;
  workContent: string;
  designQuantity: number;
  approvedCumulative: number;
  cumulativeBeforeDate: number;
  cumulativeAfterDate: number;
  totalActiveEnteredQuantity: number;
  approvedQuantity: number;
  pendingQuantity: number;
  draftQuantity: number;
  submittedQuantity: number;
  todayQuantity: number;
  remainingQuantity: number;
  unit: string;
  status: string;
  itemStatus?: string;
};

export function WorkPicker({
  isOpen,
  onClose,
  workItems,
  onSelect,
  isLoading = false,
  projectCode,
  projectName
}: {
  isOpen: boolean;
  onClose: () => void;
  workItems: PickerWorkItem[];
  onSelect: (items: PickerWorkItem[]) => void;
  isLoading?: boolean;
  projectCode?: string;
  projectName?: string;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "HAS_REMAINING" | "NO_REMAINING">("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Initialization: expand all by default
  React.useEffect(() => {
    if (workItems.length > 0) {
      const cats = new Set(workItems.map(w => w.categoryName || "Chung"));
      setExpandedCategories(cats);
    }
  }, [workItems]);

  const filtered = useMemo(() => {
    return workItems.filter(item => {
      if (filter === "HAS_REMAINING" && item.remainingQuantity <= 0) return false;
      if (filter === "NO_REMAINING" && item.remainingQuantity > 0) return false;
      
      const needle = search.toLowerCase();
      if (!needle) return true;
      
      return (item.name?.toLowerCase().includes(needle) || 
              item.code?.toLowerCase().includes(needle) || 
              item.categoryName?.toLowerCase().includes(needle) ||
              item.workContent?.toLowerCase().includes(needle));
    });
  }, [workItems, search, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, PickerWorkItem[]>();
    for (const item of filtered) {
      const cat = item.categoryName || "Chung";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleCategorySelect = (catItems: PickerWorkItem[]) => {
    const next = new Set(selectedIds);
    const allSelected = catItems.every(i => next.has(i.id));
    if (allSelected) {
      catItems.forEach(i => next.delete(i.id));
    } else {
      catItems.forEach(i => next.add(i.id));
    }
    setSelectedIds(next);
  };

  const toggleCategoryExpand = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedCategories(next);
  };

  const handleConfirm = () => {
    const selected = workItems.filter(w => selectedIds.has(w.id));
    onSelect(selected);
    setSelectedIds(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col h-[95vh] max-h-[900px] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Chọn khối lượng công việc</h2>
            <p className="text-[13px] text-slate-500 mt-1">
              {projectCode ? `${projectCode} — ${projectName}` : 'Chọn từ khối lượng gốc của công trình'}
            </p>
          </div>
          <CloseButton onClick={onClose} tone="neutral" />
        </div>

        <div className="p-4 border-b border-slate-100 shrink-0 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                type="text"
                placeholder="Tìm theo hạng mục, mã, tên công việc..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "HAS_REMAINING", label: "Còn khối lượng" },
                { id: "NO_REMAINING", label: "Đã hoàn thành" }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${filter === f.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 text-[13px] text-slate-600">
             <span>Tổng: <strong>{workItems.length}</strong></span>
             <span>Còn khối lượng: <strong className="text-blue-600">{workItems.filter(i => i.remainingQuantity > 0).length}</strong></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {isLoading ? (
            <div className="text-center py-16 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <h3 className="text-slate-700 font-semibold">Đang tải bảng khối lượng...</h3>
            </div>
          ) : workItems.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-blue-300" />
              </div>
              <h3 className="text-slate-700 font-bold mb-2">Chưa có bảng khối lượng</h3>
              <p className="text-slate-500 text-[14px] max-w-xl mx-auto">
                Hạng mục và công việc của công trình này đang trống. Vui lòng kiểm tra lại thiết lập công trình.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-700 font-semibold">Không tìm thấy công việc phù hợp</h3>
              <p className="text-slate-500 text-[14px] mt-1">Thử thay đổi từ khóa hoặc bộ lọc</p>
            </div>
          ) : (
            <div className="min-w-[800px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur z-10 border-b border-slate-200 text-[12px] uppercase text-slate-500 font-bold shadow-sm">
                  <tr>
                    <th className="w-12 px-4 py-3 text-center">Chọn</th>
                    <th className="w-16 px-2 py-3 text-center">STT</th>
                    <th className="px-4 py-3">Mã & Tên Công Việc</th>
                    <th className="w-20 px-2 py-3 text-center">Đơn vị</th>
                    <th className="w-28 px-4 py-3 text-right">Thiết kế</th>
                    <th className="w-28 px-4 py-3 text-right">Lũy kế</th>
                    <th className="w-28 px-4 py-3 text-right text-blue-700">Hôm nay</th>
                    <th className="w-28 px-4 py-3 text-right font-black">Còn lại</th>
                    <th className="w-32 px-4 py-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {grouped.map(([category, items]) => {
                    const isExpanded = expandedCategories.has(category);
                    const allSelected = items.every(i => selectedIds.has(i.id));
                    const someSelected = items.some(i => selectedIds.has(i.id));
                    
                    return (
                      <React.Fragment key={category}>
                        <tr className="bg-slate-100/80 border-b border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors" onClick={() => toggleCategoryExpand(category)}>
                          <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              checked={allSelected}
                              ref={input => { if (input) input.indeterminate = someSelected && !allSelected; }}
                              onChange={() => toggleCategorySelect(items)}
                            />
                          </td>
                          <td colSpan={8} className="px-4 py-2.5 font-bold text-slate-800">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                              {category} <span className="text-slate-500 font-medium ml-1">({items.length} công việc)</span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && items.map((item, index) => {
                          const isSelected = selectedIds.has(item.id);
                          const isDone = item.remainingQuantity <= 0;
                          return (
                            <tr 
                              key={item.id} 
                              onClick={() => toggleSelect(item.id)}
                              className={`border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'} ${isDone && !isSelected ? 'opacity-60 bg-slate-50' : ''}`}
                            >
                              <td className="px-4 py-3 text-center">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  checked={isSelected}
                                  readOnly
                                />
                              </td>
                              <td className="px-2 py-3 text-center text-slate-400 font-medium">{index + 1}</td>
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-800 line-clamp-2">
                                  {item.code ? <span className="text-blue-600 mr-1.5 font-mono text-[12px]">[{item.code}]</span> : null}
                                  {item.name || item.workContent}
                                </div>
                              </td>
                              <td className="px-2 py-3 text-center font-medium text-slate-600">{item.unit}</td>
                              <td className="px-4 py-3 text-right font-medium text-slate-600">{item.designQuantity}</td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                <div>{item.cumulativeAfterDate}</div>
                                {(item.pendingQuantity > 0 || item.draftQuantity > 0) && (
                                  <div className="text-[10px] font-semibold text-amber-600">
                                    Cho/Draft: {item.pendingQuantity + item.draftQuantity}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-blue-600">{item.todayQuantity || 0}</td>
                              <td className="px-4 py-3 text-right font-black text-slate-900">{item.remainingQuantity}</td>
                              <td className="px-4 py-3 text-center">
                                {isDone ? (
                                  <span className="inline-flex px-2 py-1 bg-slate-200 text-slate-600 rounded text-[11px] font-bold whitespace-nowrap">ĐÃ HOÀN THÀNH</span>
                                ) : (
                                  <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-700 rounded text-[11px] font-bold whitespace-nowrap">CÒN LẠI</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl shrink-0 flex items-center justify-between">
          <span className="text-[14px] font-medium text-slate-700">Đã chọn: <strong className="text-blue-600 text-base">{selectedIds.size}</strong> công việc</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-lg px-6 h-10 border-slate-300">Hủy bỏ</Button>
            <Button onClick={handleConfirm} disabled={selectedIds.size === 0} className="rounded-lg px-8 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm">
              Thêm vào báo cáo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
