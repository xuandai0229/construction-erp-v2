"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, FileOutput, RefreshCw, Save, Send } from "lucide-react";
import { saveSupervisionWeeklyDossier, transitionSupervisionWeeklyDossier } from "@/app/(dashboard)/supervision/weekly/actions";
import { Button } from "@/components/ui/button";
import { ContentCard, PageHeader, PageHeading, SectionHeader } from "@/components/ui/enterprise";
import { AutoTextarea } from "./source-selector";
import { ResultScheduleTable } from "./result-schedule-table";
import { ProgressTable, QuantityTable, TransitionTable } from "./result-data-tables";
import type { WeeklyDocumentType, WeeklyEditorDossier, WeeklyObservation, WeeklyProject } from "@/lib/supervision-weekly/editor-types";

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";
const editableStates = new Set(["DRAFT", "REVISION_REQUIRED"]);
const documentLabels: Record<WeeklyDocumentType, string> = { RESULT: "Báo cáo kết quả tuần", NEXT_WEEK_PLAN: "Kế hoạch tuần tiếp theo" };

function dateText(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T00:00:00`));
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
  const persistFunctionRef = useRef<() => Promise<boolean>>(async () => true);
  const editable = editableStates.has(dossier.status);

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
    if (failedRef.current) return false;
    let ok = await persistOnce();
    while (ok && (dirtyRef.current || savePromiseRef.current)) ok = await persistOnce();
    return ok;
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

  const transition = (action: "SUBMIT" | "REQUEST_REVISION" | "APPROVE" | "LOCK") => startWorkflow(async () => {
    const saved = await flushSave();
    if (!saved) return;
    try {
      await transitionSupervisionWeeklyDossier(dossier.id, action);
      const status = action === "SUBMIT" ? "SUBMITTED" : action === "REQUEST_REVISION" ? "REVISION_REQUIRED" : action === "APPROVE" ? "APPROVED" : "LOCKED";
      setDossier((current) => {
        const next = { ...current, status };
        dossierRef.current = next;
        return next;
      });
      setMessage("Đã cập nhật trạng thái hồ sơ.");
    } catch (error) {
      const errorMessage = cleanActionError(error);
      setMessage(errorMessage);
      focusError(errorMessage);
    }
  });

  const updateObservation = (category: string, content: string) => markDirty((current) => {
    const index = current.observations.findIndex((item) => item.documentType === "NEXT_WEEK_PLAN" && item.category === category);
    if (index < 0) {
      const next: WeeklyObservation = { documentType: "NEXT_WEEK_PLAN", category, sortOrder: current.observations.length, projectId: null, projectNameSnapshot: null, locationId: null, locationNameSnapshot: null, workItemId: null, workItemNameSnapshot: null, manualText: null, manualLocation: null, manualProjectName: null, manualWorkItemName: null, categoryItemId: null, categoryNameSnapshot: null, manualCategoryName: null, displayText: null as unknown as string, content };
      return { ...current, observations: [...current.observations, next] };
    }
    return { ...current, observations: current.observations.map((item, itemIndex) => itemIndex === index ? { ...item, content } : item) };
  });

  const legacyResultObservations = dossier.observations.filter((item) => item.documentType === "RESULT");
  const unsaved = saveState === "dirty" || saveState === "saving" || saveState === "error" || saveState === "conflict";
  const statusText = saveState === "saving" ? "Đang lưu…" : saveState === "dirty" ? "Có thay đổi chưa lưu" : saveState === "error" ? "Lưu thất bại" : saveState === "conflict" ? "Xung đột phiên bản" : message || "Đã lưu";

  return <div className="space-y-5 pb-20">
    <PageHeader>
      <PageHeading title="Soạn hồ sơ báo cáo tuần" description={`${documentLabels[activeDocument]} · Phiên bản ${dossier.version}`} action={<div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/supervision/weekly" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"><ArrowLeft className="h-4 w-4" />Danh sách</Link>
        <button type="button" onClick={async (e) => {
          e.preventDefault();
          const targetUrl = `/supervision/weekly/${dossier.id}/preview`;
          if (saveState !== "saved") {
            const newTab = window.open("about:blank", "_blank");
            await persistOnce();
            if (newTab) newTab.location.href = targetUrl;
          } else {
            window.open(targetUrl, "_blank");
          }
        }} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"><FileOutput className="h-4 w-4" />Xem trước / In</button>
        {editable && <Button onClick={() => void persistOnce()} disabled={saveState === "saving" || saveState === "saved"}><Save className="h-4 w-4" />Lưu nháp</Button>}
        {editable && <Button onClick={() => transition("SUBMIT")} disabled={workflowPending || unsaved}><Send className="h-4 w-4" />Gửi báo cáo</Button>}
      </div>} />
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">{dossier.status === "DRAFT" ? "Bản nháp" : dossier.status === "REVISION_REQUIRED" ? "Yêu cầu chỉnh sửa" : dossier.status === "SUBMITTED" ? "Đã gửi" : dossier.status === "APPROVED" ? "Đã duyệt" : "Đã khóa"}</span>
        <span className={saveState === "error" || saveState === "conflict" ? "font-semibold text-rose-700" : saveState === "saving" ? "font-semibold text-blue-700" : "text-slate-500"} data-testid="autosave-status">{statusText}</span>
        {(saveState === "error" || saveState === "conflict") && <button type="button" onClick={retrySave} className="inline-flex items-center gap-1 font-bold text-blue-700"><RefreshCw className="h-3.5 w-3.5" />Thử lại</button>}
        {canReview && dossier.status === "SUBMITTED" && <><Button variant="outline" onClick={() => transition("REQUEST_REVISION")}>Yêu cầu chỉnh sửa</Button><Button onClick={() => transition("APPROVE")}>Duyệt</Button></>}
        {canReview && dossier.status === "APPROVED" && <Button onClick={() => transition("LOCK")}>Khóa hồ sơ</Button>}
      </div>
    </PageHeader>

    <ContentCard className="p-4 sm:p-5">
      <SectionHeader title="Thông tin chung" description="Dùng chung cho Báo cáo kết quả tuần và Kế hoạch tuần tiếp theo." />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Số báo cáo" value={dossier.reportNumber || ""} disabled={!editable} onChange={(value) => markDirty((current) => ({ ...current, reportNumber: value || null }))} testId="report-number" />
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
      <ContentCard className="p-4 sm:p-6"><SectionHeader title="II, III. Theo dõi tồn tại và kiến nghị" description="Giữ nguyên data flow hiện tại của Kế hoạch tuần tiếp theo." /><div className="mt-4 grid gap-4 lg:grid-cols-2">{["Theo dõi khắc phục tồn tại", "Kiểm tra lại sau khắc phục", "Kiến nghị, đề xuất Ban Giám đốc"].map((category) => <label key={category} className="block text-sm font-semibold text-slate-700">{category}<AutoTextarea disabled={!editable} value={dossier.observations.find((item) => item.documentType === "NEXT_WEEK_PLAN" && item.category === category)?.content || ""} onChange={(value) => updateObservation(category, value)} placeholder="Nhập nội dung…" className="mt-2 min-h-28" /></label>)}</div></ContentCard>
    </div>}
  </div>;
}

function Field({ label, value, onChange, disabled, testId }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; testId?: string }) {
  return <label className="text-xs font-semibold text-slate-600">{label}<input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-50" /></label>;
}

function Tab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-bold transition ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>{children}</button>;
}
