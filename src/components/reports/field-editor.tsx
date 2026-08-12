"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronRight, Cloud, CloudOff, Eye, Loader2, RefreshCw, Save,
  Plus, ListTodo, FileImage, Files, Building2, Calendar, MapPin, Sun, CloudRain,
  Wind, Thermometer, AlertCircle, CheckCircle2, Trash2, UploadCloud, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard, SectionHeader } from "@/components/ui/enterprise";
import { useToast } from "@/components/ui/toast-context";
import { GeneralInfoCard } from "./create-dialog/general-info-card";
import { WorkPicker, type PickerWorkItem } from "./create-dialog/work-picker";
import { SelectedWorkCard } from "./create-dialog/selected-work-card";
import { ResourcesAndQuality } from "./create-dialog/resources-and-quality";
import { AttachmentsCard } from "./create-dialog/attachments-card";
import { WeeklyReportForm } from "./create-dialog/weekly-report-form";
import { ReportPrintPreviewDialog } from "./report-print-preview-dialog";
import {
  getProjectWorkItems,
  saveSiteReportDraft,
  type SaveSiteReportDraftInput,
} from "@/app/(dashboard)/reports/actions";
import type { CreateReportFormData, FieldReport, ReportWorkLine } from "./types";
import { formatNumberSafe } from "@/lib/reports/report-format-utils";

export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

export type SectionNavItem = {
  id: string;
  label: string;
  shortLabel?: string;
  status: "complete" | "active" | "incomplete" | "error" | "empty";
};

/* ── Save status indicator component matching Supervision UX ── */
function SaveIndicator({
  state,
  lastSavedAt,
  message,
  onRetry,
}: {
  state: SaveState;
  lastSavedAt: string | null;
  message?: string;
  onRetry: () => void;
}) {
  const icon =
    state === "saving" ? (
      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    ) : state === "saved" ? (
      <Cloud className="h-4 w-4 text-emerald-500" />
    ) : state === "dirty" ? (
      <Cloud className="h-4 w-4 text-slate-400" />
    ) : (
      <CloudOff className="h-4 w-4 text-rose-500" />
    );

  const text =
    state === "saving"
      ? "Đang lưu nháp..."
      : state === "saved"
      ? lastSavedAt
        ? `Đã lưu lúc ${lastSavedAt}`
        : "Đã lưu bản nháp"
      : state === "dirty"
      ? "Có thay đổi chưa lưu"
      : state === "conflict"
      ? "Xung đột phiên bản"
      : "Lưu thất bại";

  const textClass =
    state === "error" || state === "conflict"
      ? "text-rose-600 font-semibold"
      : state === "saving"
      ? "text-blue-600 font-medium"
      : state === "saved"
      ? "text-emerald-600 font-medium"
      : "text-slate-500 font-medium";

  return (
    <div className="flex items-center gap-2 text-xs" data-testid="autosave-status">
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
        {icon}
        <span className={textClass}>{text}</span>
        {(state === "error" || state === "conflict") && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-1 inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
            aria-label="Thử lưu lại"
          >
            <RefreshCw className="h-3 w-3" /> Thử lại
          </button>
        )}
      </div>
    </div>
  );
}

function cleanActionError(error: unknown) {
  const message = error instanceof Error ? error.message : "Không thể lưu báo cáo.";
  return message.replace(/^Error:\s*/i, "").replace(/^CONFLICT:\s*/i, "");
}

/* ════════════════════════════════════════════════════
   MAIN FIELD EDITOR COMPONENT
   ════════════════════════════════════════════════════ */
