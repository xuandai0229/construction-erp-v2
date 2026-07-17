"use client";
import { useState } from "react";
import { createSupervisionVisit, deleteSupervisionItem, updateSupervisionVisit } from "@/app/(dashboard)/supervision/actions";

type Project = { id: string; code: string; name: string };
const SHIFTS = [{ v: "MORNING", l: "Sáng" }, { v: "AFTERNOON", l: "Chiều" }, { v: "EVENING", l: "Tối" }] as const;
const DAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

import { Plus, Search, Copy, Paperclip, MoreVertical, Edit2, Trash2 } from "lucide-react";

export function SectionVisits({ pkg, projects, isEditable, run, pending }: { pkg: any; projects: Project[]; isEditable: boolean; run: (fn: () => Promise<unknown>) => void; pending: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fd, setFd] = useState({ projectId: "", visitDate: "", shift: "MORNING", workItem: "", inspectionContent: "", result: "", note: "" });
  const visits: any[] = pkg.visits || [];

  const openCreate = () => {
    setEditId(null);
    setFd({ projectId: "", visitDate: new Date().toISOString().slice(0, 10), shift: "MORNING", workItem: "", inspectionContent: "", result: "", note: "" });
    setShowForm(true);
  };

  const openEdit = (v: any) => {
    setEditId(v.id);
    setFd({
      projectId: v.projectId || "",
      visitDate: new Date(v.visitDate).toISOString().slice(0, 10),
      shift: v.shift || "MORNING",
      workItem: v.workItem || "",
      inspectionContent: v.inspectionContent || "",
      result: v.result || "",
      note: v.note || ""
    });
    setShowForm(true);
  };

  const submit = () => {
    if (!fd.projectId || !fd.visitDate || !fd.inspectionContent || !fd.result) {
      alert("Vui lòng điền đủ các trường bắt buộc.");
      return;
    }
    run(async () => {
      if (editId) {
        await updateSupervisionVisit(editId, { projectId: fd.projectId, visitDate: fd.visitDate, shift: fd.shift as any, inspectionContent: fd.inspectionContent, result: fd.result, workItem: fd.workItem, note: fd.note });
      } else {
        await createSupervisionVisit({ projectId: fd.projectId, visitDate: fd.visitDate, shift: fd.shift as any, inspectionContent: fd.inspectionContent, result: fd.result, workItem: fd.workItem, note: fd.note });
      }
      setShowForm(false);
    });
  };

  const del = (id: string) => { if (confirm("Xóa dòng này?")) run(() => deleteSupervisionItem("visit", id)); };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">I. Kết quả thực hiện trong tuần</h3>
        {isEditable && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-50">
              <Plus className="w-3.5 h-3.5" /> Thêm dòng
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-50">
              <Search className="w-3.5 h-3.5" /> Chọn công trình
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-50">
              <Copy className="w-3.5 h-3.5" /> Sao chép từ tuần trước
            </button>
            <button className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white w-8 h-8 hover:bg-slate-50">
              <MoreVertical className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl flex flex-col max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editId ? "Sửa kết quả kiểm tra" : "Thêm kết quả kiểm tra"}</h3>
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Ngày kiểm tra *</span>
                  <input type="date" value={fd.visitDate} onChange={e => setFd({ ...fd, visitDate: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Buổi *</span>
                  <select value={fd.shift} onChange={e => setFd({ ...fd, shift: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    {SHIFTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Công trình *</span>
                <select value={fd.projectId} onChange={e => setFd({ ...fd, projectId: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Chọn công trình</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Hạng mục</span>
                <input value={fd.workItem} onChange={e => setFd({ ...fd, workItem: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="VD: Tầng 2 nhà A" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nội dung kiểm tra *</span>
                <textarea value={fd.inspectionContent} onChange={e => setFd({ ...fd, inspectionContent: e.target.value })} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Kiểm tra cốp pha..." />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Kết quả *</span>
                <textarea value={fd.result} onChange={e => setFd({ ...fd, result: e.target.value })} rows={2} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Đạt yêu cầu" />
              </label>
              <div className="pt-2">
                <span className="text-sm font-medium text-slate-700 block mb-2">Ảnh minh chứng</span>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Paperclip className="w-4 h-4 text-slate-400" /> Tải ảnh lên
                  </button>
                  <span className="text-xs text-slate-400 italic">Tính năng đính kèm đang phát triển</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 shrink-0 pt-4 border-t border-slate-100">
              <button onClick={() => setShowForm(false)} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
              <button onClick={submit} disabled={pending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {editId ? "Lưu thay đổi" : "Lưu dữ liệu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700 w-[140px]">Thời gian kiểm tra</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Công trình và hạng mục kiểm tra</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Nội dung kiểm tra</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Kết quả</th>
              {isEditable && <th className="px-3 py-2 w-16 text-center">Sửa</th>}
            </tr>
          </thead>
          <tbody>
            {visits.length === 0 && (
              <tr>
                <td colSpan={isEditable ? 5 : 4} className="px-3 py-8 text-center text-slate-500 bg-slate-50/50">
                  <p className="mb-2">Chưa có lần kiểm tra nào trong tuần.</p>
                  {isEditable && (
                    <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      Thêm lần kiểm tra
                    </button>
                  )}
                </td>
              </tr>
            )}
            {visits.map((v: any) => {
              const d = new Date(v.visitDate);
              const shiftLabel = SHIFTS.find(s => s.v === v.shift)?.l || v.shift;
              return (
                <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                  <td className="px-3 py-2 text-slate-700"><div className="font-medium">{DAYS[d.getDay()]}</div><div className="text-xs text-slate-500">{shiftLabel} · {d.toLocaleDateString("vi-VN")}</div></td>
                  <td className="px-3 py-2 text-slate-700"><span className="font-medium">{v.project?.code}</span> {v.project?.name}{v.workItem && <div className="text-xs text-slate-500">{v.workItem}</div>}</td>
                  <td className="px-3 py-2 text-slate-700 max-w-[250px]">{v.inspectionContent}</td>
                  <td className="px-3 py-2 text-slate-700 max-w-[200px]">{v.result}</td>
                  {isEditable && (
                    <td className="px-3 py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(v)} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => del(v.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {visits.length === 0 && <p className="text-sm text-slate-400 italic text-center py-6">Chưa có dữ liệu.</p>}
        {visits.map((v: any) => {
          const d = new Date(v.visitDate);
          return (
            <div key={v.id} className="rounded-lg border border-slate-200 p-3 space-y-1 relative">
              <div className="flex justify-between"><span className="text-xs font-semibold text-slate-700">{DAYS[d.getDay()]} · {SHIFTS.find(s => s.v === v.shift)?.l}</span></div>
              <p className="text-xs text-slate-600"><span className="font-medium">{v.project?.code}</span> {v.workItem}</p>
              <p className="text-xs text-slate-700">{v.inspectionContent}</p>
              <p className="text-xs text-slate-500">KQ: {v.result}</p>
              {isEditable && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button onClick={() => openEdit(v)} className="text-blue-600"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => del(v.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
