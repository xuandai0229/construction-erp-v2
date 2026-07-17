"use client";

import { useState, useTransition } from "react";
import { Plus, Check, Clock, AlertTriangle, X, Search, Filter } from "lucide-react";
import { createSupervisionFinding } from "@/app/(dashboard)/supervision/actions";

export function FindingsWorkspace({ initialFindings, projects, actorId }: any) {
  const [isPending, startTransition] = useTransition();
  const [showDrawer, setShowDrawer] = useState(false);
  const [fd, setFd] = useState({ projectId: "", category: "Kỹ thuật", description: "", severity: "MEDIUM", detectedAt: new Date().toISOString().slice(0, 10), dueDate: "", workItem: "", responsibleParty: "" });

  const handleSave = () => {
    if (!fd.projectId || !fd.description) return alert("Vui lòng điền công trình và mô tả.");
    startTransition(async () => {
      await createSupervisionFinding(fd as any);
      setShowDrawer(false);
      setFd({ projectId: "", category: "Kỹ thuật", description: "", severity: "MEDIUM", detectedAt: new Date().toISOString().slice(0, 10), dueDate: "", workItem: "", responsibleParty: "" });
    });
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tồn tại và khắc phục</h1>
          <p className="text-sm text-slate-500 mt-1">Theo dõi và quản lý các vấn đề, tồn tại tại công trường.</p>
        </div>
        <button onClick={() => setShowDrawer(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors">
          <Plus className="w-4 h-4" /> Ghi nhận tồn tại
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {initialFindings.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Check className="w-12 h-12 mx-auto text-emerald-300 mb-4" />
            <p className="text-base font-medium text-slate-900 mb-1">Không có tồn tại nào</p>
            <p className="text-sm">Hiện tại không có vấn đề nào cần theo dõi khắc phục.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-3 w-32">Mã / Ngày</th>
                  <th className="px-4 py-3">Công trình & Hạng mục</th>
                  <th className="px-4 py-3">Mô tả tồn tại</th>
                  <th className="px-4 py-3 w-32">Mức độ</th>
                  <th className="px-4 py-3 w-32">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialFindings.map((f: any) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{f.code}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{new Date(f.detectedAt).toLocaleDateString("vi-VN")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{f.project?.code}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{f.workItem || "—"}</div>
                    </td>
                    <td className="px-4 py-3 max-w-sm truncate" title={f.description}>
                      <span className="font-medium text-slate-700">{f.category}</span> - {f.description}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        f.severity === "CRITICAL" ? "bg-red-100 text-red-700" :
                        f.severity === "HIGH" ? "bg-orange-100 text-orange-700" :
                        f.severity === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      }`}>{f.severity}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-600">{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Ghi nhận tồn tại</h3>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Công trình *</span>
                <select value={fd.projectId} onChange={e => setFd({...fd, projectId: e.target.value})} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Chọn công trình</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Hạng mục</span>
                <input value={fd.workItem} onChange={e => setFd({...fd, workItem: e.target.value})} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Phân loại</span>
                <select value={fd.category} onChange={e => setFd({...fd, category: e.target.value})} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="Kỹ thuật">Kỹ thuật</option>
                  <option value="Chất lượng">Chất lượng</option>
                  <option value="An toàn lao động">An toàn lao động</option>
                  <option value="Khác">Khác</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Mô tả chi tiết *</span>
                <textarea rows={3} value={fd.description} onChange={e => setFd({...fd, description: e.target.value})} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Mức độ</span>
                  <select value={fd.severity} onChange={e => setFd({...fd, severity: e.target.value})} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Cao</option>
                    <option value="CRITICAL">Nghiêm trọng</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Hạn khắc phục</span>
                  <input type="date" value={fd.dueDate} onChange={e => setFd({...fd, dueDate: e.target.value})} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setShowDrawer(false)} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
              <button onClick={handleSave} disabled={isPending} className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                Lưu tồn tại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
