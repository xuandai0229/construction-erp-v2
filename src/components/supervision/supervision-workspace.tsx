"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createSupervisionPackage, createSupervisionVisit, createSupervisionQuantityVerification,
  createSupervisionTransitionCheck, createSupervisionProgressAssessment,
  changeSupervisionPackageStatus, deleteSupervisionItem, updateSupervisionPackage
} from "@/app/(dashboard)/supervision/actions";
import { WeeklyReportTab } from "./weekly-report-tab";
import { Calendar, User, BadgeCent, MapPin, FileText, CheckCircle2, AlertTriangle, Building2, Save, Send, Download } from "lucide-react";

type Project = { id: string; code: string; name: string };
type Props = { actor: { id: string; role: string; name: string }; projects: Project[]; packages: any[]; findings: any[]; isReadOnly?: boolean };

type SyncState = "idle" | "saving" | "saved" | "error";

export function SupervisionWorkspace({ actor, projects, packages, findings, isReadOnly }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState(packages[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<"report" | "plan" | "findings" | "history">("report");
  const [showCreate, setShowCreate] = useState(false);
  const [showEditHdr, setShowEditHdr] = useState(false);
  const [hdrFd, setHdrFd] = useState({ weekStart: "", recipientName: "", recipientTitle: "", place: "", reportNumber: "" });
  const selected = packages.find((p: any) => p.id === selectedId);
  const isEditable = !isReadOnly && actor.role === "SUPERVISION_HEAD" && selected && ["DRAFT", "REVISION_REQUIRED"].includes(selected.status);

  const run = useCallback((work: () => Promise<unknown>) => {
    setSyncState("saving"); setSyncError("");
    startTransition(async () => {
      try {
        await work();
        setSyncState("saved"); setLastSyncAt(new Date());
        router.refresh();
      } catch (e: any) {
        setSyncState("error"); setSyncError(e?.message || "Lỗi không xác định");
      }
    });
  }, [router]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (syncState === "saving") { e.preventDefault(); } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [syncState]);

  const visitCount = selected?.visits?.length || 0;
  const projectsInWeek = new Set(selected?.visits?.map((v: any) => v.projectId) || []).size;
  const findingsCount = selected?.findings?.length || 0;
  const totalSections = 4;
  const filledSections = [visitCount > 0, (selected?.transitions?.length || 0) > 0, (selected?.quantities?.length || 0) > 0, (selected?.progressAssessments?.length || 0) > 0].filter(Boolean).length;
  const completionPct = selected ? Math.round((filledSections / totalSections) * 100) : 0;

  const handleSubmit = () => {
    if (!selected) return;
    const action = selected.status === "DRAFT" ? "submit" : "resubmit";
    run(() => changeSupervisionPackageStatus(selected.id, action as any, undefined, crypto.randomUUID()));
  };
  const handleConfirm = () => { if (selected) run(() => changeSupervisionPackageStatus(selected.id, "confirm", undefined, crypto.randomUUID())); };
  const handleRequestRevision = () => {
    const reason = window.prompt("Lý do yêu cầu chỉnh sửa:");
    if (reason && selected) run(() => changeSupervisionPackageStatus(selected.id, "request_revision", reason, crypto.randomUUID()));
  };

  const submitCreate = () => {
    if (!hdrFd.weekStart) { alert("Vui lòng chọn ngày đầu tuần."); return; }
    run(async () => {
      const res = await createSupervisionPackage(hdrFd);
      setSelectedId(res.id);
      setShowCreate(false);
    });
  };

  const submitEditHdr = () => {
    if (!selected) return;
    run(async () => {
      await updateSupervisionPackage(selected.id, {
        recipientName: hdrFd.recipientName,
        recipientTitle: hdrFd.recipientTitle,
        place: hdrFd.place,
        reportNumber: hdrFd.reportNumber
      });
      setShowEditHdr(false);
    });
  };

  const openCreate = () => {
    setHdrFd({ weekStart: new Date().toISOString().slice(0, 10), recipientName: "Phòng Quản lý dự án", recipientTitle: "Trưởng phòng", place: "Công trường", reportNumber: "" });
    setShowCreate(true);
  };
  
  const openEditHdr = () => {
    if (selected) {
      setHdrFd({
        weekStart: "",
        recipientName: selected.recipientName || "",
        recipientTitle: selected.recipientTitle || "",
        place: selected.place || "",
        reportNumber: selected.reportNumber || ""
      });
      setShowEditHdr(true);
    }
  };

  const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };
  const weekNum = selected ? getWeekNumber(new Date(selected.weekStart)) : 0;
  const year = selected ? new Date(selected.weekStart).getFullYear() : 0;

  const syncLabel = syncState === "saving" ? "Đang lưu..." : syncState === "saved" ? "Đã đồng bộ" : syncState === "error" ? "Lỗi đồng bộ" : "Chưa thay đổi";
  const syncDot = syncState === "saving" ? "bg-amber-400 animate-pulse" : syncState === "saved" ? "bg-emerald-500" : syncState === "error" ? "bg-red-500" : "bg-slate-300";

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-6 lg:pb-12 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-200/60">
        <div>
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl flex items-center gap-2">
            <span className="bg-blue-600 w-2 h-6 rounded-sm inline-block"></span>
            Giám sát tuần
          </h1>
          <p className="mt-1 text-sm text-slate-500 ml-4">Tạo và quản lý báo cáo kết quả giám sát tuần và kế hoạch tuần tiếp theo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
            <span className={`inline-block h-2 w-2 rounded-full ${syncDot}`} />
            {syncLabel}
          </span>
          {!isReadOnly && actor.role === "SUPERVISION_HEAD" && (
            <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
              <FileText className="w-3.5 h-3.5" /> Tạo báo cáo tuần
            </button>
          )}
          {isEditable && (
            <button onClick={handleSubmit} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="w-3.5 h-3.5" /> {selected.status === "DRAFT" ? "Gửi báo cáo" : "Gửi lại"}
            </button>
          )}
          {selected && (
            <a href={`/api/supervision/export?packageId=${selected.id}&type=report`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" /> Xuất báo cáo
            </a>
          )}
        </div>
      </div>

      {syncError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{syncError}</div>}
      
      {/* Modal form */}
      {(showCreate || showEditHdr) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{showCreate ? "Tạo báo cáo tuần mới" : "Sửa thông tin báo cáo"}</h3>
            <div className="space-y-4">
              {showCreate && (
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Ngày trong tuần báo cáo (Hệ thống tự chuẩn hóa về T2-CN) *</span>
                  <input type="date" value={hdrFd.weekStart} onChange={e => setHdrFd({...hdrFd, weekStart: e.target.value})} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Người nhận</span>
                <input value={hdrFd.recipientName} onChange={e => setHdrFd({...hdrFd, recipientName: e.target.value})} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Phòng Quản lý dự án" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Chức vụ người nhận</span>
                <input value={hdrFd.recipientTitle} onChange={e => setHdrFd({...hdrFd, recipientTitle: e.target.value})} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Trưởng phòng" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nơi lập</span>
                <input value={hdrFd.place} onChange={e => setHdrFd({...hdrFd, place: e.target.value})} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Hà Nội" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Số văn bản</span>
                <input value={hdrFd.reportNumber} onChange={e => setHdrFd({...hdrFd, reportNumber: e.target.value})} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="GS-21/2026/CT01" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setShowCreate(false); setShowEditHdr(false); }} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
              <button onClick={showCreate ? submitCreate : submitEditHdr} disabled={pending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {showCreate ? "Tạo báo cáo" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="space-y-4 max-w-6xl mx-auto">
          
          {/* Header Info Block */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-100 border-b border-slate-100">
              {/* Row 1 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-semibold text-slate-900">Tuần báo cáo</span>
                  </div>
                  {isEditable && <button onClick={openEditHdr} className="text-[10px] text-blue-600 hover:underline">Sửa</button>}
                </div>
                {selected ? (
                  <>
                    <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full text-sm font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer">
                      {packages.map((p: any) => <option key={p.id} value={p.id}>{new Date(p.weekStart).toLocaleDateString("vi-VN")} – {new Date(p.weekEnd).toLocaleDateString("vi-VN")}</option>)}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">Tuần {weekNum} / {year}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">Chưa có dữ liệu</p>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-blue-600 mb-2"><User className="w-4 h-4" /><span className="text-xs font-semibold text-slate-900">Người nhận</span></div>
                <p className="text-sm font-semibold text-slate-700">{selected?.recipientName || "—"}</p>
                <p className="text-[11px] text-slate-500 mt-1">Ban Giám đốc</p>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-blue-600 mb-2"><BadgeCent className="w-4 h-4" /><span className="text-xs font-semibold text-slate-900">Chức vụ người nhận</span></div>
                <p className="text-sm font-semibold text-slate-700">{selected?.recipientTitle || "—"}</p>
                <p className="text-[11px] text-slate-500 mt-1">Công ty 2</p>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-blue-600 mb-2"><MapPin className="w-4 h-4" /><span className="text-xs font-semibold text-slate-900">Nơi lập</span></div>
                <p className="text-sm font-semibold text-slate-700">{selected?.place || "Hà Nội"}</p>
                <p className="text-[11px] text-slate-500 mt-1">Công trường</p>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-blue-600 mb-2"><FileText className="w-4 h-4" /><span className="text-xs font-semibold text-slate-900">Số văn bản</span></div>
                <p className="text-sm font-semibold text-slate-700">{selected?.reportNumber || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-100 bg-slate-50/50">
              {/* Row 2 */}
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-indigo-600 mb-2"><User className="w-4 h-4" /><span className="text-xs font-semibold text-slate-900">Người lập</span></div>
                <p className="text-sm font-semibold text-slate-700">{selected?.createdBy?.name || actor.name}</p>
                <p className="text-[11px] text-slate-500 mt-1">Trưởng ban giám sát</p>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36"><path className="text-slate-200" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path className="text-emerald-500" strokeWidth="3" strokeDasharray={`${completionPct}, 100`} stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /></svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">{completionPct}%</div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Tiến độ hồ sơ</p>
                    <p className="text-[11px] text-slate-500">Hoàn thành {filledSections}/{totalSections} mục</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-emerald-600 mb-2"><CheckCircle2 className="w-4 h-4" /><span className="text-xs font-semibold text-slate-900">Đã đồng bộ</span></div>
                <p className="text-sm font-semibold text-slate-700">{lastSyncAt ? lastSyncAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " hôm nay" : "Chưa có dữ liệu"}</p>
                <p className="text-[11px] text-slate-500 mt-1">Tự động</p>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-amber-500 mb-2"><AlertTriangle className="w-4 h-4" /><span className="text-xs font-semibold text-slate-900">Tồn tại cần theo dõi</span></div>
                <p className="text-sm font-bold text-slate-900 text-amber-600">{findingsCount}</p>
                <button onClick={() => setActiveTab("findings")} className="text-[11px] text-blue-600 hover:underline mt-1">Xem chi tiết</button>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-blue-500 mb-2"><Building2 className="w-4 h-4" /><span className="text-xs font-semibold text-slate-900">Công trình trong tuần</span></div>
                <p className="text-sm font-bold text-slate-900 text-blue-600">{projectsInWeek}</p>
                <p className="text-[11px] text-slate-500 mt-1">Đang giám sát</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200">
            <nav className="flex gap-2">
              <button onClick={() => setActiveTab("report")} className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${activeTab === "report" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                Báo cáo kết quả tuần
              </button>
              <button onClick={() => setActiveTab("findings")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "findings" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                Tồn tại theo dõi {findingsCount > 0 && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{findingsCount}</span>}
              </button>
              <button onClick={() => setActiveTab("history")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "history" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                Lịch sử & đồng bộ
              </button>
            </nav>
          </div>

          {/* Tab content */}
          {activeTab === "report" && selected && (
            <WeeklyReportTab
              pkg={selected}
              projects={projects}
              isEditable={!!isEditable}
              run={run}
              pending={pending}
            />
          )}

          {activeTab === "findings" && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h2 className="font-semibold text-slate-900">Tồn tại cần theo dõi</h2>
              {findings.length === 0 && <p className="text-sm text-slate-500 italic">Không có tồn tại nào đang mở.</p>}
              <div className="grid gap-2 md:grid-cols-2">
                {findings.map((f: any) => (
                  <div key={f.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{f.project?.code}: {f.description}</p>
                    <p className="mt-1 text-xs text-slate-500">Hạn: {f.dueDate ? new Date(f.dueDate).toLocaleDateString("vi-VN") : "chưa đặt"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "history" && selected && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h2 className="font-semibold text-slate-900">Lịch sử thao tác</h2>
              {(selected.workflowHistory || []).length === 0 && <p className="text-sm text-slate-500 italic">Chưa có lịch sử.</p>}
              <div className="space-y-2">
                {(selected.workflowHistory || []).map((h: any) => (
                  <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-sm text-slate-700"><span className="font-medium">{h.actor?.name}</span> — {h.action}</p>
                      {h.reason && <p className="text-xs text-slate-500">Lý do: {h.reason}</p>}
                      <p className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString("vi-VN")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selected && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
              <p className="text-sm text-slate-500">Chưa có hồ sơ tuần.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
