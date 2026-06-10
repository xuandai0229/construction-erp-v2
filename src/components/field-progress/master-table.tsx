"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Trash2, ChevronRight, ChevronDown, ListTree, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createItem, updateItem, deleteItem, batchUpdateItems } from "@/app/(dashboard)/projects/[id]/field-progress/actions";
import { formatQuantity } from "@/lib/field-progress";

export function MasterTable({ projectId, templateId, initialItems }: { projectId: string, templateId: string, initialItems: any[] }) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dirtyItems, setDirtyItems] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

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
    if (res?.error) alert(res.error);
    else {
      setDirtyItems({});
      alert("Đã lưu thay đổi thành công!");
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

  const handleDelete = async (id: string) => {
    if (!confirm("Xác nhận xóa dòng này? Lưu ý: Nếu công việc đã có báo cáo ngày, việc xóa sẽ bị lỗi hoặc làm mất dữ liệu!")) return;
    setLoading(true);
    const res = await deleteItem(id, projectId);
    if (res?.error) alert(res.error);
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
            className={`h-9 px-4 border text-sm font-semibold transition-all ${hasChanges ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"}`}
            onClick={handleSave} 
            disabled={!hasChanges || loading}
            title={!hasChanges ? "Không có thay đổi để lưu" : "Lưu các thay đổi thiết lập bảng khối lượng gốc"}
          >
            <Save className="w-4 h-4 mr-1.5" /> Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-12 border-r border-slate-200 sticky left-0 z-20 bg-slate-50">STT</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[180px] border-r border-slate-200 sticky left-[48px] z-20 bg-slate-50">Nội dung hạng mục</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[260px] border-r border-slate-200 sticky left-[228px] z-20 bg-slate-50">Nội dung công việc</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[120px] border-r border-slate-200">Mũi thi công</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[120px] border-r border-slate-200">Tổng KL TK</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-[80px] border-r border-slate-200">Đơn vị</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-blue-600 uppercase tracking-wider w-[110px] border-r border-slate-200 bg-blue-50/60">Lũy kế</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-blue-600 uppercase tracking-wider w-[80px] border-r border-slate-200 bg-blue-50/60">% TH</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[140px] border-r border-slate-200">Ghi chú</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-[80px]">Thao tác</th>
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
                  className={`border-b transition-colors ${
                    isGroup 
                      ? 'bg-slate-50 border-slate-200' 
                      : isDirty 
                        ? 'bg-amber-50/30 border-slate-100' 
                        : 'bg-white border-slate-100 hover:bg-slate-50/50'
                  }`}
                >
                  {/* STT */}
                  <td className={`h-14 px-4 py-3 text-center text-slate-400 font-medium text-xs border-r border-slate-100 sticky left-0 z-10 ${isGroup ? 'bg-slate-50' : isDirty ? 'bg-amber-50/30' : 'bg-white'}`}>
                    {index + 1}
                  </td>
                  
                  {/* Nội dung hạng mục */}
                  <td className={`h-14 px-4 py-3 border-r border-slate-100 sticky left-[48px] z-10 ${isGroup ? 'bg-slate-50' : isDirty ? 'bg-amber-50/30' : 'bg-white'}`} style={{ paddingLeft: `${item.displayLevel * 24 + 12}px` }}>
                    <div className="flex items-center gap-1.5">
                      {isGroup && (
                        <button onClick={() => toggleExpand(item.id)} className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0">
                          {expanded[item.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                      {!isGroup && <div className="w-5 flex-shrink-0" />}
                      <input 
                        value={item.categoryName || ""} 
                        onChange={e => handleChange(item.id, 'categoryName', e.target.value)}
                        placeholder={isGroup ? "Nhập tên hạng mục..." : "-"}
                        title={item.categoryName || ""}
                        className={`w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 transition-all outline-none ${isGroup ? 'font-bold text-slate-900 text-sm' : 'text-slate-400 text-xs'}`}
                      />
                    </div>
                  </td>

                  {/* Nội dung công việc */}
                  <td className={`h-14 px-4 py-3 border-r border-slate-100 sticky left-[228px] z-10 ${isGroup ? 'bg-slate-50' : isDirty ? 'bg-amber-50/30' : 'bg-white'}`}>
                    <input 
                      value={item.workContent || ""} 
                      onChange={e => handleChange(item.id, 'workContent', e.target.value)}
                      placeholder={!isGroup ? "Nhập tên công việc..." : "-"}
                      title={item.workContent || ""}
                      className={`w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 transition-all outline-none ${!isGroup ? 'font-semibold text-slate-800 text-sm' : 'text-slate-400 text-xs'}`}
                    />
                  </td>

                  {/* Mũi thi công */}
                  <td className={`h-14 px-4 py-3 border-r border-slate-100 text-center ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    <input 
                      value={item.constructionCrew || ""} 
                      onChange={e => handleChange(item.id, 'constructionCrew', e.target.value)}
                      className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-slate-700 text-sm transition-all outline-none"
                      placeholder="Mũi..."
                    />
                  </td>

                  {/* Tổng KL thiết kế */}
                  <td className={`h-14 px-4 py-3 border-r border-slate-100 text-right ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    {isGroup ? (
                      <span className="text-slate-700 font-bold text-sm px-2">{item.rollupDesignQuantity ? formatQuantity(item.rollupDesignQuantity) : "-"}</span>
                    ) : (
                      <input 
                        type="number"
                        step="any"
                        value={item.designQuantity || ""} 
                        onChange={e => handleChange(item.id, 'designQuantity', e.target.value)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-right font-semibold text-slate-800 text-sm transition-all outline-none"
                        placeholder="0.00"
                      />
                    )}
                  </td>

                  {/* Đơn vị */}
                  <td className={`h-14 px-4 py-3 border-r border-slate-100 text-center ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    {isGroup ? <span className="text-slate-400">-</span> : (
                      <input 
                        value={item.unit || ""} 
                        onChange={e => handleChange(item.id, 'unit', e.target.value)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-center text-slate-700 text-sm transition-all outline-none"
                        placeholder="m"
                      />
                    )}
                  </td>

                  {/* Lũy kế (Readonly) */}
                  <td className="h-14 px-4 py-3 border-r border-slate-100 text-right bg-blue-50/40 font-bold text-blue-700 text-sm">
                    {item.rollupCumulative ? formatQuantity(item.rollupCumulative) : "0"}
                  </td>

                  {/* % TH (Readonly) */}
                  <td className="h-14 px-4 py-3 border-r border-slate-100 text-right bg-blue-50/40">
                    <span className={`font-bold text-sm ${isOver ? 'text-red-600' : 'text-blue-700'}`}>
                      {percentVal ? `${percentVal}%` : "-"}
                    </span>
                    {isOver && (
                      <div className="flex items-center justify-end gap-0.5 mt-0.5">
                        <span className="text-[10px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-semibold border border-red-200">Vượt KL</span>
                      </div>
                    )}
                  </td>

                  {/* Ghi chú */}
                  <td className={`h-14 px-4 py-3 border-r border-slate-100 ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    <input 
                      value={item.note || ""} 
                      onChange={e => handleChange(item.id, 'note', e.target.value)}
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-slate-600 text-sm transition-all outline-none"
                      placeholder="Ghi chú..."
                    />
                  </td>

                  {/* Actions */}
                  <td className="h-14 px-4 py-3 text-center">
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
                <td colSpan={10} className="px-4 py-16 text-center bg-white">
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
    </div>
  );
}
