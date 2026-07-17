"use client";

import { useState, useTransition } from "react";
import { Plus, Check, Clock, Calendar as CalendarIcon, X, CheckCircle2, ChevronRight, Edit2, Trash2 } from "lucide-react";
import { createSupervisionVisit, updateSupervisionVisit, deleteSupervisionItem } from "@/app/(dashboard)/supervision/actions";

type Project = { id: string; code: string; name: string; location: string | null };
type Visit = { id: string; visitDate: Date; shift: string; projectId: string; workItem: string | null; inspectionContent: string; result: string; note: string | null; collaborators: string | null; project?: any };

const SHIFTS = [
  { id: "MORNING", label: "Sáng" },
  { id: "AFTERNOON", label: "Chiều" },
  { id: "EVENING", label: "Tối" }
];

export function JournalWorkspace({ projects, initialVisits, actorId }: { projects: Project[]; initialVisits: Visit[]; actorId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Default values for continuous addition
  const today = new Date().toISOString().slice(0, 10);
  const [fd, setFd] = useState({ visitDate: today, shift: "MORNING", projectId: "", workItem: "", inspectionContent: "", result: "", note: "", collaborators: "" });

  const resetForm = (keepContext = false) => {
    if (keepContext) {
      setFd({ ...fd, inspectionContent: "", result: "", note: "", collaborators: "" });
    } else {
      setFd({ visitDate: today, shift: "MORNING", projectId: "", workItem: "", inspectionContent: "", result: "", note: "", collaborators: "" });
    }
    setEditId(null);
  };

  const handleEdit = (v: Visit) => {
    setFd({
      visitDate: new Date(v.visitDate).toISOString().slice(0, 10),
      shift: v.shift,
      projectId: v.projectId,
      workItem: v.workItem || "",
      inspectionContent: v.inspectionContent || "",
      result: v.result || "",
      note: v.note || "",
      collaborators: v.collaborators || ""
    });
    setEditId(v.id);
    setShowDrawer(true);
  };

  const handleSave = (continueAdding: boolean) => {
    if (!fd.projectId || !fd.inspectionContent || !fd.result) {
      alert("Vui lòng điền công trình, nội dung kiểm tra và kết quả.");
      return;
    }

    startTransition(async () => {
      const payload = {
        projectId: fd.projectId,
        visitDate: fd.visitDate,
        shift: fd.shift as "MORNING"|"AFTERNOON"|"EVENING",
        inspectionContent: fd.inspectionContent,
        result: fd.result,
        workItem: fd.workItem,
        note: fd.note,
        collaborators: fd.collaborators
      };

      if (editId) {
        await updateSupervisionVisit(editId, payload);
      } else {
        await createSupervisionVisit(payload);
      }

      if (continueAdding) {
        resetForm(true); // Keep date, shift, project, workItem
      } else {
        setShowDrawer(false);
        resetForm();
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) return;
    startTransition(async () => {
      await deleteSupervisionItem("visit", id);
    });
  };

  // Group visits by date then by shift
  const grouped = initialVisits.reduce((acc, v) => {
    const d = new Date(v.visitDate).toISOString().slice(0, 10);
    if (!acc[d]) acc[d] = { MORNING: [], AFTERNOON: [], EVENING: [] };
    acc[d][v.shift].push(v);
    return acc;
  }, {} as Record<string, Record<string, Visit[]>>);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nhật ký giám sát</h1>
          <p className="text-sm text-slate-500 mt-1">Ghi nhận công việc giám sát tại hiện trường hằng ngày.</p>
        </div>
        <button onClick={() => { resetForm(); setShowDrawer(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors">
          <Plus className="w-4 h-4" /> Thêm nhật ký
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {initialVisits.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-base font-medium text-slate-900 mb-1">Chưa có nhật ký nào</p>
            <p className="text-sm mb-4">Bạn chưa ghi nhận hoạt động giám sát nào.</p>
            <button onClick={() => setShowDrawer(true)} className="inline-flex items-center text-sm font-semibold text-blue-600 hover:underline">Bắt đầu ghi nhật ký</button>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-8">
            {Object.keys(grouped).sort((a,b) => b.localeCompare(a)).map(dateStr => {
              const dateObj = new Date(dateStr);
              const dayStr = dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
              return (
                <div key={dateStr} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{dayStr}</h3>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  
                  {SHIFTS.map(shift => {
                    const visits = grouped[dateStr][shift.id];
                    if (!visits || visits.length === 0) return null;
                    return (
                      <div key={shift.id} className="ml-4 sm:ml-8 relative">
                        <div className="absolute -left-6 top-1 text-xs font-semibold text-slate-400 bg-white py-1">{shift.label}</div>
                        <div className="space-y-3 border-l-2 border-slate-100 pl-4 py-1">
                          {visits.map(v => (
                            <div key={v.id} className="group relative bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4 hover:bg-white hover:shadow-sm transition-all hover:border-slate-300">
                              <div className="flex flex-col sm:flex-row justify-between gap-2 mb-2">
                                <div>
                                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                    {v.project?.code} - {v.project?.name}
                                  </div>
                                  {v.workItem && <div className="text-xs text-slate-600 mt-0.5">{v.workItem}</div>}
                                </div>
                                <span className={`self-start inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  v.result.toLowerCase().includes("không") || v.result.toLowerCase().includes("khắc phục") 
                                  ? "bg-red-100 text-red-700" 
                                  : "bg-emerald-100 text-emerald-700"
                                }`}>
                                  {v.result}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700">{v.inspectionContent}</p>
                              
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white p-1 rounded-md shadow-sm border border-slate-200">
                                <button onClick={() => handleEdit(v)} className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100" title="Sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDelete(v.id)} className="p-1.5 text-slate-500 hover:text-red-600 rounded hover:bg-slate-100" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDrawer && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowDrawer(false)}></div>
          <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[500px] bg-white shadow-2xl flex flex-col transition-transform transform">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editId ? "Sửa nhật ký" : "Thêm nhật ký giám sát"}</h2>
              <button onClick={() => setShowDrawer(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1 block">Ngày kiểm tra *</span>
                  <input type="date" value={fd.visitDate} onChange={e => setFd({...fd, visitDate: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-1 block">Buổi *</span>
                  <select value={fd.shift} onChange={e => setFd({...fd, shift: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    {SHIFTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">Công trình *</span>
                <select value={fd.projectId} onChange={e => setFd({...fd, projectId: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">-- Chọn công trình --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">Hạng mục / Công việc</span>
                <input type="text" value={fd.workItem} onChange={e => setFd({...fd, workItem: e.target.value})} placeholder="VD: Móng, Cột tầng 2..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">Nội dung kiểm tra *</span>
                <textarea rows={3} value={fd.inspectionContent} onChange={e => setFd({...fd, inspectionContent: e.target.value})} placeholder="Mô tả công việc đang thực hiện..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">Kết quả *</span>
                <input type="text" value={fd.result} onChange={e => setFd({...fd, result: e.target.value})} placeholder="VD: Đạt yêu cầu, Không đạt..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setFd({...fd, result: "Đạt yêu cầu"})} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-700 border border-slate-200">Đạt yêu cầu</button>
                  <button type="button" onClick={() => setFd({...fd, result: "Không đạt"})} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-700 border border-slate-200">Không đạt</button>
                  <button type="button" onClick={() => setFd({...fd, result: "Chờ kiểm tra lại"})} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-700 border border-slate-200">Chờ kiểm tra lại</button>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">Thành phần tham gia (nếu có)</span>
                <input type="text" value={fd.collaborators} onChange={e => setFd({...fd, collaborators: e.target.value})} placeholder="Đại diện chủ đầu tư, TVGS..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">Ghi chú nội bộ</span>
                <textarea rows={2} value={fd.note} onChange={e => setFd({...fd, note: e.target.value})} placeholder="..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </label>

              {/* Upload Ảnh placeholder (sẽ hoàn thiện upload thực tế trong pha sau) */}
              <div className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">Ảnh / Tài liệu đính kèm</span>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                  <span className="text-sm font-medium">Bấm để tải ảnh lên (Đang phát triển)</span>
                </div>
              </div>

            </div>

            <div className="border-t border-slate-100 p-4 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={() => setShowDrawer(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy bỏ</button>
              {!editId && (
                <button onClick={() => handleSave(true)} disabled={isPending} className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50">
                  Lưu & thêm tiếp
                </button>
              )}
              <button onClick={() => handleSave(false)} disabled={isPending} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isPending && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>}
                {editId ? "Lưu thay đổi" : "Lưu nhật ký"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
