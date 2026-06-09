"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Save, Trash2, ChevronRight, ChevronDown, ListTree, Calendar, BarChart2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createItem, updateItem, deleteItem, batchUpdateItems } from "@/app/(dashboard)/projects/[id]/field-progress/actions";
import { formatQuantity, formatPercent } from "@/lib/field-progress";

export function MasterTable({ projectId, templateId, initialItems }: { projectId: string, templateId: string, initialItems: any[] }) {
// ... keep state logic ...
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
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyItems]);

  const hasChanges = Object.keys(dirtyItems).length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <ListTree className="h-5 w-5 text-blue-600" /> Bảng thiết lập mẫu khối lượng (Master Data)
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9 px-3 text-sm bg-white" onClick={handleAddGroup} disabled={loading}>
            <Plus className="w-4 h-4 mr-2 text-blue-600" /> Thêm hạng mục chính
          </Button>
          <Button 
            className={`h-9 px-4 text-sm font-medium ${hasChanges ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm" : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"}`}
            onClick={handleSave} 
            disabled={!hasChanges || loading}
          >
            <Save className="w-4 h-4 mr-2" /> Lưu thay đổi {hasChanges && `(${Object.keys(dirtyItems).length})`}
          </Button>
          
          <div className="h-6 w-px bg-slate-300 mx-1 hidden sm:block"></div>
          
          <Link href={`/projects/${projectId}/field-progress/daily`}>
            <Button variant="outline" className="h-9 px-3 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
              <Calendar className="w-4 h-4 mr-2" /> Nhập hôm nay
            </Button>
          </Link>
          <Link href={`/projects/${projectId}/field-progress/summary`}>
            <Button variant="outline" className="h-9 px-3 text-sm bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
              <BarChart2 className="w-4 h-4 mr-2" /> Xem tổng hợp
            </Button>
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap min-w-max">
          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="px-3 py-3 border-r w-10 text-center">STT</th>
              <th className="px-3 py-3 border-r min-w-[200px]">Nội dung hạng mục</th>
              <th className="px-3 py-3 border-r min-w-[200px]">Nội dung công việc</th>
              <th className="px-3 py-3 border-r min-w-[120px]">Mũi thi công</th>
              <th className="px-3 py-3 border-r w-32 text-center">Tổng KL thiết kế</th>
              <th className="px-3 py-3 border-r w-20 text-center">Đơn vị</th>
              <th className="px-3 py-3 border-r w-32 text-center text-blue-800 bg-blue-50/50">Lũy kế</th>
              <th className="px-3 py-3 border-r w-24 text-center text-blue-800 bg-blue-50/50">% TH</th>
              <th className="px-3 py-3 border-r min-w-[150px]">Ghi chú</th>
              <th className="px-3 py-3 w-16 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item, index) => {
              if (item.parentId && !expanded[item.parentId]) return null;
              
              const isGroup = item.itemType === "GROUP";
              const isDirty = !!dirtyItems[item.id];
              
              let percentVal = item.rollupPercent;
              let isOver = false;
              if (percentVal && Number(percentVal) > 100) isOver = true;

              return (
                <tr key={item.id} className={`${isGroup ? 'bg-slate-50/80 border-b-2 border-slate-200' : 'bg-white'} hover:bg-slate-50 transition-colors`}>
                  <td className="px-3 py-2 border-r text-center text-slate-500 font-medium">{index + 1}</td>
                  
                  {/* Nội dung hạng mục */}
                  <td className={`px-3 py-2 border-r ${isDirty ? 'bg-amber-50/30' : ''}`} style={{ paddingLeft: `${item.displayLevel * 20 + 12}px` }}>
                    <div className="flex items-center gap-2">
                      {isGroup && (
                        <button onClick={() => toggleExpand(item.id)} className="p-0.5 text-slate-400 hover:text-slate-700 bg-white rounded shadow-sm border border-slate-200">
                          {expanded[item.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                      {!isGroup && <div className="w-5" />}
                      <input 
                        value={item.categoryName || ""} 
                        onChange={e => handleChange(item.id, 'categoryName', e.target.value)}
                        placeholder={isGroup ? "Nhập tên hạng mục..." : "-"}
                        className={`w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 transition-colors ${isGroup ? 'font-bold text-slate-800' : 'text-slate-500'}`}
                      />
                    </div>
                  </td>

                  {/* Nội dung công việc */}
                  <td className={`px-3 py-2 border-r ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    <input 
                      value={item.workContent || ""} 
                      onChange={e => handleChange(item.id, 'workContent', e.target.value)}
                      placeholder={!isGroup ? "Nhập tên công việc..." : "-"}
                      className={`w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 transition-colors ${!isGroup ? 'font-semibold text-slate-800' : 'text-slate-400'}`}
                    />
                  </td>

                  {/* Mũi thi công */}
                  <td className={`px-3 py-2 border-r ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    <input 
                      value={item.constructionCrew || ""} 
                      onChange={e => handleChange(item.id, 'constructionCrew', e.target.value)}
                      className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-slate-700 transition-colors"
                    />
                  </td>

                  {/* Tổng KL thiết kế */}
                  <td className={`px-3 py-2 border-r text-right ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    {isGroup ? (
                      <span className="text-slate-700 font-bold px-2">{item.rollupDesignQuantity ? formatQuantity(item.rollupDesignQuantity) : "-"}</span>
                    ) : (
                      <input 
                        type="number"
                        step="any"
                        value={item.designQuantity || ""} 
                        onChange={e => handleChange(item.id, 'designQuantity', e.target.value)}
                        className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-right font-bold text-slate-800 transition-colors"
                        placeholder="0.00"
                      />
                    )}
                  </td>

                  {/* Đơn vị */}
                  <td className={`px-3 py-2 border-r text-center ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    {isGroup ? "-" : (
                      <input 
                        value={item.unit || ""} 
                        onChange={e => handleChange(item.id, 'unit', e.target.value)}
                        className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-center text-slate-700 transition-colors"
                      />
                    )}
                  </td>

                  {/* Lũy kế (Readonly) */}
                  <td className="px-3 py-2 border-r text-right bg-blue-50/30 font-bold text-blue-700">
                    {item.rollupCumulative ? formatQuantity(item.rollupCumulative) : "0"}
                  </td>

                  {/* % TH (Readonly) */}
                  <td className="px-3 py-2 border-r text-right bg-blue-50/30">
                    <span className={`font-bold ${isOver ? 'text-red-600' : 'text-blue-700'}`}>
                      {percentVal ? `${percentVal}%` : "-"}
                    </span>
                  </td>

                  {/* Ghi chú */}
                  <td className={`px-3 py-2 border-r ${isDirty ? 'bg-amber-50/30' : ''}`}>
                    <input 
                      value={item.note || ""} 
                      onChange={e => handleChange(item.id, 'note', e.target.value)}
                      className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-slate-600 transition-colors"
                      placeholder="..."
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 text-center space-x-1">
                    {isGroup && (
                      <button onClick={() => handleAddWork(item.id, item.displayLevel)} className="p-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded bg-white border border-slate-200 shadow-sm transition-colors" title="Thêm công việc con">
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded bg-white border border-slate-200 shadow-sm transition-colors" title="Xóa dòng">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            
            {items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center text-slate-500 bg-white">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Bảng khối lượng đang trống</h3>
                    <p className="text-sm text-slate-500">
                      Bắt đầu bằng cách thêm hạng mục chính, sau đó thêm các công việc con để quản lý chi tiết.
                    </p>
                    <Button onClick={handleAddGroup} className="bg-blue-600 hover:bg-blue-700 text-white mt-2">
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
