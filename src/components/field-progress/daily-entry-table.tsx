"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, Send, Package, Edit, Calendar, AlertCircle, FileText, ChevronRight, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { batchSaveDailyEntries } from "@/app/(dashboard)/projects/[id]/field-progress/daily/actions";
import { formatQuantity, formatPercent } from "@/lib/field-progress";

export function DailyEntryTable({ 
  projectId, 
  templateId, 
  dateStr, 
  initialItems 
}: { 
  projectId: string, 
  templateId: string, 
  dateStr: string, 
  initialItems: any[] 
}) {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [dirtyEntries, setDirtyEntries] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [activeDrawerItem, setActiveDrawerItem] = useState<any | null>(null);

  // Focus ref array for Enter navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const mapped = initialItems.map(item => {
      const e = item.todayEntry || {};
      return {
        ...item,
        quantity: e.quantity ? Number(e.quantity) : "",
        issueNote: e.issueNote || "",
        proposalNote: e.proposalNote || "",
        note: e.note || "",
        status: e.status || "DRAFT"
      };
    });
    setItems(mapped);
    setDirtyEntries({});
    inputRefs.current = inputRefs.current.slice(0, mapped.length);
  }, [initialItems]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (Object.keys(dirtyEntries).length > 0) {
      if (!confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn chuyển ngày?")) {
        return;
      }
    }
    router.push(`/projects/${projectId}/field-progress/daily?date=${e.target.value}`);
  };

  const handleChange = (itemId: string, field: string, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) return { ...item, [field]: value };
      return item;
    }));
    
    setDirtyEntries(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || items.find(i => i.id === itemId)),
        [field]: value,
        itemId
      }
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Move to next input
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  const handleSave = async (submit: boolean) => {
    const updates = Object.values(dirtyEntries).filter(e => Number(e.quantity) >= 0 || e.quantity === "");
    
    let entriesToSave = updates;
    if (submit) {
      entriesToSave = items.filter(i => (i.quantity !== "" && Number(i.quantity) > 0) || dirtyEntries[i.id]).map(i => ({
        itemId: i.id,
        quantity: i.quantity,
        issueNote: i.issueNote,
        proposalNote: i.proposalNote,
        note: i.note
      }));
    }

    if (entriesToSave.length === 0) {
      alert("Không có khối lượng nào được nhập để lưu!");
      return;
    }
    
    setLoading(true);
    const res = await batchSaveDailyEntries(projectId, templateId, dateStr, entriesToSave, submit);
    if (res?.error) alert(res.error);
    else {
      setDirtyEntries({});
      alert(submit ? "Đã gửi báo cáo ngày thành công!" : "Đã lưu nháp thành công!");
    }
    setLoading(false);
  };

  const hasChanges = Object.keys(dirtyEntries).length > 0;

  // Render Mobile Card
  const renderMobileCard = (item: any, index: number) => {
    const isDirty = !!dirtyEntries[item.id];
    const isLocked = item.status === "SUBMITTED" || item.status === "APPROVED";
    const qToday = Number(item.quantity) || 0;
    const cumAfter = item.cumulativeBefore + qToday;
    let isOver = false;
    let percentStr = "-";

    if (item.designQuantity && item.designQuantity > 0) {
      const percent = (cumAfter / item.designQuantity) * 100;
      percentStr = percent.toFixed(2) + "%";
      if (percent > 100) isOver = true;
    }

    return (
      <div key={item.id} className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col gap-3 ${isDirty ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'} ${isLocked ? 'opacity-80' : ''}`}>
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{item.parentName || "-"}</div>
            <h3 className="font-bold text-slate-800 leading-tight mt-0.5">{item.name}</h3>
            {item.constructionCrew && <div className="text-xs text-blue-600 mt-1">Mũi: {item.constructionCrew}</div>}
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Tổng TK</div>
            <div className="font-semibold text-slate-700">{item.designQuantity ? formatQuantity(item.designQuantity) : "-"} {item.unit}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
          <div className="text-center border-r border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase">Lũy kế trước</div>
            <div className="font-medium text-slate-700">{formatQuantity(item.cumulativeBefore)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 uppercase">% T.Hiện</div>
            <div className={`font-bold ${isOver ? 'text-red-600' : 'text-slate-800'}`}>{percentStr}</div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-blue-800 mb-1">KHỐI LƯỢNG HÔM NAY ({item.unit})</label>
          <input 
            ref={el => { inputRefs.current[index] = el; }}
            type="number"
            step="any"
            disabled={isLocked}
            value={item.quantity} 
            onChange={e => handleChange(item.id, 'quantity', e.target.value)}
            onFocus={e => e.target.select()}
            onKeyDown={e => handleKeyDown(e, index)}
            className={`w-full text-lg h-12 bg-white border-2 focus:ring-4 rounded-lg px-3 py-2 text-right font-bold transition-all disabled:bg-slate-100 disabled:text-slate-500 ${isOver ? 'border-red-500 text-red-600 focus:ring-red-200' : 'border-blue-200 text-blue-700 focus:border-blue-500 focus:ring-blue-100'} ${isDirty ? 'bg-amber-50' : ''}`}
            placeholder="0"
          />
          {isOver && <div className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Vượt khối lượng TK!</div>}
        </div>

        <div className="flex justify-between items-center mt-1 pt-3 border-t border-slate-100">
          <Button variant="ghost" className="h-8 px-2 text-xs text-slate-600" onClick={() => setActiveDrawerItem(item)}>
            <Edit className="w-3 h-3 mr-1.5" /> Chi tiết / Ghi chú
          </Button>
          {item.materials?.length > 0 && (
            <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold text-orange-600 border-orange-200 bg-orange-50">
              <Package className="w-3 h-3 mr-1" /> {item.materials.length} VT
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Date selector & Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" /> Ngày báo cáo:
          </label>
          <input 
            type="date" 
            value={dateStr}
            onChange={handleDateChange}
            className="px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-bold text-blue-800 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
          />
        </div>
        
        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => handleSave(false)} 
            disabled={!hasChanges || loading}
            className={hasChanges ? "border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100 font-medium" : "text-slate-600"}
          >
            <Save className="w-4 h-4 mr-2" /> Lưu nháp {hasChanges && `(${Object.keys(dirtyEntries).length})`}
          </Button>
          <Button 
            onClick={() => {
              if (confirm("Xác nhận Gửi báo cáo? Dữ liệu sẽ được chốt và chuyển cho Cán bộ duyệt.")) handleSave(true);
            }} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            <Send className="w-4 h-4 mr-2" /> Gửi báo cáo ngày
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap min-w-max table-fixed">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-3 border-r w-12 text-center">STT</th>
                <th className="px-3 py-3 border-r w-[250px] truncate">Hạng mục / Công việc</th>
                <th className="px-2 py-3 border-r w-24">Mũi thi công</th>
                <th className="px-2 py-3 border-r w-16 text-center">ĐVT</th>
                <th className="px-2 py-3 border-r w-24 text-center">Tổng TK</th>
                <th className="px-2 py-3 border-r w-24 text-center bg-slate-50 text-slate-500">Lũy kế trước</th>
                <th className="px-3 py-3 border-r w-32 text-center bg-blue-100 text-blue-900 border-b-2 border-b-blue-300">KL HÔM NAY</th>
                <th className="px-2 py-3 border-r w-24 text-center bg-slate-50 text-slate-500">Lũy kế sau</th>
                <th className="px-2 py-3 border-r w-20 text-center bg-slate-50 text-slate-500">% TH</th>
                <th className="px-3 py-3 border-r w-[180px]">Ghi chú (Tùy chọn)</th>
                <th className="px-2 py-3 w-20 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, index) => {
                const isDirty = !!dirtyEntries[item.id];
                const isLocked = item.status === "SUBMITTED" || item.status === "APPROVED";
                
                const qToday = Number(item.quantity) || 0;
                const cumAfter = item.cumulativeBefore + qToday;
                let percent = null;
                let isOver = false;

                if (item.designQuantity && item.designQuantity > 0) {
                  percent = ((cumAfter / item.designQuantity) * 100).toFixed(2);
                  if (Number(percent) > 100) isOver = true;
                }

                return (
                  <tr key={item.id} className={`${isDirty ? 'bg-amber-50/40' : 'bg-white'} hover:bg-slate-50 transition-colors`}>
                    <td className="px-2 py-2 border-r text-center text-slate-400">{index + 1}</td>
                    
                    <td className="px-3 py-2 border-r max-w-[250px]">
                      <div className="text-[10px] text-slate-400 mb-0.5 truncate uppercase tracking-wider">{item.parentName || "-"}</div>
                      <div className="font-semibold text-slate-800 truncate" title={item.name}>{item.name}</div>
                    </td>
                    
                    <td className="px-2 py-2 border-r text-slate-600 truncate">{item.constructionCrew || "-"}</td>
                    <td className="px-2 py-2 border-r text-center text-slate-500 font-medium">{item.unit || "-"}</td>
                    
                    <td className="px-2 py-2 border-r text-right font-medium text-slate-700">
                      {item.designQuantity ? formatQuantity(item.designQuantity) : "-"}
                    </td>
                    
                    <td className="px-2 py-2 border-r text-right bg-slate-50/50 text-slate-500 font-medium">
                      {formatQuantity(item.cumulativeBefore)}
                    </td>

                    <td className="px-2 py-1 border-r bg-blue-50/40 relative">
                      <input 
                        ref={el => { inputRefs.current[index] = el; }}
                        type="number"
                        step="any"
                        disabled={isLocked}
                        value={item.quantity} 
                        onChange={e => handleChange(item.id, 'quantity', e.target.value)}
                        onFocus={e => e.target.select()}
                        onKeyDown={e => handleKeyDown(e, index)}
                        className={`w-full h-9 bg-white border focus:ring-2 focus:ring-blue-500 rounded px-2 text-right font-bold text-lg text-blue-700 disabled:bg-slate-100 disabled:text-slate-400 transition-colors ${isOver ? 'border-red-500 text-red-600 focus:ring-red-500' : 'border-slate-300'} ${isDirty ? 'border-amber-400 bg-amber-50' : ''}`}
                        placeholder="0"
                      />
                      {isOver && <div className="absolute right-3 top-[-8px] bg-red-100 text-red-700 text-[9px] font-bold px-1 rounded border border-red-200">VƯỢT</div>}
                    </td>

                    <td className="px-2 py-2 border-r text-right bg-slate-50/50 font-bold text-slate-700">
                      {formatQuantity(cumAfter)}
                    </td>

                    <td className="px-2 py-2 border-r text-right bg-slate-50/50">
                      {!item.designQuantity ? (
                        <span className="text-[10px] text-amber-600 font-medium">-</span>
                      ) : (
                        <span className={`font-bold ${isOver ? 'text-red-600' : 'text-slate-700'}`}>
                          {percent}%
                        </span>
                      )}
                    </td>

                    <td className="px-2 py-1 border-r">
                      <input 
                        disabled={isLocked}
                        value={item.note} 
                        onChange={e => handleChange(item.id, 'note', e.target.value)}
                        className="w-full h-8 bg-transparent border-0 focus:ring-1 focus:ring-slate-300 focus:bg-white rounded px-2 text-sm text-slate-600 placeholder:text-slate-300 disabled:opacity-50"
                        placeholder="Ghi chú nhanh..."
                      />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full" onClick={() => setActiveDrawerItem(item)}>
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              
              {items.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500 bg-slate-50">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    Chưa có hạng mục công việc nào để báo cáo.<br/>Vui lòng tạo Bảng khối lượng trước.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Tablet List View */}
      <div className="lg:hidden flex flex-col gap-3 pb-24">
        {items.map((item, index) => renderMobileCard(item, index))}
        {items.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500">
            Chưa có công việc nào.
          </div>
        )}
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-2 z-30">
        <Button 
          variant="outline"
          onClick={() => handleSave(false)} 
          disabled={!hasChanges || loading}
          className={`flex-1 h-12 font-medium ${hasChanges ? 'border-amber-500 text-amber-700 bg-amber-50' : ''}`}
        >
          <Save className="w-4 h-4 mr-2" /> Nháp {hasChanges && `(${Object.keys(dirtyEntries).length})`}
        </Button>
        <Button 
          onClick={() => {
            if (confirm("Xác nhận Gửi báo cáo?")) handleSave(true);
          }} 
          disabled={loading}
          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-md"
        >
          <Send className="w-4 h-4 mr-2" /> Gửi báo cáo
        </Button>
      </div>

      {/* Detail Drawer (Modal implementation for simplicity) */}
      {activeDrawerItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/80">
              <h3 className="font-bold text-slate-800 text-lg">Chi tiết Báo cáo</h3>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-slate-200" onClick={() => setActiveDrawerItem(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              <div>
                <div className="text-xs text-slate-500 font-medium uppercase mb-1">{activeDrawerItem.parentName}</div>
                <div className="font-bold text-slate-900 leading-tight">{activeDrawerItem.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div>
                  <div className="text-xs text-slate-500 mb-1">KL Hôm nay ({activeDrawerItem.unit})</div>
                  <input 
                    type="number"
                    step="any"
                    value={activeDrawerItem.quantity} 
                    onChange={e => {
                      handleChange(activeDrawerItem.id, 'quantity', e.target.value);
                      setActiveDrawerItem({...activeDrawerItem, quantity: e.target.value});
                    }}
                    disabled={activeDrawerItem.status === "SUBMITTED" || activeDrawerItem.status === "APPROVED"}
                    className="w-full h-10 bg-white border border-blue-300 focus:ring-2 focus:ring-blue-500 rounded-lg px-3 text-lg font-bold text-blue-700"
                    placeholder="0"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Ghi chú nhanh</div>
                  <input 
                    type="text"
                    value={activeDrawerItem.note} 
                    onChange={e => {
                      handleChange(activeDrawerItem.id, 'note', e.target.value);
                      setActiveDrawerItem({...activeDrawerItem, note: e.target.value});
                    }}
                    disabled={activeDrawerItem.status === "SUBMITTED" || activeDrawerItem.status === "APPROVED"}
                    className="w-full h-10 bg-white border border-slate-300 focus:ring-2 focus:ring-blue-500 rounded-lg px-3 text-sm text-slate-700"
                    placeholder="..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Khó khăn / Vướng mắc
                </label>
                <textarea 
                  value={activeDrawerItem.issueNote} 
                  onChange={e => {
                    handleChange(activeDrawerItem.id, 'issueNote', e.target.value);
                    setActiveDrawerItem({...activeDrawerItem, issueNote: e.target.value});
                  }}
                  disabled={activeDrawerItem.status === "SUBMITTED" || activeDrawerItem.status === "APPROVED"}
                  className="w-full h-20 bg-white border border-slate-300 focus:ring-2 focus:ring-amber-500 rounded-lg p-3 text-sm text-slate-700"
                  placeholder="Nhập khó khăn vướng mắc nếu có..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <Package className="w-4 h-4 text-green-600" /> Đề xuất vật tư / Biện pháp
                </label>
                <textarea 
                  value={activeDrawerItem.proposalNote} 
                  onChange={e => {
                    handleChange(activeDrawerItem.id, 'proposalNote', e.target.value);
                    setActiveDrawerItem({...activeDrawerItem, proposalNote: e.target.value});
                  }}
                  disabled={activeDrawerItem.status === "SUBMITTED" || activeDrawerItem.status === "APPROVED"}
                  className="w-full h-20 bg-white border border-slate-300 focus:ring-2 focus:ring-green-500 rounded-lg p-3 text-sm text-slate-700"
                  placeholder="Đề xuất kiến nghị..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setActiveDrawerItem(null)}>Đóng</Button>
              <Button className="flex-1 bg-blue-600" onClick={() => setActiveDrawerItem(null)}>Xong</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
