"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { saveSupervisionWeeklyDossier, transitionSupervisionWeeklyDossier, getSupervisionWeeklyPrintData } from "@/app/(dashboard)/supervision/weekly/actions";
import { Button } from "@/components/ui/button";
import { ContentCard, SectionHeader } from "@/components/ui/enterprise";
import { AutoTextarea } from "./source-selector";
import { ResultScheduleTable } from "./result-schedule-table";
import { ProgressTable, QuantityTable, TransitionTable } from "./result-data-tables";
import { WeeklyPrintTemplate } from "./weekly-print-template";
import { EditorHeader, type SaveState, type SectionNavItem } from "./editor-header";
import type { WeeklyDocumentType, WeeklyEditorDossier, WeeklyObservation, WeeklyProject } from "@/lib/supervision-weekly/editor-types";
import type { SupervisionWeeklyPrintDto } from "@/lib/supervision-weekly/print-types";
import { NEXT_WEEK_PLAN_GROUP_2_CATEGORIES, NEXT_WEEK_PLAN_GROUP_3_CATEGORIES } from "@/lib/supervision-weekly/document-model";
import { FileText, File, Printer } from "lucide-react";

const editableStates = new Set(["DRAFT", "REVISION_REQUIRED"]);

function dateText(value?: string | null) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function cleanActionError(error: unknown) {
  const message = error instanceof Error ? error.message : "Không thể lưu hồ sơ.";
  return message.replace(/^Error:\s*/i, "").replace(/^CONFLICT:\s*/i, "");
}

