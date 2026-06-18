"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Save, Trash2, ChevronRight, ChevronDown, ListTree, FileText, Info, X, Search, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createItem, updateItem, deleteItem, batchUpdateItems } from "@/app/(dashboard)/projects/[id]/field-progress/actions";
import { formatQuantity } from "@/lib/field-progress";
import { sharedTableStyles } from "./table-styles";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

const UNIT_OPTIONS = [
  "m", "m²", "m³", "kg", "tấn", "cái", "bộ", "md",
  "công", "ca", "chuyến", "lít", "bao", "viên",
  "m² sàn", "m dài",
];

export function MasterTable({ projectId, templateId, initialItems }: { projectId: string, templateId: string, initialItems: any[] }) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dirtyItems, setDirtyItems] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const operationRef = useRef(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const toast = useToast();
  const [activeUnitItem, setActiveUnitItem] = useState<string | null>(null);
  const [activeUnitAnchor, setActiveUnitAnchor] = useState<HTMLElement | null>(null);
  const [mobileSearch, setMobileSearch] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({});

  const withOperation = async <T,>(operation: () => Promise<T>): Promise<T | undefined> => {
    if (operationRef.current) return undefined;
    operationRef.current = true;
    setLoading(true);
    try {
      return await operation();
    } catch {
      toast.error("Không thể hoàn tất thao tác. Vui lòng kiểm tra kết nối và thử lại.");
      return undefined;
    } finally {
      operationRef.current = false;
      setLoading(false);
    }
  };

  // By default expand all for desktop; mobile uses separate mobileExpanded
  useEffect(() => {
    const exp: Record<string, boolean> = {};
    const mExp: Record<string, boolean> = {};
    const groups = initialItems.filter(i => i.itemType === 'GROUP');
    groups.forEach((g, idx) => {
      exp[g.id] = true;
      mExp[g.id] = idx === 0; // Only first group expanded on mobile
    });
    setExpanded(exp);
    setMobileExpanded(mExp);
    setItems(initialItems);
    setDirtyItems({});
  }, [initialItems]);

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleMobileExpand = (id: string) => setMobileExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleChange = (id: string, field: string, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
    
    setDirtyItems(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || items.find(i => i.id === id)),
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    const updates = Object.values(dirtyItems);
    if (updates.length === 0) return;
    
    const res = await withOperation(() => batchUpdateItems(projectId, updates));
    if (!res) return;
    if (res?.error) {
      toast.error(res.error || "Không thể lưu thay đổi. Vui lòng thử lại.");
    } else {
      setDirtyItems({});
      toast.success("Đã lưu thay đổi");
    }
  };

  const handleAddGroup = async () => {
    const res = await withOperation(() => createItem(templateId, projectId, {
      itemType: "GROUP",
      categoryName: "Hạng mục mới",
      level: 0
    }));
    if (!res) return;
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Đã thêm hạng mục mới");
    }
  };

  const handleAddWork = async (parentId: string, parentLevel: number) => {
    const res = await withOperation(() => createItem(templateId, projectId, {
      parentId,
      itemType: "WORK",
      workContent: "Công việc mới",
      level: parentLevel + 1,
      unit: "Lần"
    }));
    if (!res) return;
    if (res?.error) {
      toast.error(res.error);
    }
    if (res?.item) {
      setExpanded(prev => ({ ...prev, [parentId]: true }));
      toast.success("Đã thêm công việc mới");
    }
  };

  const handleDelete = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const res = await withOperation(() => deleteItem(itemToDelete.id, projectId));
    if (!res) return;
    if (res?.error) {
      toast.error("Không thể xóa. Vui lòng thử lại.");
    } else {
      toast.success("Đã xóa hạng mục/công việc.");
    }
    setItemToDelete(null);
  };

  // Warning when leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(dirtyItems).length > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyItems]);

  const hasChanges = Object.keys(dirtyItems).length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 md:px-5 md:py-4 border-b border-slate-200 flex flex-row items-center justify-between gap-3 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="hidden md:flex w-8 h-8 rounded-lg bg-blue-100 items-center justify-center">
            <ListTree className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm md:text-base">Thiết lập hạng mục &amp; công việc</h2>
            <p className="text-xs text-slate-500 mt-0.5 hidden md:block">Thiết lập hạng mục, công việc, mũi thi công và khối lượng thiết kế.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="hidden sm:flex h-9 px-3 text-sm bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors" 
            onClick={handleAddGroup} 
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-1.5 text-blue-600" /> Thêm hạng mục chính
          </Button>
          <Button 
            variant="outline" 
            className="sm:hidden h-8 px-2.5 text-xs bg-white border-slate-300 text-slate-700 hover:bg-slate-50" 
            onClick={handleAddGroup} 
            disabled={loading}
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" /> Thêm
          </Button>
          {hasChanges && (
            <span className="hidden sm:inline-flex text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded-md border border-amber-200">
              {Object.keys(dirtyItems).length} thay đổi chưa lưu
            </span>
          )}
          <Button 
            className={`hidden md:flex h-9 px-4 text-sm font-semibold transition-all border items-center justify-center ${
              hasChanges 
                ? "!border-blue-600 !bg-blue-600 !text-white hover:!bg-blue-700 hover:!border-blue-700 shadow-sm" 
                : "!border-slate-200 !bg-slate-100 !text-slate-400 shadow-none cursor-not-allowed hover:!bg-slate-100 disabled:opacity-100"
            }`}
            onClick={handleSave} 
            disabled={!hasChanges || loading}
            title={!hasChanges ? "Không có thay đổi để lưu" : "Lưu các thay đổi thiết lập bảng khối lượng gốc"}
          >
            <Save className={`w-4 h-4 mr-1.5 ${!hasChanges ? "text-slate-400" : "text-white"}`} /> {loading ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-30 shadow-sm">
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.stt} sticky left-0 z-20 text-center`}>STT</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.content} sticky left-[56px] z-20 text-left`}>Nội dung công việc / Hạng mục</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.crew} text-center`}>Mũi thi công</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.unit} text-center`}>Đơn vị</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.designQty} text-right`}>Khối lượng thiết kế</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.cumulative} text-right text-blue-700 bg-blue-50/60`}>
                Lũy kế duyệt
              </th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.percent} text-right text-blue-700 bg-blue-50/60`}>Tỷ lệ hoàn thành</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.notes} text-left`}>Ghi chú</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.action} text-center`}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              if (item.parentId && !expanded[item.parentId]) return null;
              
              const isGroup = item.itemType === "GROUP";
              const isDirty = !!dirtyItems[item.id];
              
              let percentVal = item.rollupPercent;
              let isOver = false;
              if (percentVal && Number(percentVal) > 100) isOver = true;

              return (
                <tr 
                  key={item.id} 
                  className={isGroup ? sharedTableStyles.groupRow : isDirty ? 'bg-amber-50/30 border-slate-100' : sharedTableStyles.workRow}
                >
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.stt} sticky left-0 z-10 ${isGroup ? 'bg-slate-50' : isDirty ? 'bg-amber-50/30' : 'bg-white'} text-center text-slate-400`}>
                    {index + 1}
                  </td>
                  
                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.content} sticky left-[56px] z-10 ${isGroup ? 'bg-slate-50' : isDirty ? 'bg-amber-50/30' : 'bg-white'}`} style={{ paddingLeft: `${item.displayLevel * 24 + 12}px` }}>
                    <div className="flex items-center gap-1.5">
                      {isGroup && (
                        <button aria-label={expanded[item.id] ? "Thu gọn hạng mục" : "Mở rộng hạng mục"} onClick={() => toggleExpand(item.id)} className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0">
                          {expanded[item.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                      {!isGroup && <div className="w-5 flex-shrink-0" />}
                      <label htmlFor={`master-content-${item.id}`} className="sr-only">{isGroup ? "Tên hạng mục" : "Tên công việc"}</label>
                      <textarea 
                        id={`master-content-${item.id}`}
                        name={`master-content-${item.id}`}
                        rows={2}
                        value={isGroup ? (item.categoryName || "") : (item.workContent || "")} 
                        onChange={e => handleChange(item.id, isGroup ? 'categoryName' : 'workContent', e.target.value)}
                        placeholder={isGroup ? "Nhập tên hạng mục..." : "Nhập tên công việc..."}
                        title={isGroup ? (item.categoryName || "") : (item.workContent || "")}
                        className={`w-full resize-none bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1.5 transition-all outline-none leading-tight overflow-hidden align-middle ${isGroup ? 'font-bold text-slate-900 text-sm' : 'font-semibold text-slate-800 text-sm'}`}
                      />
                    </div>
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.crew} text-center ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    {isGroup ? <span className="text-slate-400">—</span> : (
                      <>
                        <label htmlFor={`master-crew-${item.id}`} className="sr-only">Mũi thi công</label>
                        <input 
                          id={`master-crew-${item.id}`}
                          name={`master-crew-${item.id}`}
                          value={item.constructionCrew || ""} 
                          onChange={e => handleChange(item.id, 'constructionCrew', e.target.value)}
                          title={item.constructionCrew || ""}
                          className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-center text-slate-900 font-medium text-sm transition-all outline-none placeholder:font-normal placeholder:text-slate-400 text-ellipsis overflow-hidden whitespace-nowrap"
                          placeholder="Nhập mũi..."
                        />
                      </>
                    )}
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.unit} text-center ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    {isGroup ? <span className="text-slate-400">—</span> : (() => {
                      const currentUnit = item.unit || "";
                      const isCustom = currentUnit !== "" && !UNIT_OPTIONS.includes(currentUnit);
                      return (
                        <div className="relative flex flex-col gap-1 items-center justify-center">
                          <button
                            onClick={(e) => {
                              if (activeUnitItem === item.id) {
                                setActiveUnitItem(null);
                                setActiveUnitAnchor(null);
                              } else {
                                setActiveUnitItem(item.id);
                                setActiveUnitAnchor(e.currentTarget);
                              }
                            }}
                            className={`w-full bg-white hover:bg-slate-50 border ${currentUnit ? 'border-slate-200 text-slate-700' : 'border-dashed border-slate-300 text-slate-400'} hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-md px-1.5 py-1 text-center text-sm font-medium transition-all outline-none line-clamp-1`}
                            title={currentUnit || "Chọn đơn vị"}
                          >
                            {currentUnit || "Chọn đơn vị"}
                          </button>
                        </div>
                      );
                    })()}
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.designQty} text-right ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    {isGroup ? (
                      <span className="text-slate-700 font-bold text-sm px-2">{item.rollupDesignQuantity ? formatQuantity(item.rollupDesignQuantity) : "-"}</span>
                    ) : (
                      <>
                        <label htmlFor={`master-designQty-${item.id}`} className="sr-only">Khối lượng thiết kế</label>
                        <input 
                          id={`master-designQty-${item.id}`}
                          name={`master-designQty-${item.id}`}
                          type="number"
                          step="any"
                          value={item.designQuantity || ""} 
                          onChange={e => handleChange(item.id, 'designQuantity', e.target.value)}
                          className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-right font-semibold text-slate-800 text-sm transition-all outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          placeholder="0.00"
                        />
                      </>
                    )}
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.cumulative} text-right bg-blue-50/40 font-bold text-blue-700`}>
                    {item.rollupCumulative ? formatQuantity(item.rollupCumulative) : "0"}
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.percent} text-right bg-blue-50/40 relative`}>
                    <span className={`font-bold text-sm ${isOver ? 'text-red-600' : 'text-blue-700'}`}>
                      {percentVal ? `${percentVal}%` : "-"}
                    </span>
                    {isOver && (
                      <div className="flex items-center justify-end gap-0.5 mt-0.5">
                        <span className="text-[10px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-semibold border border-red-200">Vượt khối lượng</span>
                      </div>
                    )}
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.notes} ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    {isGroup ? <span className="text-slate-400 block text-center">—</span> : (
                      <>
                        <label htmlFor={`master-note-${item.id}`} className="sr-only">Ghi chú</label>
                        <input 
                          id={`master-note-${item.id}`}
                          name={`master-note-${item.id}`}
                          value={item.note || ""} 
                          onChange={e => handleChange(item.id, 'note', e.target.value)}
                          title={item.note || ""}
                          className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-slate-600 text-sm transition-all outline-none text-ellipsis overflow-hidden whitespace-nowrap"
                          placeholder="Ghi chú..."
                        />
                      </>
                    )}
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.action} text-center`}>
                    <div className="flex items-center justify-center gap-1">
                      {isGroup && (
                        <button 
                          aria-label="Thêm công việc con"
                          onClick={() => handleAddWork(item.id, item.displayLevel)} 
                          className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors" 
                          title="Thêm công việc"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        aria-label="Xóa dòng"
                        onClick={() => handleDelete(item.id)} 
                        className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors" 
                        title="Xóa dòng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center bg-white">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Bảng khối lượng đang trống</h3>
                    <p className="text-sm text-slate-500">
                      Bắt đầu bằng cách thêm hạng mục chính, sau đó thêm các công việc con để quản lý chi tiết.
                    </p>
                    <Button onClick={handleAddGroup} className="bg-blue-600 hover:bg-blue-700 text-white mt-2 shadow-md shadow-blue-200">
                      <Plus className="w-4 h-4 mr-2" /> Thêm hạng mục đầu tiên
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View — Compact Large-List UX */}
      <div className="md:hidden flex flex-col pb-24 bg-slate-50/50">
        {/* Mobile Search */}
        {items.length > 0 && (
          <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm px-2 pt-2 pb-1.5">
            <div className="relative">
              <label htmlFor="master-mobileSearch" className="sr-only">Tìm kiếm</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="master-mobileSearch"
                name="master-mobileSearch"
                value={mobileSearch}
                onChange={e => setMobileSearch(e.target.value)}
                placeholder="Tìm công việc, mũi thi công..."
                className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-150 ease-out focus:shadow-sm"
              />
              {mobileSearch && (
                <button aria-label="Xóa tìm kiếm" onClick={() => setMobileSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 p-2">
        {items.length === 0 ? (
          <div className="text-center p-6 bg-white rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-800">Chưa có công việc</h3>
            <Button onClick={handleAddGroup} className="mt-4 bg-blue-600 text-white w-full h-10">Thêm hạng mục</Button>
          </div>
        ) : (() => {
          const groups = items.filter(i => i.itemType === 'GROUP');
          const searchLower = mobileSearch.toLowerCase().trim();

          const getChildren = (groupId: string) => items.filter(i => i.parentId === groupId && i.itemType === 'WORK');

          const filterChildren = (children: any[]) => {
            if (!searchLower) return children;
            return children.filter(c =>
              (c.workContent || "").toLowerCase().includes(searchLower) ||
              (c.constructionCrew || "").toLowerCase().includes(searchLower) ||
              (c.unit || "").toLowerCase().includes(searchLower)
            );
          };

          const filteredGroups = groups.filter(g => {
            if (!searchLower) return true;
            if ((g.categoryName || "").toLowerCase().includes(searchLower)) return true;
            return filterChildren(getChildren(g.id)).length > 0;
          });

          if (searchLower && filteredGroups.length === 0) {
            return (
              <div className="text-center py-8 px-4">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">Không tìm thấy công việc phù hợp</p>
                <button onClick={() => setMobileSearch("")} className="mt-2 text-xs text-blue-600 font-semibold">Xóa bộ lọc</button>
              </div>
            );
          }

          return filteredGroups.map(group => {
            const children = getChildren(group.id);
            const visibleChildren = filterChildren(children);
            const isExpanded = mobileExpanded[group.id];
            const isDirtyGroup = !!dirtyItems[group.id];

            // Group summary stats
            const groupDesignTotal = children.reduce((s, c) => s + Number(c.designQuantity || 0), 0);
            const groupCumulativeTotal = children.reduce((s, c) => s + Number(c.rollupCumulative || 0), 0);
            const groupPercent = groupDesignTotal > 0 ? ((groupCumulativeTotal / groupDesignTotal) * 100).toFixed(1) : null;

            return (
              <div key={group.id} className={`rounded-xl border overflow-hidden transition-all duration-200 ease-out motion-reduce:transition-none ${isExpanded ? 'border-blue-200 bg-blue-50/30 shadow' : 'border-slate-200 bg-white shadow-sm'}`}>
                {/* Group Header */}
                <button
                  aria-label={isExpanded ? "Thu gọn hạng mục" : "Mở rộng hạng mục"}
                  onClick={() => toggleMobileExpand(group.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 active:bg-blue-50 active:scale-[0.99] transition-all duration-200 ease-out motion-reduce:transition-none text-left"
                >
                  <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <ChevronRight className={`w-3.5 h-3.5 text-blue-600 transition-transform duration-200 motion-reduce:transition-none ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13px] text-slate-900 truncate">{group.categoryName || "Hạng mục mới"}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-slate-500">{children.length} công việc</span>
                      {groupDesignTotal > 0 && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-[11px] text-slate-500">Thiết kế {formatQuantity(groupDesignTotal)}</span>
                        </>
                      )}
                      {groupPercent && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-[11px] font-semibold text-blue-600">{groupPercent}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>

                {/* Group Actions (inline, always visible) */}
                <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-100 bg-white">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddWork(group.id, group.displayLevel)}
                      className="flex items-center gap-1 text-blue-600 text-xs font-bold px-2 py-1 rounded hover:bg-blue-50 active:bg-blue-100 active:scale-95 transition-all duration-150 ease-out motion-reduce:transition-none"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm công việc
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button aria-label="Sửa hạng mục" onClick={() => { setEditingItemId(group.id); }} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 active:scale-90 transition-all duration-150" title="Sửa tên hạng mục">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button aria-label="Xóa hạng mục" onClick={() => handleDelete(group.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all duration-150" title="Xóa hạng mục">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Children List (compact) */}
                {isExpanded && visibleChildren.length > 0 && (
                  <div className="border-t border-slate-100">
                    {visibleChildren.map((work, wIdx) => {
                      const isDirtyWork = !!dirtyItems[work.id];
                      const pct = work.rollupPercent;
                      return (
                        <div
                          key={work.id}
                          className={`flex items-center gap-2 px-3 py-2 ${wIdx > 0 ? 'border-t border-slate-50' : ''} ${isDirtyWork ? 'bg-amber-50/40' : 'bg-transparent'} hover:bg-slate-50 active:bg-blue-50 active:scale-[0.985] transition-all duration-150 ease-out motion-reduce:transition-none cursor-pointer`}
                          onClick={() => setEditingItemId(work.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[13px] text-slate-800 truncate">{work.workContent || "Công việc mới"}</div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap text-[11px] text-slate-500">
                              {work.constructionCrew && (
                                <><span className="truncate max-w-[100px]">{work.constructionCrew}</span><span className="text-slate-300">·</span></>
                              )}
                              <span>{work.unit || "—"}</span>
                              <span className="text-slate-300">·</span>
                              <span>{work.designQuantity ? formatQuantity(work.designQuantity) : "0"}</span>
                              {pct && (
                                <><span className="text-slate-300">·</span><span className="font-semibold text-blue-600">{pct}%</span></>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <div className="px-2 py-1 bg-slate-100 rounded text-[11px] font-semibold text-slate-600 hover:bg-blue-100 hover:text-blue-700 active:bg-blue-200 transition-colors flex items-center gap-1">
                              <Pencil className="w-3 h-3" /> Sửa
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {isExpanded && visibleChildren.length === 0 && children.length > 0 && searchLower && (
                  <div className="px-3 py-4 text-center text-xs text-slate-400 border-t border-slate-100">Không có công việc khớp bộ lọc</div>
                )}
                {isExpanded && children.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-slate-400 border-t border-slate-100">Chưa có công việc trong hạng mục này</div>
                )}
              </div>
            );
          });
        })()}
        </div>
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-slate-200 bg-white/90 backdrop-blur-md p-3 pb-safe md:hidden transition-transform duration-300 ${hasChanges ? 'translate-y-0' : 'translate-y-full shadow-none border-transparent'}`}>
        <Button 
          className="h-10 flex-1 text-sm font-bold rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 active:scale-[0.98]"
          onClick={handleSave} 
          disabled={!hasChanges || loading}
        >
          <Save className="w-4 h-4 mr-2 text-white" /> {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Xóa hạng mục/công việc?"
        description={
          <>
            Dữ liệu sẽ được xóa mềm và không còn hiển thị trên Bảng khối lượng, Nhập theo ngày và Tổng hợp. Bạn vẫn có thể khôi phục bằng dữ liệu sao lưu nếu cần.
            <div className="mt-3 p-3 bg-red-50 text-red-800 text-sm rounded-lg border border-red-100">
              <span className="font-semibold block mb-1">Lưu ý:</span>
              {itemToDelete?.itemType === 'GROUP' 
                ? "Hạng mục này và các công việc con liên quan sẽ được ẩn khỏi các màn nhập và tổng hợp khối lượng." 
                : "Công việc này sẽ được ẩn khỏi các màn nhập và tổng hợp khối lượng."}
            </div>
          </>
        }
        variant="danger"
        confirmText="Xóa"
        onConfirm={handleConfirmDelete}
        isLoading={loading}
      />

      {/* Edit Bottom Sheet (Mobile) */}
      {editingItemId && (() => {
        const item = items.find(i => i.id === editingItemId);
        if (!item) return null;
        const isGroup = item.itemType === 'GROUP';
        const isDirty = !!dirtyItems[item.id];

        return (
          <div className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 md:hidden" onClick={(e) => { if (e.target === e.currentTarget) setEditingItemId(null); }}>
            <div className="bg-white w-full rounded-t-3xl shadow-xl flex flex-col animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] pb-safe">
              {/* Sheet Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-3xl">
                <h3 className="text-base font-bold text-slate-900">{isGroup ? "Sửa hạng mục" : "Sửa công việc"}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { handleDelete(item.id); setEditingItemId(null); }}
                    className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                  <button onClick={() => setEditingItemId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors bg-slate-50">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sheet Body */}
              <div className="p-5 overflow-y-auto flex flex-col gap-4">
                {/* Name */}
                <div>
                  <label htmlFor={`mobile-content-${item.id}`} className="text-[11px] font-semibold text-slate-600 mb-1.5 block">{isGroup ? "Tên hạng mục" : "Tên công việc"}</label>
                  <input
                    id={`mobile-content-${item.id}`}
                    name={`mobile-content-${item.id}`}
                    value={isGroup ? (item.categoryName || "") : (item.workContent || "")}
                    onChange={e => handleChange(item.id, isGroup ? 'categoryName' : 'workContent', e.target.value)}
                    placeholder={isGroup ? "Nhập tên hạng mục..." : "Nhập tên công việc..."}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-3 outline-none text-[15px] font-semibold text-slate-900 transition-all"
                  />
                </div>

                {!isGroup && (
                  <>
                    {/* Construction Crew */}
                    <div>
                      <label htmlFor={`mobile-crew-${item.id}`} className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Mũi thi công</label>
                      <input
                        id={`mobile-crew-${item.id}`}
                        name={`mobile-crew-${item.id}`}
                        value={item.constructionCrew || ""}
                        onChange={e => handleChange(item.id, 'constructionCrew', e.target.value)}
                        placeholder="Nhập mũi thi công"
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-3 outline-none text-[15px] text-slate-900 font-medium transition-all"
                      />
                    </div>

                    {/* Unit + Design Quantity */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Đơn vị</label>
                        <button
                          onClick={() => { setActiveUnitItem(item.id); }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-left text-[15px] flex items-center justify-between active:bg-blue-50 active:scale-[0.98] transition-all duration-150 ease-out hover:border-blue-400"
                        >
                          {item.unit ? <span className="font-semibold text-slate-900">{item.unit}</span> : <span className="text-slate-400">Chọn</span>}
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                      <div>
                        <label htmlFor={`mobile-designQty-${item.id}`} className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Khối lượng thiết kế</label>
                        <input
                          id={`mobile-designQty-${item.id}`}
                          name={`mobile-designQty-${item.id}`}
                          type="text"
                          inputMode="decimal"
                          value={item.designQtyRaw !== undefined ? item.designQtyRaw : (item.designQuantity || "")}
                          onChange={e => handleChange(item.id, 'designQtyRaw', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-3 outline-none text-[15px] font-bold text-slate-900 transition-all"
                        />
                      </div>
                    </div>

                    {/* Read-only stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50/60 px-3 py-2.5 rounded-xl border border-blue-100">
                        <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Lũy kế duyệt</div>
                        <div className="font-bold text-[15px] text-slate-800">{item.rollupCumulative ? formatQuantity(item.rollupCumulative) : "0"}</div>
                      </div>
                      <div className="bg-blue-50/60 px-3 py-2.5 rounded-xl border border-blue-100">
                        <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Tỷ lệ hoàn thành</div>
                        <div className="font-bold text-[15px] text-blue-700">{item.rollupPercent ? `${item.rollupPercent}%` : "0%"}</div>
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <label htmlFor={`mobile-note-${item.id}`} className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Ghi chú</label>
                      <input
                        id={`mobile-note-${item.id}`}
                        name={`mobile-note-${item.id}`}
                        value={item.note || ""}
                        onChange={e => handleChange(item.id, 'note', e.target.value)}
                        placeholder="Ghi chú..."
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-3 outline-none text-[15px] text-slate-700 transition-all"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Sheet Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
                <button
                  onClick={() => setEditingItemId(null)}
                  className="flex-1 h-11 px-4 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 active:scale-95 transition-all duration-150 ease-out"
                >
                  Đóng
                </button>
                {isDirty && (
                  <button
                    onClick={async () => { await handleSave(); }}
                    disabled={loading}
                    className="flex-1 h-11 px-4 text-sm font-bold text-white bg-blue-600 border border-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 active:scale-95 flex items-center justify-center gap-1.5 transition-all duration-150 ease-out shadow-sm disabled:opacity-70 disabled:scale-100"
                  >
                    <Save className="w-4 h-4" /> {loading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {/* Unit Picker Modal (Mobile) */}
      {activeUnitItem && (() => {
        const item = items.find(i => i.id === activeUnitItem);
        if (!item) return null;
        
        const currentUnit = item.unit || "";
        const isCustom = currentUnit !== "" && !UNIT_OPTIONS.includes(currentUnit);
        
        return (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 md:hidden" onClick={(e) => { if (e.target === e.currentTarget) setActiveUnitItem(null); }}>
            <div className="bg-white w-full rounded-t-3xl shadow-xl flex flex-col animate-in slide-in-from-bottom-8 duration-300 max-h-[85vh] pb-safe">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-3xl">
                <h3 className="text-lg font-bold text-slate-900">Chọn đơn vị</h3>
                <button onClick={() => setActiveUnitItem(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors bg-slate-50">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto">
                <div className="flex flex-wrap gap-2.5 mb-6">
                  {UNIT_OPTIONS.map(u => (
                    <button
                      key={u}
                      onClick={() => { handleChange(item.id, 'unit', u); setActiveUnitItem(null); }}
                      className={`px-3 py-2 rounded-xl text-[15px] font-semibold border active:scale-95 transition-all duration-150 ease-out ${currentUnit === u && !isCustom ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                
                <div className="mt-2 pt-5 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-500 mb-2.5 block uppercase tracking-wide">Đơn vị khác</label>
                  <div className="flex items-stretch gap-3">
                    <label htmlFor={`mobile-customUnit-${item.id}`} className="sr-only">Đơn vị khác</label>
                    <input 
                      id={`mobile-customUnit-${item.id}`}
                      name={`mobile-customUnit-${item.id}`}
                      value={item._tempCustomUnit !== undefined ? item._tempCustomUnit : (isCustom ? currentUnit : "")}
                      onChange={e => {
                        setItems(prev => prev.map(it => it.id === item.id ? { ...it, _tempCustomUnit: e.target.value } : it));
                      }}
                      placeholder="Nhập đơn vị khác..."
                      className="flex-1 min-w-0 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 outline-none text-base shadow-sm font-medium text-slate-900"
                    />
                    <Button 
                      className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 active:scale-95 transition-all duration-150 ease-out text-white h-auto py-3 px-4 rounded-xl text-sm font-semibold leading-none whitespace-nowrap shrink-0 min-w-[92px]" 
                      onClick={() => {
                        const val = item._tempCustomUnit !== undefined ? item._tempCustomUnit : (isCustom ? currentUnit : "");
                        if (val.trim()) {
                          handleChange(item.id, 'unit', val.trim());
                        }
                        setActiveUnitItem(null);
                      }}
                    >
                      Áp dụng
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Desktop Unit Picker Portal */}
      {activeUnitItem && activeUnitAnchor && (
        <DesktopUnitPickerPortal
          anchorEl={activeUnitAnchor}
          currentUnit={items.find(i => i.id === activeUnitItem)?.unit || ""}
          onClose={() => {
            setActiveUnitItem(null);
            setActiveUnitAnchor(null);
          }}
          onChange={(unit) => handleChange(activeUnitItem, 'unit', unit)}
        />
      )}
    </div>
  );
}

function DesktopUnitPickerPortal({
  anchorEl,
  currentUnit,
  onClose,
  onChange,
}: {
  anchorEl: HTMLElement;
  currentUnit: string;
  onClose: () => void;
  onChange: (unit: string) => void;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  
  useEffect(() => {
    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const POPOVER_WIDTH = 320;
      const POPOVER_HEIGHT = 280;
      const GAP = 8;
      const PADDING = 12;

      let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
      left = Math.min(left, window.innerWidth - POPOVER_WIDTH - PADDING);
      left = Math.max(PADDING, left);

      let top = rect.bottom + GAP;
      if (top + POPOVER_HEIGHT > window.innerHeight - PADDING) {
        top = rect.top - POPOVER_HEIGHT - GAP;
      }
      top = Math.max(PADDING, top);

      setStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${POPOVER_WIDTH}px`,
        zIndex: 9999,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorEl]);

  const isCustom = currentUnit !== "" && !UNIT_OPTIONS.includes(currentUnit);
  const [customVal, setCustomVal] = useState(isCustom ? currentUnit : "");

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div style={style} className="bg-white border border-slate-200 rounded-xl shadow-2xl p-3 flex flex-col max-h-[300px]">
        <div className="text-xs font-semibold text-slate-500 mb-2 flex justify-between items-center">
          Chọn đơn vị
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="overflow-y-auto pr-1 mb-3 custom-scrollbar">
          <div className="grid grid-cols-4 gap-1.5">
            {UNIT_OPTIONS.map(u => {
              const isSelected = u === currentUnit;
              return (
                <button
                  key={u}
                  onClick={() => { onChange(u); onClose(); }}
                  className={`px-1 py-1.5 rounded text-xs font-medium transition-colors border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-slate-200 shadow-sm'}`}
                >
                  {u}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 mt-auto">
          <div className="text-xs font-semibold text-slate-500 mb-2">Đơn vị khác</div>
          <div className="flex gap-2">
            <input
              value={customVal}
              onChange={e => setCustomVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onChange(customVal); onClose(); }
                if (e.key === 'Escape') onClose();
              }}
              placeholder="Nhập tuỳ chỉnh..."
              className="flex-1 bg-white border border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-md px-2 py-1.5 text-sm transition-all outline-none min-w-0"
              autoFocus={isCustom}
            />
            <button 
              onClick={() => { onChange(customVal); onClose(); }}
              className="whitespace-nowrap min-w-[76px] px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 transition-colors"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
