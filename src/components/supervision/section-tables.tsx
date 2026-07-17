"use client";
import { useState } from "react";
import { 
  createSupervisionTransitionCheck, updateSupervisionTransitionCheck,
  createSupervisionQuantityVerification, updateSupervisionQuantityVerification,
  createSupervisionProgressAssessment, updateSupervisionProgressAssessment,
  deleteSupervisionItem 
} from "@/app/(dashboard)/supervision/actions";

type Project = { id: string; code: string; name: string };
import { Plus, MoreVertical, Edit2, Trash2, Check, AlertTriangle } from "lucide-react";

export function SectionTransitions({ pkg, projects, isEditable, run, pending }: { pkg: any; projects: Project[]; isEditable: boolean; run: (fn: () => Promise<unknown>) => void; pending: boolean }) {
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fd, setFd] = useState({ projectId: "", workItem: "", currentStep: "", proposedStep: "", reportedQuantity: "", verifiedQuantity: "", unit: "", plannedProgress: "", conclusion: "" });
  const items: any[] = pkg.transitions || [];

  const openCreate = () => { setEditId(null); setFd({ projectId: "", workItem: "", currentStep: "", proposedStep: "", reportedQuantity: "", verifiedQuantity: "", unit: "", plannedProgress: "", conclusion: "" }); setShow(true); };
  const openEdit = (it: any) => { setEditId(it.id); setFd({ projectId: it.projectId || "", workItem: it.workItem || "", currentStep: it.currentStep || "", proposedStep: it.proposedStep || "", reportedQuantity: it.reportedQuantity?.toString() || "", verifiedQuantity: it.verifiedQuantity?.toString() || "", unit: it.unit || "", plannedProgress: it.plannedProgress || "", conclusion: it.conclusion || "" }); setShow(true); };

  const submit = () => {
    if (!fd.projectId || !fd.workItem || !fd.conclusion) { alert("Vui lòng nhập công trình, hạng mục và kết luận."); return; }
    run(async () => {
      const payload = { packageId: pkg.id, projectId: fd.projectId, workItem: fd.workItem, currentStep: fd.currentStep || "N/A", proposedStep: fd.proposedStep || "N/A", reportedQuantity: Number(fd.reportedQuantity) || 0, verifiedQuantity: Number(fd.verifiedQuantity) || 0, unit: fd.unit, plannedProgress: fd.plannedProgress, conclusion: fd.conclusion };
      if (editId) await updateSupervisionTransitionCheck(editId, payload);
      else await createSupervisionTransitionCheck(payload);
      setShow(false);
    });
  };
  const del = (id: string) => { if (confirm("Xóa dòng này?")) run(() => deleteSupervisionItem("transitionCheck", id)); };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">II. Công tác kiểm tra điều kiện chuyển bước thi công</h3>
        {isEditable && (
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-50">
            <Plus className="w-3.5 h-3.5" /> Thêm dòng
          </button>
        )}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl flex flex-col max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editId ? "Sửa điều kiện chuyển bước" : "Thêm điều kiện chuyển bước"}</h3>
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block"><span className="text-sm font-medium text-slate-700">Công trình *</span><select value={fd.projectId} onChange={e => setFd({ ...fd, projectId: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">Chọn</option>{projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Hạng mục *</span><input value={fd.workItem} onChange={e => setFd({ ...fd, workItem: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="VD: Móng" /></label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block"><span className="text-sm font-medium text-slate-700">Bước thi công hiện tại</span><input value={fd.currentStep} onChange={e => setFd({ ...fd, currentStep: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Cốt thép" /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Bước thi công đề nghị</span><input value={fd.proposedStep} onChange={e => setFd({ ...fd, proposedStep: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Đổ bê tông" /></label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <label className="block"><span className="text-sm font-medium text-slate-700">Khối lượng báo cáo</span><input type="number" step="any" value={fd.reportedQuantity} onChange={e => setFd({ ...fd, reportedQuantity: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Khối lượng kiểm tra</span><input type="number" step="any" value={fd.verifiedQuantity} onChange={e => setFd({ ...fd, verifiedQuantity: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Đơn vị</span><input value={fd.unit} onChange={e => setFd({ ...fd, unit: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="m³, tấn..." /></label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block"><span className="text-sm font-medium text-slate-700">Tiến độ đề ra</span><input value={fd.plannedProgress} onChange={e => setFd({ ...fd, plannedProgress: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="VD: 100%" /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Kết luận nội bộ *</span><input value={fd.conclusion} onChange={e => setFd({ ...fd, conclusion: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Cho phép chuyển bước" /></label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setShow(false)} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
              <button onClick={submit} disabled={pending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {editId ? "Lưu thay đổi" : "Lưu dữ liệu"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>
          <th className="px-3 py-2 text-center font-semibold text-slate-700 w-12">STT</th>
          <th className="px-3 py-2 text-left font-semibold text-slate-700">Công trình và hạng mục kiểm tra</th>
          <th className="px-3 py-2 text-center font-semibold text-slate-700">Khối lượng báo cáo</th>
          <th className="px-3 py-2 text-center font-semibold text-slate-700">Khối lượng kiểm tra</th>
          <th className="px-3 py-2 text-center font-semibold text-slate-700">Chênh lệch</th>
          <th className="px-3 py-2 text-center font-semibold text-slate-700">Tiến độ đề ra</th>
          {isEditable && <th className="px-3 py-2 w-16 text-center">Sửa</th>}
        </tr></thead><tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={isEditable ? 7 : 6} className="px-3 py-8 text-center text-slate-500 bg-slate-50/50">
                <p className="mb-2">Chưa có dữ liệu chuyển bước thi công.</p>
                {isEditable && (
                  <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Thêm dòng
                  </button>
                )}
              </td>
            </tr>
          )}
          {items.map((it: any, i: number) => {
            const rq = Number(it.reportedQuantity) || 0; const vq = Number(it.verifiedQuantity) || 0; const diff = vq - rq; const u = it.unit || "";
            return (<tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50 group">
              <td className="px-3 py-2 text-center text-slate-600">{i + 1}</td>
              <td className="px-3 py-2 text-slate-700"><span className="font-medium">{it.project?.code}</span> {it.project?.name}{it.workItem && <div className="text-xs text-slate-500">{it.workItem}</div>}</td>
              <td className="px-3 py-2 text-center text-slate-700">{rq} {u}</td>
              <td className="px-3 py-2 text-center text-slate-700">{vq} {u}</td>
              <td className={`px-3 py-2 text-center font-medium ${diff < 0 ? "text-red-600" : diff > 0 ? "text-emerald-600" : "text-slate-600"}`}>{diff.toFixed(2)} {u}</td>
              <td className="px-3 py-2 text-center text-slate-700">{it.plannedProgress || "—"}</td>
              {isEditable && (
                <td className="px-3 py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(it)} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => del(it.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              )}
            </tr>);
          })}
        </tbody></table>
      </div>
    </div>
  );
}

export function SectionQuantities({ pkg, projects, isEditable, run, pending }: { pkg: any; projects: Project[]; isEditable: boolean; run: (fn: () => Promise<unknown>) => void; pending: boolean }) {
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fd, setFd] = useState({ projectId: "", workItem: "", unit: "", reportedQuantity: "", verifiedQuantity: "", checkedAt: "", conclusion: "" });
  const items: any[] = pkg.quantities || [];

  const openCreate = () => { setEditId(null); setFd({ projectId: "", workItem: "", unit: "", reportedQuantity: "", verifiedQuantity: "", checkedAt: new Date().toISOString().slice(0, 10), conclusion: "Đạt" }); setShow(true); };
  const openEdit = (it: any) => { setEditId(it.id); setFd({ projectId: it.projectId || "", workItem: it.workItem || "", unit: it.unit || "", reportedQuantity: it.reportedQuantity?.toString() || "", verifiedQuantity: it.verifiedQuantity?.toString() || "", checkedAt: it.checkedAt ? new Date(it.checkedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10), conclusion: it.conclusion || "Đạt" }); setShow(true); };

  const submit = () => {
    if (!fd.projectId || !fd.workItem || !fd.unit) { alert("Vui lòng điền công trình, hạng mục và đơn vị."); return; }
    run(async () => {
      const payload = { packageId: pkg.id, projectId: fd.projectId, workItem: fd.workItem, unit: fd.unit, reportedQuantity: Number(fd.reportedQuantity) || 0, verifiedQuantity: Number(fd.verifiedQuantity) || 0, checkedAt: fd.checkedAt, conclusion: fd.conclusion };
      if (editId) await updateSupervisionQuantityVerification(editId, payload);
      else await createSupervisionQuantityVerification(payload);
      setShow(false);
    });
  };
  const del = (id: string) => { if (confirm("Xóa dòng này?")) run(() => deleteSupervisionItem("quantity", id)); };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">III. Công tác đo, kiểm tra khối lượng đã thi công</h3>
        {isEditable && (
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-50">
            <Plus className="w-3.5 h-3.5" /> Thêm dòng
          </button>
        )}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl flex flex-col max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editId ? "Sửa kiểm tra khối lượng" : "Thêm kiểm tra khối lượng"}</h3>
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              <label className="block"><span className="text-sm font-medium text-slate-700">Công trình *</span><select value={fd.projectId} onChange={e => setFd({ ...fd, projectId: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">Chọn</option>{projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block"><span className="text-sm font-medium text-slate-700">Hạng mục *</span><input value={fd.workItem} onChange={e => setFd({ ...fd, workItem: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Đơn vị *</span><input value={fd.unit} onChange={e => setFd({ ...fd, unit: e.target.value })} placeholder="m², kg, tấn..." className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block"><span className="text-sm font-medium text-slate-700">Khối lượng báo cáo</span><input type="number" step="any" value={fd.reportedQuantity} onChange={e => setFd({ ...fd, reportedQuantity: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Khối lượng kiểm tra</span><input type="number" step="any" value={fd.verifiedQuantity} onChange={e => setFd({ ...fd, verifiedQuantity: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setShow(false)} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
              <button onClick={submit} disabled={pending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {editId ? "Lưu thay đổi" : "Lưu dữ liệu"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>
          <th className="px-3 py-2 text-center font-semibold text-slate-700 w-12">STT</th>
          <th className="px-3 py-2 text-left font-semibold text-slate-700">Công trình, hạng mục</th>
          <th className="px-3 py-2 text-center font-semibold text-slate-700">Khối lượng báo cáo</th>
          <th className="px-3 py-2 text-center font-semibold text-slate-700">Khối lượng kiểm tra</th>
          <th className="px-3 py-2 text-center font-semibold text-slate-700">Chênh lệch</th>
          {isEditable && <th className="px-3 py-2 w-16 text-center">Sửa</th>}
        </tr></thead><tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={isEditable ? 6 : 5} className="px-3 py-8 text-center text-slate-500 bg-slate-50/50">
                <p className="mb-2">Chưa có dữ liệu kiểm tra khối lượng.</p>
                {isEditable && (
                  <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Thêm dòng
                  </button>
                )}
              </td>
            </tr>
          )}
          {items.map((it: any, i: number) => {
            const rq = Number(it.reportedQuantity) || 0; const vq = Number(it.verifiedQuantity) || 0; const diff = vq - rq; const u = it.unit || "";
            return (<tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50 group">
              <td className="px-3 py-2 text-center text-slate-600">{i + 1}</td>
              <td className="px-3 py-2 text-slate-700"><span className="font-medium">{it.project?.code}</span> {it.project?.name}{it.workItem && <div className="text-xs text-slate-500">{it.workItem}</div>}</td>
              <td className="px-3 py-2 text-center text-slate-700">{rq} {u}</td>
              <td className="px-3 py-2 text-center text-slate-700">{vq} {u}</td>
              <td className={`px-3 py-2 text-center font-medium ${diff < 0 ? "text-red-600" : diff > 0 ? "text-emerald-600" : "text-slate-600"}`}>{diff.toFixed(2)} {u}</td>
              {isEditable && (
                <td className="px-3 py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(it)} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => del(it.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              )}
            </tr>);
          })}
        </tbody></table>
      </div>
    </div>
  );
}

export function SectionProgress({ pkg, projects, isEditable, run, pending }: { pkg: any; projects: Project[]; isEditable: boolean; run: (fn: () => Promise<unknown>) => void; pending: boolean }) {
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fd, setFd] = useState({ projectId: "", workItem: "", plannedProgress: "", actualProgress: "", delayReason: "" });
  const items: any[] = pkg.progressAssessments || [];

  const openCreate = () => { setEditId(null); setFd({ projectId: "", workItem: "", plannedProgress: "", actualProgress: "", delayReason: "" }); setShow(true); };
  const openEdit = (it: any) => { setEditId(it.id); setFd({ projectId: it.projectId || "", workItem: it.workItem || "", plannedProgress: it.plannedProgress?.toString() || "", actualProgress: it.actualProgress?.toString() || "", delayReason: it.delayReason || "" }); setShow(true); };

  const planned = Number(fd.plannedProgress); const actual = Number(fd.actualProgress); const isDelayed = actual < planned && planned > 0;

  const submit = () => {
    if (!fd.projectId || fd.plannedProgress === "" || fd.actualProgress === "") { alert("Vui lòng điền đủ tiến độ."); return; }
    if (planned < 0 || planned > 100 || actual < 0 || actual > 100) { alert("Tiến độ phải từ 0 - 100%."); return; }
    if (isDelayed && !fd.delayReason.trim()) { alert("Vui lòng nhập lý do chậm tiến độ."); return; }
    
    run(async () => {
      const payload = { packageId: pkg.id, projectId: fd.projectId, workItem: fd.workItem, plannedProgress: planned, actualProgress: actual, delayReason: fd.delayReason };
      if (editId) await updateSupervisionProgressAssessment(editId, payload);
      else await createSupervisionProgressAssessment(payload);
      setShow(false);
    });
  };
  const del = (id: string) => { if (confirm("Xóa dòng này?")) run(() => deleteSupervisionItem("progressAssessment", id)); };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">V. Tiến độ tổng và thực tế</h3>
        {isEditable && (
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-slate-50">
            <Plus className="w-3.5 h-3.5" /> Thêm dòng
          </button>
        )}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl flex flex-col max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editId ? "Sửa đánh giá tiến độ" : "Thêm đánh giá tiến độ"}</h3>
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block"><span className="text-sm font-medium text-slate-700">Công trình *</span><select value={fd.projectId} onChange={e => setFd({ ...fd, projectId: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">Chọn</option>{projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</select></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Hạng mục</span><input value={fd.workItem} onChange={e => setFd({ ...fd, workItem: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block"><span className="text-sm font-medium text-slate-700">Tiến độ kế hoạch (%) *</span><input type="number" min="0" max="100" value={fd.plannedProgress} onChange={e => setFd({ ...fd, plannedProgress: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Tiến độ thực tế (%) *</span><input type="number" min="0" max="100" value={fd.actualProgress} onChange={e => setFd({ ...fd, actualProgress: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
              </div>
              {isDelayed && (
                <label className="block">
                  <span className="text-sm font-medium text-red-600">Lý do chậm tiến độ *</span>
                  <textarea value={fd.delayReason} onChange={e => setFd({ ...fd, delayReason: e.target.value })} rows={2} className="mt-1 w-full rounded-md border border-red-300 px-3 py-2 text-sm" />
                </label>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setShow(false)} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
              <button onClick={submit} disabled={pending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {editId ? "Lưu thay đổi" : "Lưu dữ liệu"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>
          <th className="px-3 py-2 text-center font-semibold text-slate-700 w-12">STT</th>
          <th className="px-3 py-2 text-left font-semibold text-slate-700">Công trình/ hạng mục</th>
          <th className="px-3 py-2 text-center font-semibold text-slate-700">Tiến độ theo kế hoạch</th>
          <th className="px-3 py-2 text-center font-semibold text-slate-700">Chậm tiến độ (Thực tế)</th>
          <th className="px-3 py-2 text-left font-semibold text-slate-700">Lý do chậm tiến độ</th>
          {isEditable && <th className="px-3 py-2 w-16 text-center">Sửa</th>}
        </tr></thead><tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={isEditable ? 6 : 5} className="px-3 py-8 text-center text-slate-500 bg-slate-50/50">
                <p className="mb-2">Chưa có dữ liệu đánh giá tiến độ.</p>
                {isEditable && (
                  <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Thêm dòng
                  </button>
                )}
              </td>
            </tr>
          )}
          {items.map((it: any, i: number) => {
            const pp = Number(it.plannedProgress) || 0; const ap = Number(it.actualProgress) || 0;
            return (<tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50 group">
              <td className="px-3 py-2 text-center text-slate-600">{i + 1}</td>
              <td className="px-3 py-2 text-slate-700"><span className="font-medium">{it.project?.code}</span> {it.project?.name}{it.workItem && <div className="text-xs text-slate-500">{it.workItem}</div>}</td>
              <td className="px-3 py-2 text-center text-slate-700">{pp}%</td>
              <td className={`px-3 py-2 text-center font-medium ${ap < pp ? "text-red-600" : "text-emerald-600"}`}>{ap}%</td>
              <td className="px-3 py-2 text-slate-700 max-w-[200px]">{it.delayReason || "—"}</td>
              {isEditable && (
                <td className="px-3 py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(it)} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => del(it.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              )}
            </tr>);
          })}
        </tbody></table>
      </div>
    </div>
  );
}
