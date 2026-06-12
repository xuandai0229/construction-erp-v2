"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Trash2, ChevronRight, ChevronDown, ListTree, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createItem, updateItem, deleteItem, batchUpdateItems } from "@/app/(dashboard)/projects/[id]/field-progress/actions";
import { formatQuantity } from "@/lib/field-progress";
import { sharedTableStyles } from "./table-styles";

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
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // By default expand all
  useEffect(() => {
    const exp: Record<string, boolean> = {};
    initialItems.forEach(i => exp[i.id] = true);
    setExpanded(exp);
    setItems(initialItems);
    setDirtyItems({});
  }, [initialItems]);

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

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
    
    setLoading(true);
    const res = await batchUpdateItems(projectId, updates);
    if (res?.error) {
      alert(res.error || "Không thể lưu thay đổi. Vui lòng thử lại.");
    } else {
      setDirtyItems({});
    }
    setLoading(false);
  };

  const handleAddGroup = async () => {
    setLoading(true);
    const res = await createItem(templateId, projectId, {
      itemType: "GROUP",
      categoryName: "Hạng mục mới",
      level: 0
    });
    if (res?.error) alert(res.error);
    setLoading(false);
  };

  const handleAddWork = async (parentId: string, parentLevel: number) => {
    setLoading(true);
    const res = await createItem(templateId, projectId, {
      parentId,
      itemType: "WORK",
      workContent: "Công việc mới",
      level: parentLevel + 1,
      unit: "Lần"
    });
    if (res?.error) alert(res.error);
    if (res?.item) {
      setExpanded(prev => ({ ...prev, [parentId]: true }));
    }
    setLoading(false);
  };

  const handleDelete = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    const res = await deleteItem(itemToDelete.id, projectId);
    if (res?.error) {
      setToast({ message: "Không thể xóa. Vui lòng thử lại.", type: 'error' });
    } else {
      setToast({ message: "Đã xóa hạng mục/công việc.", type: 'success' });
    }
    setItemToDelete(null);
    setLoading(false);
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
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
        <div>
          <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ListTree className="h-4 w-4 text-blue-600" />
            </div>
            Thiết lập hạng mục &amp; công việc
          </h2>
          <p className="text-xs text-slate-500 mt-1 ml-10">Thiết lập hạng mục, công việc, mũi thi công và khối lượng thiết kế.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            className="h-9 px-3 text-sm bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors" 
            onClick={handleAddGroup} 
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-1.5 text-blue-600" /> Thêm hạng mục chính
          </Button>
          {hasChanges && (
            <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded-md border border-amber-200">
              {Object.keys(dirtyItems).length} thay đổi chưa lưu
            </span>
          )}
          <Button 
            className={`h-9 px-4 text-sm font-semibold transition-all border flex items-center justify-center ${
              hasChanges 
                ? "!border-blue-600 !bg-blue-600 !text-white hover:!bg-blue-700 hover:!border-blue-700 shadow-sm" 
                : "!border-slate-200 !bg-slate-100 !text-slate-400 shadow-none cursor-not-allowed hover:!bg-slate-100 disabled:opacity-100"
            }`}
            onClick={handleSave} 
            disabled={!hasChanges || loading}
            title={!hasChanges ? "Không có thay đổi để lưu" : "Lưu các thay đổi thiết lập bảng khối lượng gốc"}
          >
            <Save className={`w-4 h-4 mr-1.5 ${!hasChanges ? "text-slate-400" : "text-white"}`} /> {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.stt} sticky left-0 z-20 text-center`}>STT</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.content} sticky left-[56px] z-20 text-left`}>Nội dung công việc / Hạng mục</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.crew} text-center`}>Mũi thi công</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.unit} text-center`}>Đơn vị</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.designQty} text-right`}>Khối lượng TK</th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.cumulative} text-right text-blue-700 bg-blue-50/60`}>
                <div className="flex items-center justify-end gap-1" title="Chỉ tính khối lượng đã được giám sát xác nhận (APPROVED)">
                  Lũy kế duyệt <Info className="w-3.5 h-3.5 text-blue-500 cursor-help" />
                </div>
              </th>
              <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.percent} text-right text-blue-700 bg-blue-50/60`}>% TH duyệt</th>
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
                        <button onClick={() => toggleExpand(item.id)} className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0">
                          {expanded[item.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                      {!isGroup && <div className="w-5 flex-shrink-0" />}
                      <input 
                        value={isGroup ? (item.categoryName || "") : (item.workContent || "")} 
                        onChange={e => handleChange(item.id, isGroup ? 'categoryName' : 'workContent', e.target.value)}
                        placeholder={isGroup ? "Nhập tên hạng mục..." : "Nhập tên công việc..."}
                        className={`w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 transition-all outline-none ${isGroup ? 'font-bold text-slate-900 text-sm' : 'font-semibold text-slate-800 text-sm'}`}
                      />
                    </div>
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.crew} text-center ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    <input 
                      value={item.constructionCrew || ""} 
                      onChange={e => handleChange(item.id, 'constructionCrew', e.target.value)}
                      className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-center text-slate-700 text-sm transition-all outline-none"
                      placeholder="Mũi..."
                    />
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.unit} text-center ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    {isGroup ? <span className="text-slate-400">—</span> : (() => {
                      const currentUnit = item.unit || "";
                      const isCustom = currentUnit !== "" && !UNIT_OPTIONS.includes(currentUnit);
                      const selectValue = isCustom ? "__custom__" : currentUnit;
                      return (
                        <div className="flex flex-col gap-1">
                          <select
                            value={selectValue}
                            onChange={e => {
                              const v = e.target.value;
                              if (v === "__custom__") {
                                handleChange(item.id, 'unit', currentUnit || "");
                                // Force re-render to show custom input
                                setItems(prev => prev.map(it => it.id === item.id ? { ...it, _showCustomUnit: true } : it));
                              } else {
                                handleChange(item.id, 'unit', v);
                                setItems(prev => prev.map(it => it.id === item.id ? { ...it, _showCustomUnit: false } : it));
                              }
                            }}
                            className="w-full bg-white hover:bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-md px-1.5 py-1 text-center text-slate-700 text-sm font-medium transition-all outline-none cursor-pointer appearance-none"
                          >
                            <option value="">— Chọn —</option>
                            {UNIT_OPTIONS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                            <option value="__custom__">✎ Khác...</option>
                          </select>
                          {(isCustom || item._showCustomUnit) && (
                            <input
                              value={currentUnit}
                              onChange={e => handleChange(item.id, 'unit', e.target.value)}
                              className="w-full bg-white border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-md px-1.5 py-1 text-center text-slate-700 text-sm transition-all outline-none"
                              placeholder="Nhập đơn vị..."
                              autoFocus={!!item._showCustomUnit}
                            />
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.designQty} text-right ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    {isGroup ? (
                      <span className="text-slate-700 font-bold text-sm px-2">{item.rollupDesignQuantity ? formatQuantity(item.rollupDesignQuantity) : "-"}</span>
                    ) : (
                      <input 
                        type="number"
                        step="any"
                        value={item.designQuantity || ""} 
                        onChange={e => handleChange(item.id, 'designQuantity', e.target.value)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-right font-semibold text-slate-800 text-sm transition-all outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                        placeholder="0.00"
                      />
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
                        <span className="text-[10px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-semibold border border-red-200">Vượt KL</span>
                      </div>
                    )}
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.notes} ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    <input 
                      value={item.note || ""} 
                      onChange={e => handleChange(item.id, 'note', e.target.value)}
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-slate-600 text-sm transition-all outline-none"
                      placeholder="Ghi chú..."
                    />
                  </td>

                  <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.action} text-center`}>
                    <div className="flex items-center justify-center gap-1">
                      {isGroup && (
                        <button 
                          onClick={() => handleAddWork(item.id, item.displayLevel)} 
                          className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors" 
                          title="Thêm công việc"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
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

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Xóa hạng mục/công việc?</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                Dữ liệu sẽ được xóa mềm và không còn hiển thị trên Bảng khối lượng, Nhập theo ngày và Tổng hợp. Bạn vẫn có thể khôi phục bằng dữ liệu sao lưu nếu cần.
              </p>
              {itemToDelete.itemType === 'GROUP' ? (
                <div className="p-3 bg-red-50 text-red-800 text-sm rounded-lg border border-red-100">
                  <span className="font-semibold block mb-1">Lưu ý:</span>
                  Hạng mục này và các công việc con liên quan sẽ được ẩn khỏi các màn nhập và tổng hợp khối lượng.
                </div>
              ) : (
                <div className="p-3 bg-red-50 text-red-800 text-sm rounded-lg border border-red-100">
                  <span className="font-semibold block mb-1">Lưu ý:</span>
                  Công việc này sẽ được ẩn khỏi các màn nhập và tổng hợp khối lượng.
                </div>
              )}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button 
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={loading}
              >
                Hủy
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 flex items-center gap-1.5 transition-colors shadow-sm"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4" /> Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-sm font-semibold animate-in slide-in-from-bottom-5 fade-in duration-300 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {toast.type === 'success' ? <div className="w-2 h-2 rounded-full bg-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-red-500" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