export function FieldEditor({
  initialReport,
  activeProjects,
  currentUser,
  mode = "create",
  initialType = "DAILY",
}: {
  initialReport?: FieldReport | null;
  activeProjects: { id: string; name: string; code?: string }[];
  currentUser: { id: string; name: string; role?: string };
  mode?: "create" | "edit";
  initialType?: "DAILY" | "WEEKLY";
}) {
  const router = RouterHook();
  const toast = useToast();

  const [reportId, setReportId] = useState<string | null>(initialReport?.id || null);
  const [reportNo, setReportNo] = useState<string | null>(initialReport?.reportNo || null);
  const expectedUpdatedAtRef = useRef<string | null>(initialReport?.updatedAt || null);

  const getDefaultForm = useCallback((): CreateReportFormData => {
    const now = new Date();
    return {
      type: initialReport?.type || initialType || "DAILY",
      projectId:
        initialReport?.projectId ||
        (activeProjects.length === 1 ? activeProjects[0].id : ""),
      date: initialReport?.date || now.toISOString().split("T")[0],
      time: initialReport?.time || now.toTimeString().split(" ")[0].slice(0, 5),
      weekStartDate: initialReport?.weekStartDate,
      weekEndDate: initialReport?.weekEndDate,
      creatorName: initialReport?.creatorName || currentUser.name,
      weatherCondition: initialReport?.weatherCondition || "SUNNY",
      weatherTemperature: initialReport?.weatherTemperature,
      workLines: initialReport?.workLines ? initialReport.workLines.map((l) => ({ ...l })) : [],
      materials: initialReport?.materials || "",
      labor: initialReport?.labor || "",
      quality: initialReport?.quality || "",
      issues: initialReport?.issues || "",
      recommendations: initialReport?.recommendations || "",
      gpsLocation: initialReport?.gpsLocation || "",
      photos: [],
      attachments: [],
      attachmentIdsToDelete: [],
    };
  }, [initialReport, initialType, activeProjects, currentUser.name]);

  const [form, setForm] = useState<CreateReportFormData>(getDefaultForm());
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState<string | null>("general");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [workItemsData, setWorkItemsData] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeWeeklyTab, setActiveWeeklyTab] = useState<"result" | "plan" | "notes">("result");

  const formRef = useRef(form);
  const dirtyRef = useRef(false);
  const failedRef = useRef(false);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const persistFunctionRef = useRef<() => Promise<boolean>>(async () => true);

  // Mark form as dirty when user edits
  const markDirty = (updater: (prev: CreateReportFormData) => CreateReportFormData) => {
    setForm((current) => {
      const next = updater(current);
      formRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    failedRef.current = false;
    setSaveState("dirty");
    setMessage("");
    setRevision((val) => val + 1);
  };

  const updateField = (field: string, value: any) => {
    markDirty((prev) => ({ ...prev, [field]: value }));
  };

  const updateWorkLine = (
    index: number,
    field: keyof Omit<ReportWorkLine, "id">,
    value: any
  ) => {
    markDirty((prev) => {
      const nextLines = [...prev.workLines];
      nextLines[index] = { ...nextLines[index], [field]: value };
      return { ...prev, workLines: nextLines };
    });
  };

  const removeWorkLine = (index: number) => {
    markDirty((prev) => {
      const nextLines = [...prev.workLines];
      nextLines.splice(index, 1);
      return { ...prev, workLines: nextLines };
    });
  };

  // Single-flight persist logic matching Supervision UX
  const persistOnce = async (): Promise<boolean> => {
    if (savePromiseRef.current) return savePromiseRef.current;
    if (!dirtyRef.current) return saveState !== "error" && saveState !== "conflict";

    const snapshot = formRef.current;
    if (!snapshot.projectId) {
      setSaveState("error");
      setMessage("Vui lòng chọn công trình trước khi lưu.");
      return false;
    }

    dirtyRef.current = false;
    setSaveState("saving");
    setMessage("");

    const promise = (async () => {
      try {
        const input: SaveSiteReportDraftInput = {
          reportId: reportId,
          expectedUpdatedAt: expectedUpdatedAtRef.current,
          projectId: snapshot.projectId,
          type: snapshot.type,
          date: snapshot.date,
          time: snapshot.time,
          weekStartDate: snapshot.weekStartDate,
          weekEndDate: snapshot.weekEndDate,
          weatherCondition: snapshot.weatherCondition,
          weatherTemperature: snapshot.weatherTemperature,
          summary: snapshot.issues || snapshot.recommendations || undefined,
          materials: snapshot.materials,
          labor: snapshot.labor,
          quality: snapshot.quality,
          issues: snapshot.issues,
          recommendations: snapshot.recommendations,
          gpsLat: snapshot.gpsLocation?.split(",")[0]
            ? Number(snapshot.gpsLocation.split(",")[0].trim())
            : undefined,
          gpsLng: snapshot.gpsLocation?.split(",")[1]
            ? Number(snapshot.gpsLocation.split(",")[1].trim())
            : undefined,
          workLines: snapshot.workLines.map((l) => ({
            fieldProgressItemId: l.fieldProgressItemId,
            wbsItemId: l.wbsItemId,
            workContent: l.workContent,
            quantityToday: l.quantityToday,
            unit: l.unit,
            note: l.note,
            proposalNote: l.proposalNote,
            issueNote: l.issueNote,
          })),
        };

        const result = await saveSiteReportDraft(input);

        if (!result.success && "code" in result && result.code === "WEEKLY_REPORT_ALREADY_EXISTS") {
          setSaveState("error");
          setMessage(`Báo cáo tuần cho kỳ này đã tồn tại (${result.existingReportNo}).`);
          failedRef.current = true;
          return false;
        }

        if (result.success && result.id) {
          setReportId(result.id);
          if (result.reportNo) setReportNo(result.reportNo);
          if (result.updatedAt) expectedUpdatedAtRef.current = result.updatedAt;

          // If new report, update browser route seamlessly without full refresh
          if (!reportId && result.id && typeof window !== "undefined") {
            window.history.replaceState(null, "", `/reports/field/${result.id}/edit`);
          }

          // Handle attachment deletions if any
          if (snapshot.attachmentIdsToDelete && snapshot.attachmentIdsToDelete.length > 0 && result.id) {
            for (const attId of snapshot.attachmentIdsToDelete) {
              await fetch(`/api/reports/${result.id}/attachments`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attachmentId: attId }),
              }).catch(() => undefined);
            }
            setForm((prev) => ({ ...prev, attachmentIdsToDelete: [] }));
          }

          // Upload pending photos/files if any
          if (snapshot.photos.length > 0 && result.id) {
            const formData = new FormData();
            formData.append("kind", "PHOTO");
            snapshot.photos.forEach((file) => formData.append("files", file));
            await fetch(`/api/reports/${result.id}/attachments`, {
              method: "POST",
              body: formData,
            }).catch(() => undefined);
            setForm((prev) => ({ ...prev, photos: [] }));
          }

          if (snapshot.attachments.length > 0 && result.id) {
            const formData = new FormData();
            formData.append("kind", "FILE");
            snapshot.attachments.forEach((file) => formData.append("files", file));
            await fetch(`/api/reports/${result.id}/attachments`, {
              method: "POST",
              body: formData,
            }).catch(() => undefined);
            setForm((prev) => ({ ...prev, attachments: [] }));
          }

          failedRef.current = false;
          if (dirtyRef.current) {
            setSaveState("dirty");
          } else {
            setSaveState("saved");
            setLastSavedAt(
              new Date().toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            );
            setMessage("Đã lưu bản nháp");
          }
          return true;
        }

        throw new Error("Lưu thất bại.");
      } catch (error) {
        dirtyRef.current = true;
        failedRef.current = true;
        const isConflict =
          error instanceof Error && error.message.includes("CONFLICT:");
        setSaveState(isConflict ? "conflict" : "error");
        setMessage(cleanActionError(error));
        return false;
      } finally {
        savePromiseRef.current = null;
        if (dirtyRef.current && !failedRef.current) {
          window.setTimeout(() => void persistFunctionRef.current(), 0);
        }
      }
    })();

    savePromiseRef.current = promise;
    return promise;
  };

  useEffect(() => {
    persistFunctionRef.current = persistOnce;
  });

  // 900ms debounced autosave effect
  useEffect(() => {
    if (!dirtyRef.current || failedRef.current) return;
    const timer = window.setTimeout(() => void persistFunctionRef.current(), 900);
    return () => window.clearTimeout(timer);
  }, [revision]);

  // Before unload warning for unsaved changes
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current && !savePromiseRef.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void persistOnce();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Fetch baseline work items when project changes
  useEffect(() => {
    if (!form.projectId) {
      setWorkItemsData([]);
      return;
    }
    async function loadItems() {
      setIsLoadingItems(true);
      try {
        const items = await getProjectWorkItems(form.projectId, form.date);
        setWorkItemsData(items || []);
      } catch (e) {
        console.error("Failed to load baseline items:", e);
      } finally {
        setIsLoadingItems(false);
      }
    }
    loadItems();
  }, [form.projectId, form.date]);

  const retrySave = () => {
    failedRef.current = false;
    setSaveState("dirty");
    void persistOnce();
  };

  const handleSelectWorkItems = (items: PickerWorkItem[]) => {
    const duplicateItems = items.filter((item) =>
      form.workLines.some(
        (line) => line.fieldProgressItemId === item.fieldProgressItemId
      )
    );
    const newLines = items
      .map((item) => {
        const existing = form.workLines.find(
          (l) => l.fieldProgressItemId === item.fieldProgressItemId
        );
        if (existing) return null;

        return {
          fieldProgressItemId: item.fieldProgressItemId,
          categoryName: item.categoryName,
          code: item.code,
          workContent: item.name,
          unit: item.unit,
          designQuantity: item.designQuantity,
          quantityBefore: item.cumulativeBeforeDate,
          approvedCumulative: item.cumulativeAfterDate,
          cumulativeBeforeDate: item.cumulativeBeforeDate,
          cumulativeAfterDate: item.cumulativeAfterDate,
          totalActiveEnteredQuantity: item.totalActiveEnteredQuantity,
          approvedQuantity: item.approvedQuantity,
          pendingQuantity: item.pendingQuantity,
          draftQuantity: item.draftQuantity,
          submittedQuantity: item.submittedQuantity,
          todayQuantity: item.todayQuantity,
          remainingQuantity: item.remainingQuantity,
          quantityToday: 0,
          note: "",
          proposalNote: "",
        } as ReportWorkLine;
      })
      .filter(Boolean) as ReportWorkLine[];

    if (newLines.length > 0) {
      markDirty((prev) => ({
        ...prev,
        workLines: [...prev.workLines, ...newLines],
      }));
      toast.success(`Đã thêm ${newLines.length} công việc vào báo cáo.`);
    }
    if (duplicateItems.length > 0) {
      toast.error("Công việc này đã có trong báo cáo.");
    }
  };

  const currentProject = activeProjects.find((p) => p.id === form.projectId);
  const selectedCount = form.workLines.length;
  const totalQtyToday = form.workLines.reduce(
    (sum, line) => sum + (Number(line.quantityToday) || 0),
    0
  );

  const sections: SectionNavItem[] = [
    { id: "general", label: "Thông tin chung", shortLabel: "Chung", status: (form.projectId ? "complete" : "incomplete") as SectionNavItem["status"] },
    ...(form.type === "DAILY"
      ? [
          { id: "work-lines-section", label: "Nhật ký công việc", shortLabel: "Công việc", status: (form.workLines.length > 0 ? "complete" : "empty") as SectionNavItem["status"] },
          { id: "resources-section", label: "Vật tư & Nhân lực", shortLabel: "Tài nguyên", status: (form.materials || form.labor ? "complete" : "empty") as SectionNavItem["status"] },
        ]
      : []),
    { id: "attachments-section", label: "Hình ảnh & Tài liệu", shortLabel: "Tệp đính kèm", status: "complete" },
  ];

  const handleSectionClick = (id: string) => {
    setActiveSectionId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const pickerItems: PickerWorkItem[] = workItemsData.map((w) => ({
    id: w.id,
    fieldProgressItemId: w.id,
    code: w.code,
    categoryName: w.categoryName,
    name: w.name,
    workContent: w.name,
    designQuantity: Number(w.designQuantity || 0),
    approvedCumulative: Number(
      w.cumulativeAfterDate ?? w.approvedCumulative ?? 0
    ),
    cumulativeBeforeDate: Number(w.cumulativeBeforeDate ?? 0),
    cumulativeAfterDate: Number(
      w.cumulativeAfterDate ?? w.approvedCumulative ?? 0
    ),
    totalActiveEnteredQuantity: Number(
      w.totalActiveEnteredQuantity ??
        w.cumulativeAfterDate ??
        w.approvedCumulative ??
        0
    ),
    approvedQuantity: Number(w.approvedQuantity ?? 0),
    pendingQuantity: Number(w.pendingQuantity ?? 0),
    draftQuantity: Number(w.draftQuantity ?? 0),
    submittedQuantity: Number(w.submittedQuantity ?? 0),
    todayQuantity: Number(w.todayQuantity || 0),
    remainingQuantity: Number(w.remainingQuantity || 0),
    unit: w.unit || "Lần",
    status: w.status || "OPEN",
    itemStatus: w.itemStatus,
  }));

  return (
    <div className="space-y-5 pb-24 sm:pb-20 max-w-7xl mx-auto px-2 sm:px-6 py-4">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 px-1 py-1 text-sm print:hidden" aria-label="Breadcrumb">
        <Link
          href="/reports/field"
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium text-xs sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Danh sách báo cáo</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="text-slate-500 font-medium hidden sm:inline">Báo cáo hiện trường</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300 hidden sm:inline" />
        <span className="font-bold text-blue-700">
          {mode === "create" ? "Soạn báo cáo mới" : "Chỉnh sửa báo cáo"}
        </span>
      </nav>

      {/* Main Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs print:hidden overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {form.type === "DAILY"
                  ? `Nhật ký thi công — ${form.date || "Ngày làm việc"}`
                  : `Báo cáo tổng hợp tuần — ${form.weekStartDate || "Tuần"}`}
              </h1>
              {reportNo && (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-mono font-bold text-blue-700 border border-blue-200">
                  {reportNo}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600">
              <span className="font-semibold text-slate-800">
                {currentProject ? `${currentProject.code ? `[${currentProject.code}] ` : ""}${currentProject.name}` : "Chưa chọn công trình"}
              </span>
              <span className="text-slate-300">·</span>
              <span>Người tạo: <strong>{form.creatorName}</strong></span>
              <span className="text-slate-300">·</span>
              <span>Loại: <strong>{form.type === "DAILY" ? "Báo cáo ngày" : "Báo cáo tuần"}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <SaveIndicator
              state={saveState}
              lastSavedAt={lastSavedAt}
              message={message}
              onRetry={retrySave}
            />
          </div>
        </div>

        {/* Message Banner for errors or conflicts */}
        {message && message !== "Đã lưu bản nháp" && (
          <div
            className={`border-t px-5 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              saveState === "conflict" || saveState === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-blue-100 bg-blue-50 text-blue-800"
            }`}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Header Action Bar */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 bg-slate-50/50">
          <div className="text-xs text-slate-500 font-medium hidden md:block">
            Mẹo: Nhấn <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold">Ctrl+S</kbd> để lưu nhanh
          </div>
          <div className="flex flex-wrap items-center gap-2.5 ml-auto w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-slate-700 border-slate-300 hover:bg-slate-100 font-semibold rounded-xl"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="mr-1.5 h-4 w-4 text-slate-500" /> Xem trước
            </Button>
            <Button
              size="sm"
              className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs rounded-xl"
              onClick={() => void persistOnce()}
              disabled={saveState === "saving"}
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saveState === "saving" ? "Đang lưu..." : "Lưu báo cáo"}
            </Button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="border-t border-slate-100 px-5 bg-white">
          <div className="flex gap-1 overflow-x-auto hide-scrollbar py-1">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSectionClick(s.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeSectionId === s.id
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    s.status === "complete" ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="space-y-6">
        {/* Type selector toggle */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs inline-flex">
          <button
            type="button"
            onClick={() => updateField("type", "DAILY")}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              form.type === "DAILY"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Báo cáo ngày
          </button>
          <button
            type="button"
            onClick={() => updateField("type", "WEEKLY")}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              form.type === "WEEKLY"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Báo cáo tuần
          </button>
        </div>

        {/* Section 1: General Info */}
        <div id="general">
          <GeneralInfoCard
            form={form}
            updateField={updateField}
            activeProjects={activeProjects}
            errors={{}}
          />
        </div>

        {/* Section 2: Work Lines (Only for DAILY) */}
        {form.type === "DAILY" && (
          <ContentCard id="work-lines-section" className="overflow-hidden p-0 sm:p-0">
            <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-100 p-2 rounded-xl text-blue-700">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Khối lượng thực hiện trong ngày
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chọn công việc từ bảng khối lượng gốc của công trình
                  </p>
                </div>
              </div>

              <Button
                type="button"
                disabled={!form.projectId}
                onClick={() => setIsPickerOpen(true)}
                className={`${
                  !form.projectId
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                } font-bold h-10 px-5 rounded-xl transition-all whitespace-nowrap flex items-center text-xs sm:text-sm`}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Thêm khối lượng
              </Button>
            </div>

            <div className="p-4 sm:p-5 bg-white">
              {!form.projectId ? (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Building2 className="w-10 h-10 text-slate-300 mb-3" />
                  <h4 className="font-bold text-slate-800 text-sm">
                    Chưa chọn công trình
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Vui lòng chọn công trình ở phần Thông tin chung trước khi thêm khối lượng.
                  </p>
                </div>
              ) : isLoadingItems ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                  <p className="text-xs text-slate-500 font-medium">
                    Đang tải bảng khối lượng...
                  </p>
                </div>
              ) : form.workLines.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-blue-50/30 rounded-2xl border border-dashed border-blue-200">
                  <ListTodo className="w-10 h-10 text-blue-400 mb-3" />
                  <h4 className="font-bold text-slate-800 text-sm">
                    Chưa có khối lượng trong báo cáo
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm">
                    Báo cáo hiện chưa có công việc. Bạn có thể lưu bản nháp trước hoặc thêm khối lượng ngay.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-5 rounded-xl text-xs"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Chọn khối lượng từ công trình
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-bold">
                        <tr>
                          <th className="w-12 px-3 py-3 text-center">STT</th>
                          <th className="px-4 py-3">Công việc</th>
                          <th className="w-20 px-2 py-3 text-center">Đơn vị</th>
                          <th className="w-28 px-3 py-3 text-right">Thiết kế</th>
                          <th className="w-28 px-3 py-3 text-right">Lũy kế</th>
                          <th className="w-32 px-4 py-3 text-right text-blue-700">
                            Hôm nay
                          </th>
                          <th className="w-48 px-3 py-3">Ghi chú vị trí</th>
                          <th className="w-48 px-3 py-3">Đề xuất / Phát sinh</th>
                          <th className="w-12 px-3 py-3 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs align-top">
                        {form.workLines.map((line, idx) => {
                          const design = Number(line.designQuantity || 0);
                          const before = Number(
                            line.quantityBefore ?? line.cumulativeBeforeDate ?? 0
                          );
                          const today = Number(line.quantityToday || 0);
                          const remaining = Number(line.remainingQuantity || 0);
                          const isOver = today > remaining;

                          return (
                            <tr
                              key={idx}
                              className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                                isOver ? "bg-rose-50/40" : ""
                              }`}
                            >
                              <td className="px-3 py-3.5 text-center font-medium text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3.5">
                                {line.categoryName && (
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                    {line.categoryName}
                                  </div>
                                )}
                                <div className="font-bold text-slate-800 line-clamp-2">
                                  {line.code ? (
                                    <span className="text-blue-600 mr-1.5 font-mono text-[11px]">
                                      [{line.code}]
                                    </span>
                                  ) : null}
                                  {line.workContent}
                                </div>
                              </td>
                              <td className="px-2 py-3.5 text-center font-medium text-slate-600">
                                {line.unit}
                              </td>
                              <td className="px-3 py-3.5 text-right font-medium text-slate-600">
                                {design}
                              </td>
                              <td className="px-3 py-3.5 text-right font-medium text-emerald-600">
                                {before}
                              </td>
                              <td className="px-4 py-2.5">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={line.quantityToday ?? ""}
                                  onChange={(e) =>
                                    updateWorkLine(
                                      idx,
                                      "quantityToday",
                                      e.target.value === "" ? undefined : Number(e.target.value)
                                    )
                                  }
                                  placeholder="0.0"
                                  className={`w-full h-9 px-2.5 text-xs font-bold text-right bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                                    isOver
                                      ? "border-rose-400 bg-rose-50 text-rose-700"
                                      : "border-slate-300 text-slate-900"
                                  }`}
                                />
                                {isOver && (
                                  <div className="text-[10px] text-rose-600 font-bold mt-1 text-right">
                                    Vượt quá {remaining}!
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  type="text"
                                  value={line.note || ""}
                                  onChange={(e) =>
                                    updateWorkLine(idx, "note", e.target.value)
                                  }
                                  placeholder="Vị trí thi công..."
                                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  type="text"
                                  value={line.proposalNote || ""}
                                  onChange={(e) =>
                                    updateWorkLine(idx, "proposalNote", e.target.value)
                                  }
                                  placeholder="Kiến nghị / xử lý..."
                                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeWorkLine(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Xóa công việc"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View Cards */}
                  <div className="md:hidden space-y-3">
                    {form.workLines.map((line, idx) => (
                      <SelectedWorkCard
                        key={idx}
                        line={line}
                        index={idx}
                        updateWorkLine={updateWorkLine}
                        removeWorkLine={removeWorkLine}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ContentCard>
        )}

        {/* Weekly Report Form (Only for WEEKLY) */}
        {form.type === "WEEKLY" && (
          <WeeklyReportForm
            form={form}
            updateField={updateField}
            errors={{}}
            workItems={workItemsData}
            activeTab={activeWeeklyTab}
            setActiveTab={setActiveWeeklyTab}
          />
        )}

        {/* Section 3: Resources & Quality (For DAILY) */}
        {form.type === "DAILY" && (
          <div id="resources-section">
            <ResourcesAndQuality form={form} updateField={updateField} />
          </div>
        )}

        {/* Section 4: Attachments */}
        <div id="attachments-section">
          <AttachmentsCard
            photos={form.photos}
            attachments={form.attachments}
            existingPhotos={initialReport?.photos?.filter(
              (photo) => !(form.attachmentIdsToDelete || []).includes(photo.id)
            )}
            existingAttachments={initialReport?.attachments?.filter(
              (file) => !(form.attachmentIdsToDelete || []).includes(file.id)
            )}
            onAddPhotos={(e) => {
              if (e.target.files)
                markDirty((prev) => ({
                  ...prev,
                  photos: [...prev.photos, ...Array.from(e.target.files!)],
                }));
            }}
            onRemovePhoto={(idx) => {
              markDirty((prev) => {
                const arr = [...prev.photos];
                arr.splice(idx, 1);
                return { ...prev, photos: arr };
              });
            }}
            onAddFiles={(e) => {
              if (e.target.files)
                markDirty((prev) => ({
                  ...prev,
                  attachments: [
                    ...prev.attachments,
                    ...Array.from(e.target.files!),
                  ],
                }));
            }}
            onRemoveFile={(idx) => {
              markDirty((prev) => {
                const arr = [...prev.attachments];
                arr.splice(idx, 1);
                return { ...prev, attachments: arr };
              });
            }}
            onRemoveExistingPhoto={(id) => {
              markDirty((prev) => ({
                ...prev,
                attachmentIdsToDelete: [
                  ...(prev.attachmentIdsToDelete || []),
                  id,
                ],
              }));
            }}
            onRemoveExistingAttachment={(id) => {
              markDirty((prev) => ({
                ...prev,
                attachmentIdsToDelete: [
                  ...(prev.attachmentIdsToDelete || []),
                  id,
                ],
              }));
            }}
          />
        </div>
      </div>

      {/* Work Picker Dialog */}
      <WorkPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        workItems={pickerItems}
        onSelect={handleSelectWorkItems}
        isLoading={isLoadingItems}
      />

      {/* Print Preview Dialog */}
      {previewOpen && (
        <ReportPrintPreviewDialog
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          report={{
            id: reportId || "draft",
            reportNo: reportNo || "NHÁP",
            code: reportNo || "NHÁP",
            type: form.type,
            projectId: form.projectId,
            projectName: currentProject?.name || "",
            date: form.date,
            time: form.time,
            weekStartDate: form.weekStartDate,
            weekEndDate: form.weekEndDate,
            summary: form.summary || undefined,
            creatorName: form.creatorName,
            creatorRole: currentUser.role || "Chỉ huy trưởng",
            weatherCondition: form.weatherCondition,
            weatherTemperature: form.weatherTemperature,
            status: (initialReport?.status || "DRAFT") as any,
            photos: [],
            attachments: [],
            workLines: form.workLines.map((l, idx) => ({
              id: String(idx),
              workContent: l.workContent,
              unit: l.unit,
              designQuantity: l.designQuantity,
              quantityBefore: l.quantityBefore,
              quantityToday: l.quantityToday,
              note: l.note,
            })),
            materials: form.materials,
            labor: form.labor,
            quality: form.quality,
            issues: form.issues,
            recommendations: form.recommendations,
            approvalHistory: [],
          }}
        />
      )}

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 sm:hidden print:hidden safe-area-bottom shadow-lg">
        <Button
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
          onClick={() => void persistOnce()}
          disabled={saveState === "saving"}
        >
          <Save className="mr-2 h-4 w-4" />
          {saveState === "saving" ? "Đang lưu..." : "Lưu báo cáo"}
        </Button>
      </div>
    </div>
  );
}

function RouterHook() {
  try {
    return useRouter();
  } catch {
    return { push: () => {}, replace: () => {} };
  }
}