export function WeeklyEditor({ initial, projects, canReview }: { initial: WeeklyEditorDossier; projects: WeeklyProject[]; canReview: boolean }) {
  const [dossier, setDossier] = useState(initial);
  const [activeDocument, setActiveDocument] = useState<WeeklyDocumentType>("RESULT");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [workflowPending, startWorkflow] = useTransition();
  const dossierRef = useRef(initial);
  const dirtyRef = useRef(false);
  const failedRef = useRef(false);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const transitionInFlightRef = useRef(false);
  const persistFunctionRef = useRef<() => Promise<boolean>>(async () => true);
  const editable = editableStates.has(dossier.status);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<SupervisionWeeklyPrintDto | null>(null);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const markDirty = (updater: (current: WeeklyEditorDossier) => WeeklyEditorDossier) => {
    if (!editable) return;
    setDossier((current) => {
      const next = updater(current);
      dossierRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    failedRef.current = false;
    setSaveState("dirty");
    setMessage("");
    setRevision((value) => value + 1);
  };

  const persistOnce = async (): Promise<boolean> => {
    if (savePromiseRef.current) return savePromiseRef.current;
    if (!dirtyRef.current) return saveState !== "error" && saveState !== "conflict";
    const snapshot = dossierRef.current;
    dirtyRef.current = false;
    setSaveState("saving");
    setMessage("");
    const promise = (async () => {
      try {
        const result = await saveSupervisionWeeklyDossier(snapshot.id, {
          expectedLockVersion: snapshot.lockVersion,
          reportNumber: snapshot.reportNumber,
          place: snapshot.place,
          recipientName: snapshot.recipientName,
          recipientTitle: snapshot.recipientTitle,
          shiftSelections: snapshot.shiftSelections,
          entries: snapshot.entries,
          observations: snapshot.observations,
          transitions: snapshot.transitions,
          quantities: snapshot.quantities,
          progressRows: snapshot.progressRows,
        });
        setDossier((current) => {
          const updateIds = <T extends { id?: string; clientKey?: string }>(arr: T[]): T[] =>
            arr.map((item) => (item.clientKey && result.rowIdMappings?.[item.clientKey] ? { ...item, id: result.rowIdMappings[item.clientKey] } : item));

          const next: WeeklyEditorDossier = {
            ...current,
            lockVersion: result.lockVersion,
            entries: updateIds(current.entries),
            observations: updateIds(current.observations),
            transitions: updateIds(current.transitions),
            quantities: updateIds(current.quantities),
            progressRows: updateIds(current.progressRows),
          };
          dossierRef.current = next;
          return next;
        });
        failedRef.current = false;
        if (dirtyRef.current) setSaveState("dirty");
        else {
          setSaveState("saved");
          setLastSavedAt(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
          setMessage("Đã lưu");
        }
        return true;
      } catch (error) {
        dirtyRef.current = true;
        failedRef.current = true;
        const conflict = error instanceof Error && error.message.includes("CONFLICT:");
        setSaveState(conflict ? "conflict" : "error");
        setMessage(cleanActionError(error));
        return false;
      } finally {
        savePromiseRef.current = null;
        if (dirtyRef.current && !failedRef.current) window.setTimeout(() => void persistFunctionRef.current(), 0);
      }
    })();
    savePromiseRef.current = promise;
    return promise;
  };
  useEffect(() => {
    persistFunctionRef.current = persistOnce;
  });

  useEffect(() => {
    if (!dirtyRef.current || failedRef.current) return;
    const timer = window.setTimeout(() => void persistFunctionRef.current(), 900);
    return () => window.clearTimeout(timer);
  }, [revision]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current && !savePromiseRef.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const flushSave = async () => {
    while (savePromiseRef.current) {
      await savePromiseRef.current;
    }
    if (failedRef.current) return false;
    let ok = true;
    if (dirtyRef.current) {
      ok = await persistOnce();
      while (savePromiseRef.current) {
        await savePromiseRef.current;
      }
    }
    return !failedRef.current && ok;
  };

  const retrySave = () => {
    failedRef.current = false;
    setSaveState("dirty");
    void persistOnce();
  };

  const focusError = (errorMessage: string) => {
    const section = errorMessage.includes("Mục II") ? "II" : errorMessage.includes("Mục III") ? "III" : errorMessage.includes("Mục IV") ? "IV" : "I";
    document.querySelector(`[data-section="${section}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const transition = (action: "SUBMIT" | "REQUEST_REVISION" | "APPROVE" | "LOCK", reason?: string) => {
    if (transitionInFlightRef.current) return;
    transitionInFlightRef.current = true;
    startWorkflow(async () => {
      const saved = await flushSave();
      if (!saved) {
        transitionInFlightRef.current = false;
        return;
      }
      try {
      const updated = await transitionSupervisionWeeklyDossier(dossier.id, action, reason);
      const status = action === "SUBMIT" ? "SUBMITTED" : action === "REQUEST_REVISION" ? "REVISION_REQUIRED" : action === "APPROVE" ? "APPROVED" : "LOCKED";
      setDossier((current) => {
        const next = { ...current, status: updated.status || status, lockVersion: updated.lockVersion };
        dossierRef.current = next;
        return next;
      });
      setMessage("Đã cập nhật trạng thái hồ sơ.");
    } catch (error) {
      const errorMessage = cleanActionError(error);
      setMessage(errorMessage);
      focusError(errorMessage);
      } finally {
        transitionInFlightRef.current = false;
      }
    });
  };

  useEffect(() => {
    if (initial.lockVersion > dossierRef.current.lockVersion || initial.status !== dossierRef.current.status) {
      setDossier(initial);
      dossierRef.current = initial;
      setSaveState("saved");
      setMessage("");
      dirtyRef.current = false;
    }
  }, [initial]);

  const updateObservation = (category: string, content: string) => markDirty((current) => {
    const index = current.observations.findIndex((item) => item.documentType === "NEXT_WEEK_PLAN" && item.category === category);
    if (index < 0) {
      const next: WeeklyObservation = { documentType: "NEXT_WEEK_PLAN", category, sortOrder: current.observations.length, projectId: null, projectNameSnapshot: null, locationId: null, locationNameSnapshot: null, workItemId: null, workItemNameSnapshot: null, manualText: null, manualLocation: null, manualProjectName: null, manualWorkItemName: null, categoryItemId: null, categoryNameSnapshot: null, manualCategoryName: null, displayText: null as unknown as string, content };
      return { ...current, observations: [...current.observations, next] };
    }
    return { ...current, observations: current.observations.map((item, itemIndex) => itemIndex === index ? { ...item, content } : item) };
  });

  const legacyResultObservations = dossier.observations.filter((item) => item.documentType === "RESULT");

  const weekNum = (() => {
    if (!dossier?.weekStart) return 1;
    const d = new Date(`${dossier.weekStart}T00:00:00`);
    if (Number.isNaN(d.getTime())) return 1;
    const oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
  })();
  const weekLabel = `Tuần ${weekNum}`;
  const dateRange = `${dateText(dossier.weekStart)} – ${dateText(dossier.weekEnd)}`;

  const handlePreview = async () => {
    const success = await flushSave();
    if (!success) return;
    try {
      const freshDossier = await getSupervisionWeeklyPrintData(dossier.id);
      setPreviewData(freshDossier);
      setPreviewOpen(true);
    } catch {
      setMessage("Lỗi tải bản xem trước.");
    }
  };

  const resultSections: SectionNavItem[] = [
    { id: "general", label: "Thông tin chung", shortLabel: "Chung", status: (dossier.reportNumber || dossier.place) ? "complete" : "incomplete" },
    { id: "I", label: "I. Kết quả thực hiện", shortLabel: "Mục I", status: dossier.entries.filter(e => e.documentType === "RESULT").length > 0 ? "complete" : "empty" },
    { id: "II", label: "II. Chuyển bước thi công", shortLabel: "Mục II", status: dossier.transitions.length > 0 ? "complete" : "empty" },
    { id: "III", label: "III. Khối lượng", shortLabel: "Mục III", status: dossier.quantities.length > 0 ? "complete" : "empty" },
    { id: "IV", label: "IV. Tiến độ", shortLabel: "Mục IV", status: dossier.progressRows.length > 0 ? "complete" : "empty" },
  ];
  const planSections: SectionNavItem[] = [
    { id: "general", label: "Thông tin chung", shortLabel: "Chung", status: (dossier.reportNumber || dossier.place) ? "complete" : "incomplete" },
    { id: "I", label: "I. Công việc dự kiến", shortLabel: "Mục I", status: dossier.entries.filter(e => e.documentType === "NEXT_WEEK_PLAN").length > 0 ? "complete" : "empty" },
    { id: "plan-II", label: "II. Đánh giá tồn tại", shortLabel: "Mục II", status: "empty" },
    { id: "plan-III", label: "III. Kiến nghị", shortLabel: "Mục III", status: "empty" },
  ];
  const sections = activeDocument === "RESULT" ? resultSections : planSections;

  const handleSectionClick = (id: string) => {
    setActiveSectionId(id);
    const el = document.querySelector(`[data-section="${id}"]`);
    if (el) {
      const appHeader = typeof document !== "undefined"
        ? (document.querySelector<HTMLElement>("[data-app-header]") || document.querySelector("header"))
        : null;
      const headerH = appHeader?.getBoundingClientRect().height ?? 56;
      const rect = el.getBoundingClientRect();
      const targetTop = window.scrollY + rect.top - headerH - 16;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }
  };

  // Ctrl+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); void persistOnce(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return <div className="space-y-5 pb-24 sm:pb-20">
    <EditorHeader
      title="Báo cáo tuần"
      weekLabel={weekLabel}
      dateRange={dateRange}
      version={dossier.version}
      status={dossier.status}
      saveState={saveState}
      lastSavedAt={lastSavedAt}
      message={message}
      editable={editable}
      canReview={canReview}
      workflowPending={workflowPending}
      latestRevision={dossier.latestRevision}
      onBackToList={() => {}}
      onSaveDraft={() => void persistOnce()}
      onSubmit={() => transition("SUBMIT")}
      onPreview={handlePreview}
      onRetrySave={retrySave}
      onRequestRevision={() => setRevisionDialogOpen(true)}
      onApprove={() => transition("APPROVE")}
      onLock={() => transition("LOCK")}
      sections={sections}
      activeSectionId={activeSectionId}
      onSectionClick={handleSectionClick}
    />

    <ContentCard className="p-4 sm:p-5" data-section="general">
      <SectionHeader title="Thông tin chung" description="Dùng chung cho Báo cáo kết quả tuần và Kế hoạch tuần tiếp theo." />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Số báo cáo" placeholder="……./………" value={dossier.reportNumber || ""} disabled={!editable} onChange={(value) => markDirty((current) => ({ ...current, reportNumber: value || null }))} testId="report-number" />
        <Field label="Địa điểm" value={dossier.place || ""} disabled={!editable} onChange={(value) => markDirty((current) => ({ ...current, place: value || null }))} />
        <Field label="Kính gửi" value={dossier.recipientName || ""} disabled={!editable} onChange={(value) => markDirty((current) => ({ ...current, recipientName: value || null }))} />
        <Field label="Chức vụ người nhận" value={dossier.recipientTitle || ""} disabled={!editable} onChange={(value) => markDirty((current) => ({ ...current, recipientTitle: value || null }))} />
      </div>
      <dl className="mt-4 grid gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm sm:grid-cols-3"><div><dt className="text-xs font-semibold text-slate-500">Từ ngày</dt><dd className="font-bold text-slate-800">{dateText(activeDocument === "RESULT" ? dossier.weekStart : dossier.nextWeekStart)}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Đến ngày</dt><dd className="font-bold text-slate-800">{dateText(activeDocument === "RESULT" ? dossier.weekEnd : dossier.nextWeekEnd)}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Người lập báo cáo</dt><dd className="font-bold text-slate-800">{dossier.authorName}</dd></div></dl>
    </ContentCard>

    <div className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 print:hidden"><Tab active={activeDocument === "RESULT"} onClick={() => setActiveDocument("RESULT")}>Báo cáo kết quả tuần</Tab><Tab active={activeDocument === "NEXT_WEEK_PLAN"} onClick={() => setActiveDocument("NEXT_WEEK_PLAN")}>Kế hoạch tuần tiếp theo</Tab></div>

    {activeDocument === "RESULT" ? <div className="space-y-7">
      <section><h2 className="mb-3 text-base font-bold text-slate-900">I. Kết quả thực hiện trong tuần</h2><ResultScheduleTable documentType="RESULT" startDate={dossier.weekStart} entries={dossier.entries} selections={dossier.shiftSelections} projects={projects} editable={editable} onChange={(entries, shiftSelections) => markDirty((current) => ({ ...current, entries, shiftSelections }))} /></section>
      <TransitionTable rows={dossier.transitions} projects={projects} editable={editable} onChange={(transitions) => markDirty((current) => ({ ...current, transitions }))} />
      <QuantityTable rows={dossier.quantities} projects={projects} editable={editable} onChange={(quantities) => markDirty((current) => ({ ...current, quantities }))} />
      <ProgressTable rows={dossier.progressRows} projects={projects} editable={editable} onChange={(progressRows) => markDirty((current) => ({ ...current, progressRows }))} />
      {legacyResultObservations.length > 0 && <ContentCard className="border-amber-200 bg-amber-50 p-4"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" /><div><h2 className="font-bold text-amber-900">Dữ liệu ghi chú cũ được giữ nguyên</h2><p className="mt-1 text-sm text-amber-800">Các nội dung từng nhập ở khối &quot;II, IV&quot; không thuộc bảng chuẩn mới. Hệ thống không xóa và hiển thị chỉ đọc bên dưới.</p>{legacyResultObservations.map((item) => <div key={item.id || item.category} className="mt-3"><div className="text-xs font-bold text-amber-900">{item.category}</div><p className="whitespace-pre-wrap text-sm text-amber-900">{item.content}</p></div>)}</div></div></ContentCard>}
    </div> : <div className="space-y-6">
      <section><h2 className="mb-3 text-base font-bold text-slate-900">I. Công việc kiểm tra kỹ thuật dự kiến tuần sau</h2><ResultScheduleTable documentType="NEXT_WEEK_PLAN" startDate={dossier.nextWeekStart} entries={dossier.entries} selections={dossier.shiftSelections} projects={projects} editable={editable} onChange={(entries, shiftSelections) => markDirty((current) => ({ ...current, entries, shiftSelections }))} /></section>
      <ContentCard className="p-4 sm:p-6" data-section="plan-II">
        <h2 className="mb-3 text-base font-bold text-slate-900">II. Đánh giá kết quả, xử lý tồn tại của tuần trước</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {NEXT_WEEK_PLAN_GROUP_2_CATEGORIES.map((cat) => (
            <label key={cat.category} className="block text-sm text-slate-700">
              <div className="flex items-start gap-2 font-medium">
                <span className="w-5 shrink-0">{cat.order}.</span>
                <span>{cat.title}</span>
              </div>
              <AutoTextarea disabled={!editable} value={dossier.observations.find((item) => item.documentType === "NEXT_WEEK_PLAN" && item.category === cat.category)?.content || ""} onChange={(value) => updateObservation(cat.category, value)} placeholder="Nhập nội dung…" className="mt-2 min-h-28" />
            </label>
          ))}
        </div>
      </ContentCard>
      <ContentCard className="p-4 sm:p-6" data-section="plan-III">
        <h2 className="mb-3 text-base font-bold text-slate-900">III. Kiến nghị, đề xuất Ban Giám đốc về kết quả tuần</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {NEXT_WEEK_PLAN_GROUP_3_CATEGORIES.map((cat) => (
            <label key={cat.category} className="block text-sm text-slate-700">
              <div className="flex items-start gap-2 font-medium">
                <span className="w-5 shrink-0">{cat.order}.</span>
                <span>{cat.title}</span>
              </div>
              <AutoTextarea disabled={!editable} value={dossier.observations.find((item) => item.documentType === "NEXT_WEEK_PLAN" && item.category === cat.category)?.content || ""} onChange={(value) => updateObservation(cat.category, value)} placeholder="Nhập nội dung…" className="mt-2 min-h-28" />
            </label>
          ))}
        </div>
      </ContentCard>
    </div>}
    <PreviewDialog 
      isOpen={previewOpen} 
      onClose={() => setPreviewOpen(false)} 
      dossier={previewData} 
    />
    {revisionDialogOpen && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="revision-reason-title">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 id="revision-reason-title" className="text-base font-bold text-slate-900">Yêu cầu chỉnh sửa</h2>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Lý do
          <textarea
            aria-label="Lý do yêu cầu chỉnh sửa"
            value={revisionReason}
            onChange={(event) => setRevisionReason(event.target.value)}
            className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 p-3 font-normal"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            setRevisionDialogOpen(false);
            setRevisionReason("");
          }}>Hủy</Button>
          <Button disabled={!revisionReason.trim()} onClick={() => {
            const reason = revisionReason.trim();
            setRevisionDialogOpen(false);
            setRevisionReason("");
            transition("REQUEST_REVISION", reason);
          }}>Xác nhận</Button>
        </div>
      </div>
    </div>}
  </div>;
}

function PreviewDialog({ dossier, isOpen, onClose }: { dossier: SupervisionWeeklyPrintDto | null; isOpen: boolean; onClose: () => void }) {
  const [activeDocument, setActiveDocument] = useState<WeeklyDocumentType>("RESULT");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleExport = (format: "docx" | "pdf") => {
    if (!dossier) return;
    const dateStr = new Date().toISOString().split("T")[0];
    const prefix = activeDocument === "RESULT" ? "Bao-cao-ket-qua-tuan" : "Ke-hoach-tuan-tiep-theo";
    const filename = `${prefix}_${dateStr}.${format}`;
    const url = `/api/supervision/weekly/${dossier.id}/export?document=${activeDocument}&format=${format}&filename=${filename}`;
    window.location.href = url;
  };

  const handlePrint = () => {
    if (!dossier) return;
    const url = `/supervision-export/${dossier.id}?document=${activeDocument}&t=${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 5000);
    };
  };

  if (!isOpen || !dossier) return null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <div className="flex h-14 flex-none items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <h2 className="hidden font-bold text-slate-800 sm:block">Xem trước báo cáo tuần</h2>
          <div className="flex rounded-md bg-slate-100 p-1">
            <button onClick={() => setActiveDocument("RESULT")} className={`rounded px-3 py-1 text-sm font-semibold transition ${activeDocument === "RESULT" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Báo cáo kết quả tuần</button>
            <button onClick={() => setActiveDocument("NEXT_WEEK_PLAN")} className={`rounded px-3 py-1 text-sm font-semibold transition ${activeDocument === "NEXT_WEEK_PLAN" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Kế hoạch tuần sau</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("docx")}><FileText className="mr-2 h-4 w-4" />Tải Word</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}><File className="mr-2 h-4 w-4" />Tải PDF</Button>
          <Button variant="outline" size="sm" onClick={handlePrint} title="Mẹo: Để bỏ URL và ngày giờ, hãy tắt 'Đầu trang và chân trang' trong cài đặt in."><Printer className="mr-2 h-4 w-4" />In</Button>
          <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-0 sm:p-4 bg-slate-200 flex justify-center print:bg-white print:p-0 print:block">
        <div className="bg-white shadow-md sm:rounded-md origin-top-left print:shadow-none print:m-0 print:rounded-none">
          <WeeklyPrintTemplate dossier={dossier} activeDocument={activeDocument} hidePrintButton={true} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, testId, placeholder }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; testId?: string; placeholder?: string }) {
  return <label className="text-xs font-semibold text-slate-600">{label}<input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId} placeholder={placeholder} className="mt-1 font-normal h-10 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-50 placeholder-slate-400" /></label>;
}

function Tab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-bold transition ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>{children}</button>;
}
