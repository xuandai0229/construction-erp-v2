"use client";

import React, { useEffect, useRef, useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Info,
  Lock,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafetyEditorHeader, AutoSaveState } from "./safety-editor-header";
import { AutoTextarea } from "./auto-textarea";
import { SafetyItemPickerModal } from "./safety-item-picker-modal";
import { SafetyRowActionMenu } from "./safety-row-action-menu";
import { SafetyProjectCombobox } from "./safety-project-combobox";
import {
  saveSafetyAssessmentAction,
  deleteSafetyAssessmentAction,
  importEntriesFromPlanAction,
} from "@/app/(dashboard)/reports/safety/actions";
import {
  formatVnDate,
  formatVnPeriod,
  getWeekRange,
  formatIsoDateOnly,
  normalizeNfc,
  normalizeOptionalReportText,
} from "@/lib/safety-reporting/date-utils";
import {
  SAFETY_ASSESSMENT_OFFICIAL_CONTENT,
  SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE,
  SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT,
} from "@/lib/safety-reporting/safety-assessment-official-content";

export interface SafetyAssessmentEditorProps {
  report: any;
  projects: Array<{ id: string; name: string; code?: string }>;
  plans?: Array<{ id: string; documentNumber?: string; title: string }>;
  currentUser: { id: string; role: string; name: string };
}

const shiftsList = [
  { key: "MORNING", label: "Sáng" },
  { key: "AFTERNOON", label: "Chiều" },
  { key: "EVENING", label: "Tối" },
];

/* ── Memoized Table Row Component ── */
const AssessmentEntryRow = React.memo(function AssessmentEntryRow({
  entry,
  canEdit,
  projects,
  onUpdateField,
  onDuplicate,
  onDelete,
  onOpenPickerModal,
}: {
  entry: any;
  canEdit: boolean;
  projects: Array<{ id: string; name: string; code?: string }>;
  onUpdateField: (id: string, field: string, value: any) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenPickerModal: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,28fr)_minmax(0,21fr)_minmax(0,19fr)_minmax(0,17fr)_44px] border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50 transition-colors p-3 md:p-2.5 items-stretch gap-3 md:gap-0 font-sans">
      {/* Col 1: Công trình & Nội dung (28%) */}
      <div className="md:border-r md:border-slate-200 md:pr-2.5 space-y-2 flex flex-col justify-start">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-700 md:hidden">1. Công trình & Nội dung:</label>
          {canEdit && (
            <button
              type="button"
              onClick={() => onOpenPickerModal(entry.id)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors"
            >
              <Sparkles className="h-3 w-3 text-blue-500" />
              <span>Chọn nội dung (20 mục)</span>
            </button>
          )}
        </div>

        <SafetyProjectCombobox
          value={entry.projectMode === "CUSTOM" ? "CUSTOM" : entry.projectId}
          projectMode={entry.projectMode}
          customProjectName={entry.customProjectName}
          projects={projects}
          disabled={!canEdit}
          onSelectProject={(update) => {
            if (update.projectMode === "CUSTOM") {
              onUpdateField(entry.id, "projectMode", "CUSTOM");
              if (update.customProjectName !== undefined) {
                onUpdateField(entry.id, "customProjectName", update.customProjectName);
              }
            } else {
              onUpdateField(entry.id, "projectMode", "EXISTING");
              onUpdateField(entry.id, "projectId", update.projectId);
              onUpdateField(entry.id, "customProjectName", "");
            }
          }}
        />

        {entry.projectMode === "CUSTOM" && (
          <AutoTextarea
            disabled={!canEdit}
            value={entry.customProjectName || ""}
            onChange={(val) => onUpdateField(entry.id, "customProjectName", val)}
            placeholder="Nhập tên công trình tự do..."
            minHeight={38}
            className="w-full rounded-lg border border-amber-300 bg-amber-50/30 p-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
          />
        )}

        <AutoTextarea
          disabled={!canEdit}
          value={entry.inspectionContent || ""}
          onChange={(val) => onUpdateField(entry.id, "inspectionContent", val)}
          placeholder="Nhập nội dung kiểm tra..."
          minHeight={60}
          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
        />
        {(entry.inspectionContent || "").length > 500 && (
          <div className="text-[10px] text-slate-400 text-right">
            {(entry.inspectionContent || "").length.toLocaleString()} ký tự
          </div>
        )}
      </div>

      {/* Col 2: Đánh giá công trình (21%) */}
      <div className="md:border-r md:border-slate-200 md:px-2.5 space-y-1.5 flex flex-col justify-start">
        <label className="text-[11px] font-bold text-slate-700 md:hidden">2. Đánh giá công trình:</label>
        <AutoTextarea
          disabled={!canEdit}
          value={entry.assessment || ""}
          onChange={(val) => onUpdateField(entry.id, "assessment", val)}
          placeholder="Nhập đánh giá thực tế tại công trình..."
          minHeight={90}
          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white leading-relaxed"
        />
        {(entry.assessment || "").length > 500 && (
          <div className="text-[10px] text-slate-400 text-right">
            {(entry.assessment || "").length.toLocaleString()} ký tự
          </div>
        )}
      </div>

      {/* Col 3: Kiến nghị yêu cầu (19%) */}
      <div className="md:border-r md:border-slate-200 md:px-2.5 space-y-1.5 flex flex-col justify-start">
        <label className="text-[11px] font-bold text-slate-700 md:hidden">3. Kiến nghị yêu cầu:</label>
        <AutoTextarea
          disabled={!canEdit}
          value={entry.recommendation || ""}
          onChange={(val) => onUpdateField(entry.id, "recommendation", val)}
          placeholder="Nhập kiến nghị, yêu cầu khắc phục..."
          minHeight={90}
          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white leading-relaxed"
        />
        {(entry.recommendation || "").length > 500 && (
          <div className="text-[10px] text-slate-400 text-right">
            {(entry.recommendation || "").length.toLocaleString()} ký tự
          </div>
        )}
      </div>

      {/* Col 4: Kết quả thực hiện (17%) */}
      <div className="md:border-r md:border-slate-200 md:px-2.5 space-y-1.5 flex flex-col justify-start">
        <label className="text-[11px] font-bold text-slate-700 md:hidden">4. Kết quả thực hiện:</label>
        <AutoTextarea
          disabled={!canEdit}
          value={entry.implementationResult || ""}
          onChange={(val) => onUpdateField(entry.id, "implementationResult", val)}
          placeholder="Nhập kết quả xử lý, thực hiện..."
          minHeight={90}
          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white leading-relaxed"
        />
        {(entry.implementationResult || "").length > 500 && (
          <div className="text-[10px] text-slate-400 text-right">
            {(entry.implementationResult || "").length.toLocaleString()} ký tự
          </div>
        )}
      </div>

      {/* Col 5: Actions (44px) */}
      <div className="shrink-0 w-[44px] flex items-center justify-center p-1">
        {canEdit ? (
          <SafetyRowActionMenu
            onDuplicate={() => onDuplicate(entry.id)}
            onDelete={() => onDelete(entry.id)}
          />
        ) : null}
      </div>
    </div>
  );
});

export function SafetyAssessmentEditor({
  report,
  projects,
  plans = [],
  currentUser,
}: SafetyAssessmentEditorProps) {
  const router = useRouter();

  // General Info fields
  const [officialDocumentNumber, setOfficialDocumentNumber] = useState(report.officialDocumentNumber || "");
  const [documentPlace, setDocumentPlace] = useState(report.documentPlace || "Hà Nội");
  const [recipientText, setRecipientText] = useState(report.recipientText || "Ban Giám đốc Công ty; Phòng kỹ thuật");
  const [reporterName, setReporterName] = useState(report.reporterName || currentUser.name || "Phạm Xuân Quảng");
  const [reporterTitle, setReporterTitle] = useState(report.reporterTitle || "Cán bộ An toàn");
  const [reporterDepartment, setReporterDepartment] = useState(report.reporterDepartment || "Phòng kỹ thuật");
  const [internalNote, setInternalNote] = useState(report.internalNote || "");
  const [selectedSourcePlanId, setSelectedSourcePlanId] = useState(report.sourcePlanId || "");

  // Section I & II fields
  const [previousWeekRemediation, setPreviousWeekRemediation] = useState(() => normalizeOptionalReportText(report.previousWeekRemediation));
  const [reinspectionConfirmation, setReinspectionConfirmation] = useState(() => normalizeOptionalReportText(report.reinspectionConfirmation));
  const [managementRecommendation, setManagementRecommendation] = useState(() => normalizeOptionalReportText(report.managementRecommendation || report.managementResourceRecommendation));
  const [otherOpinion, setOtherOpinion] = useState(() => normalizeOptionalReportText(report.otherOpinion || report.otherRecommendation));

  const [lockVersion, setLockVersion] = useState(report.version || 1);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Modals
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [showFull20Items, setShowFull20Items] = useState(false);
  const [pickerModalEntryId, setPickerModalEntryId] = useState<string | null>(null);
  const [deactivatingShiftInfo, setDeactivatingShiftInfo] = useState<{ dateIso: string; shiftKey: string; count: number } | null>(null);
  const [isImportingPlan, setIsImportingPlan] = useState(false);

  const canEdit = report.status !== "CANCELLED";

  const { weekStart, weekEnd } = useMemo(() => {
    return getWeekRange(report.periodStart);
  }, [report.periodStart]);

  const periodLabel = useMemo(() => formatVnPeriod(weekStart, weekEnd), [weekStart, weekEnd]);

  const weekDays = useMemo(() => {
    const dayNames = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateIso = formatIsoDateOnly(d);
      return {
        dayName: dayNames[i],
        dateIso,
        dateFormatted: formatVnDate(d),
      };
    });
  }, [weekStart]);

  // Form Entries State
  const [entries, setEntries] = useState<any[]>(() => {
    const existing = report.entries || [];
    return existing.map((e: any, idx: number) => ({
      id: e.id || `entry-${idx}`,
      inspectionDate: formatIsoDateOnly(new Date(e.inspectionDate)),
      shift: e.shift || "MORNING",
      projectId: e.projectId,
      projectMode: e.customProjectName ? "CUSTOM" : "EXISTING",
      customProjectName: e.customProjectName || "",
      inspectionContent: normalizeNfc(e.inspectionContent || ""),
      assessment: normalizeNfc(e.assessment || ""),
      recommendation: normalizeNfc(e.recommendation || ""),
      implementationResult: normalizeNfc(e.implementationResult || ""),
      sortOrder: e.sortOrder ?? idx,
    }));
  });

  // Shift Checkboxes State
  const [activeShifts, setActiveShifts] = useState<Record<string, Record<string, boolean>>>(() => {
    const map: Record<string, Record<string, boolean>> = {};
    weekDays.forEach((w) => {
      map[w.dateIso] = { MORNING: false, AFTERNOON: false, EVENING: false };
    });
    (report.entries || []).forEach((e: any) => {
      const dIso = formatIsoDateOnly(new Date(e.inspectionDate));
      if (!map[dIso]) map[dIso] = { MORNING: false, AFTERNOON: false, EVENING: false };
      if (e.shift) map[dIso][e.shift] = true;
    });
    return map;
  });

  // Save Pipeline Refs
  const isSavingRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const savePromiseRef = useRef<Promise<any> | null>(null);
  const dirtyRef = useRef(false);
  const failedRef = useRef(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lockVersionRef = useRef(lockVersion);

  useEffect(() => {
    lockVersionRef.current = lockVersion;
  }, [lockVersion]);

  const dataRef = useRef({
    officialDocumentNumber,
    documentPlace,
    recipientText,
    reporterName,
    reporterTitle,
    reporterDepartment,
    internalNote,
    previousWeekRemediation,
    reinspectionConfirmation,
    managementRecommendation,
    otherOpinion,
    entries,
  });

  useEffect(() => {
    dataRef.current = {
      officialDocumentNumber,
      documentPlace,
      recipientText,
      reporterName,
      reporterTitle,
      reporterDepartment,
      internalNote,
      previousWeekRemediation,
      reinspectionConfirmation,
      managementRecommendation,
      otherOpinion,
      entries,
    };
  }, [
    officialDocumentNumber,
    documentPlace,
    recipientText,
    reporterName,
    reporterTitle,
    reporterDepartment,
    internalNote,
    otherOpinion,
    entries,
  ]);

  const lastSavedSnapshotRef = useRef<string>("");

  const mapAssessmentFormToSaveCommand = useCallback((expectedLockVersion: number, data: typeof dataRef.current) => {
    return {
      expectedLockVersion,
      officialDocumentNumber: (data.officialDocumentNumber || "").trim(),
      documentPlace: (data.documentPlace || "").trim(),
      recipientText: (data.recipientText || "").trim(),
      reporterName: (data.reporterName || "").trim(),
      reporterTitle: (data.reporterTitle || "").trim(),
      reporterDepartment: (data.reporterDepartment || "").trim(),
      internalNote: data.internalNote || undefined,
      previousWeekRemediation: data.previousWeekRemediation || undefined,
      reinspectionConfirmation: data.reinspectionConfirmation || undefined,
      managementRecommendation: data.managementRecommendation || undefined,
      otherOpinion: data.otherOpinion || undefined,
      entries: (data.entries || []).map((e, index) => ({
        id: e.id && !e.id.startsWith("temp-") ? e.id : undefined,
        inspectionDate: e.inspectionDate,
        shift: e.shift,
        projectId: e.projectMode === "CUSTOM" ? null : e.projectId || null,
        customProjectName: e.projectMode === "CUSTOM" ? (e.customProjectName || "").trim() : null,
        inspectionContent: (e.inspectionContent || "").trim(),
        assessment: e.assessment ? e.assessment.trim() : "",
        recommendation: e.recommendation ? e.recommendation.trim() : "",
        implementationResult: e.implementationResult ? e.implementationResult.trim() : "",
        sortOrder: e.sortOrder ?? index,
      })),
    };
  }, []);

  const computeSnapshotString = useCallback((data: typeof dataRef.current) => {
    return JSON.stringify({
      docNo: (data.officialDocumentNumber || "").trim(),
      pl: (data.documentPlace || "").trim(),
      rec: (data.recipientText || "").trim(),
      rN: (data.reporterName || "").trim(),
      rT: (data.reporterTitle || "").trim(),
      rD: (data.reporterDepartment || "").trim(),
      note: (data.internalNote || "").trim(),
      secI1: (data.previousWeekRemediation || "").trim(),
      secI2: (data.reinspectionConfirmation || "").trim(),
      secII1: (data.managementRecommendation || "").trim(),
      secII2: (data.otherOpinion || "").trim(),
      entries: (data.entries || []).map((e) => ({
        d: e.inspectionDate,
        s: e.shift,
        p: e.projectMode === "CUSTOM" ? "" : e.projectId,
        c: e.projectMode === "CUSTOM" ? (e.customProjectName || "").trim() : "",
        i: (e.inspectionContent || "").trim(),
        a: (e.assessment || "").trim(),
        r: (e.recommendation || "").trim(),
        m: (e.implementationResult || "").trim(),
        o: e.sortOrder,
      })),
    });
  }, []);

  const saveDraft = useCallback(
    async (options?: { source?: "AUTOSAVE" | "MANUAL" | "KEYBOARD" | "RETRY"; refreshAfter?: boolean }) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      const currentSnap = computeSnapshotString(dataRef.current);
      if (currentSnap === lastSavedSnapshotRef.current && !failedRef.current && options?.source === "AUTOSAVE") {
        dirtyRef.current = false;
        setAutoSaveState("saved");
        return true;
      }

      if (isSavingRef.current || savePromiseRef.current) {
        queuedSaveRef.current = true;
        return savePromiseRef.current;
      }

      const executeSave = async (): Promise<boolean> => {
        try {
          isSavingRef.current = true;
          setAutoSaveState("saving");

          const currentData = dataRef.current;
          const snapBeforeSave = computeSnapshotString(currentData);
          const currentVer = lockVersionRef.current;

          const payload = mapAssessmentFormToSaveCommand(currentVer, currentData);
          const res = await saveSafetyAssessmentAction(report.id, payload);

          if (!res.ok) {
            failedRef.current = true;
            if (res.code === "VERSION_CONFLICT") {
              setAutoSaveState("conflict");
              setConflictDialogOpen(true);
            } else {
              setAutoSaveState("error");
            }
            return false;
          }

          lockVersionRef.current = res.lockVersion;
          setLockVersion(res.lockVersion);
          lastSavedSnapshotRef.current = snapBeforeSave;

          if (res.entries && res.entries.length > 0) {
            setEntries((prevEntries) => {
              let changed = false;
              const next = prevEntries.map((prev, idx) => {
                const matchedServer = res.entries[idx];
                if (matchedServer && prev.id !== matchedServer.id) {
                  changed = true;
                  return { ...prev, id: matchedServer.id };
                }
                return prev;
              });
              return changed ? next : prevEntries;
            });
          }

          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          setLastSavedAt(timeStr);
          failedRef.current = false;

          if (queuedSaveRef.current) {
            queuedSaveRef.current = false;
            const snapAfterSave = computeSnapshotString(dataRef.current);
            if (snapAfterSave !== lastSavedSnapshotRef.current) {
              setAutoSaveState("dirty");
              window.setTimeout(() => void saveDraft({ source: "AUTOSAVE" }), 0);
            } else {
              dirtyRef.current = false;
              setAutoSaveState("saved");
            }
          } else {
            dirtyRef.current = false;
            setAutoSaveState("saved");
          }

          if (options?.refreshAfter) router.refresh();
          return true;
        } catch (err: any) {
          failedRef.current = true;
          if (err.message?.includes("CONFLICT") || err.message?.includes("xung đột")) {
            setAutoSaveState("conflict");
            setConflictDialogOpen(true);
          } else {
            setAutoSaveState("error");
          }
          return false;
        } finally {
          isSavingRef.current = false;
          savePromiseRef.current = null;
        }
      };

      const p = executeSave();
      savePromiseRef.current = p;
      return p;
    },
    [report.id, computeSnapshotString, mapAssessmentFormToSaveCommand, router]
  );

  // Keyboard Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canEdit) saveDraft({ source: "KEYBOARD", refreshAfter: false });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, saveDraft]);

  // Debounced AutoSave (1000ms)
  const triggerAutoSave = useCallback(() => {
    if (!canEdit) return;
    dirtyRef.current = true;
    failedRef.current = false;
    setAutoSaveState("dirty");

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft({ source: "AUTOSAVE" });
    }, 1000);
  }, [canEdit, saveDraft]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastSavedSnapshotRef.current = computeSnapshotString(dataRef.current);
      return;
    }
    const currentSnap = computeSnapshotString(dataRef.current);
    if (currentSnap === lastSavedSnapshotRef.current) {
      dirtyRef.current = false;
      setAutoSaveState("saved");
      return;
    }
    triggerAutoSave();
  }, [
    officialDocumentNumber,
    documentPlace,
    recipientText,
    reporterName,
    reporterTitle,
    reporterDepartment,
    internalNote,
    previousWeekRemediation,
    reinspectionConfirmation,
    managementRecommendation,
    otherOpinion,
    entries,
    triggerAutoSave,
    computeSnapshotString,
  ]);

  // Handle Flush Before Preview
  const handlePreviewClick = async () => {
    if (dirtyRef.current || autoSaveState === "dirty" || computeSnapshotString(dataRef.current) !== lastSavedSnapshotRef.current) {
      await saveDraft({ source: "MANUAL" });
    }
    router.push(`/reports/safety/self-assessments/${report.id}/preview`);
  };

  // Handle Delete Report
  const handleDeleteReport = async () => {
    try {
      await deleteSafetyAssessmentAction(report.id);
      router.push("/reports/safety?tab=ASSESSMENT");
    } catch (err: any) {
      alert(err.message || "Không thể xóa Báo cáo.");
    }
  };

  // Import from Plan
  const handleImportPlan = async () => {
    if (!selectedSourcePlanId) return;
    try {
      setIsImportingPlan(true);
      const res = await importEntriesFromPlanAction(report.id, selectedSourcePlanId);
      setLockVersion(res.lockVersion);
      if (res.entries) {
        setEntries(
          res.entries.map((e: any, idx: number) => ({
            id: e.id,
            inspectionDate: formatIsoDateOnly(new Date(e.inspectionDate)),
            shift: e.shift || "MORNING",
            projectId: e.projectId,
            projectMode: e.customProjectName ? "CUSTOM" : "EXISTING",
            customProjectName: e.customProjectName || "",
            inspectionContent: normalizeNfc(e.inspectionContent || ""),
            assessment: normalizeNfc(e.assessment || ""),
            recommendation: normalizeNfc(e.recommendation || ""),
            implementationResult: normalizeNfc(e.implementationResult || ""),
            sortOrder: e.sortOrder ?? idx,
          }))
        );
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Không thể nạp lịch từ Kế hoạch.");
    } finally {
      setIsImportingPlan(false);
    }
  };

  // Entry Modification Handlers
  const handleToggleShift = useCallback((dateIso: string, shiftKey: string, checked: boolean) => {
    if (checked) {
      setActiveShifts((prev) => ({
        ...prev,
        [dateIso]: { ...prev[dateIso], [shiftKey]: true },
      }));
      setEntries((prev) => {
        const exists = prev.some((e) => e.inspectionDate === dateIso && e.shift === shiftKey);
        if (exists) return prev;
        return [
          ...prev,
          {
            id: `temp-${Date.now()}-${Math.random()}`,
            inspectionDate: dateIso,
            shift: shiftKey,
            projectId: projects[0]?.id || "",
            projectMode: "EXISTING",
            customProjectName: "",
            inspectionContent: "",
            assessment: "",
            recommendation: "",
            implementationResult: "",
            sortOrder: prev.length,
          },
        ];
      });
    } else {
      setEntries((prev) => {
        const existingEntries = prev.filter((e) => e.inspectionDate === dateIso && e.shift === shiftKey);
        if (existingEntries.length > 0) {
          setDeactivatingShiftInfo({ dateIso, shiftKey, count: existingEntries.length });
          return prev;
        }
        setActiveShifts((aPrev) => ({
          ...aPrev,
          [dateIso]: { ...aPrev[dateIso], [shiftKey]: false },
        }));
        return prev;
      });
    }
  }, [projects]);

  const confirmDeactivateShift = useCallback(() => {
    if (!deactivatingShiftInfo) return;
    const { dateIso, shiftKey } = deactivatingShiftInfo;
    setActiveShifts((prev) => ({
      ...prev,
      [dateIso]: { ...prev[dateIso], [shiftKey]: false },
    }));
    setEntries((prev) => prev.filter((e) => !(e.inspectionDate === dateIso && e.shift === shiftKey)));
    setDeactivatingShiftInfo(null);
  }, [deactivatingShiftInfo]);

  const handleAddRowForShift = useCallback((dateIso: string, shiftKey: string) => {
    setEntries((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random()}`,
        inspectionDate: dateIso,
        shift: shiftKey,
        projectId: projects[0]?.id || "",
        projectMode: "EXISTING",
        customProjectName: "",
        inspectionContent: "",
        assessment: "",
        recommendation: "",
        implementationResult: "",
        sortOrder: prev.length,
      },
    ]);
  }, [projects]);

  const handleDuplicateRow = useCallback((entryId: string) => {
    setEntries((prev) => {
      const target = prev.find((e) => e.id === entryId);
      if (!target) return prev;
      return [
        ...prev,
        {
          ...target,
          id: `temp-${Date.now()}-${Math.random()}`,
          sortOrder: prev.length,
        },
      ];
    });
  }, []);

  const handleDeleteRow = useCallback((entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  const handleUpdateEntryField = useCallback((id: string, field: string, value: any) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: normalizeNfc(value) } : e))
    );
  }, []);

  const handleApplyPickerContent = (selectedTexts: string[]) => {
    if (!pickerModalEntryId || selectedTexts.length === 0) return;
    const joined = selectedTexts.join("; ");
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== pickerModalEntryId) return e;
        const current = e.inspectionContent.trim();
        const nextContent = current ? `${current}; ${joined}` : joined;
        return { ...e, inspectionContent: normalizeNfc(nextContent) };
      })
    );
  };

  return (
    <div className="w-full space-y-5 pb-24 sm:pb-20 font-sans text-slate-900">
      {/* SIMPLIFIED EDITOR HEADER */}
      <SafetyEditorHeader
        documentNumber={report.documentNumber || null}
        title="Báo cáo tự đánh giá kết quả kiểm tra ATLĐ, PCCC, VSMT"
        periodLabel={periodLabel}
        autoSaveState={autoSaveState}
        lastSavedAt={lastSavedAt}
        canEdit={canEdit}
        onSave={() => saveDraft({ source: "MANUAL", refreshAfter: false })}
        onPreview={handlePreviewClick}
        onDelete={handleDeleteReport}
      />

      {/* SECTION 1: THÔNG TIN CHUNG HỒ SƠ */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-900">Thông tin chung (Mẫu 01)</h2>
          </div>
        </div>

        {/* 4 Balanced Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
          {/* Column 1: Số văn bản */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-bold">Số văn bản</label>
            <input
              type="text"
              disabled={!canEdit}
              value={officialDocumentNumber}
              onChange={(e) => setOfficialDocumentNumber(e.target.value)}
              placeholder="......./......."
              className="w-full h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>

          {/* Column 2: Địa điểm lập văn bản */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-bold">Địa điểm lập văn bản</label>
            <input
              type="text"
              disabled={!canEdit}
              value={documentPlace}
              onChange={(e) => setDocumentPlace(e.target.value)}
              placeholder="VD: Hà Nội"
              className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>

          {/* Column 3: Kính gửi */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-bold">Kính gửi</label>
            <input
              type="text"
              disabled={!canEdit}
              value={recipientText}
              onChange={(e) => setRecipientText(e.target.value)}
              placeholder="VD: Ban Giám đốc Công ty; Phòng kỹ thuật"
              className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>

          {/* Column 4: Người lập báo cáo */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-bold">Người lập báo cáo</label>
            <input
              type="text"
              disabled={!canEdit}
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="VD: Phạm Xuân Quảng"
              className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white font-bold text-slate-900"
            />
          </div>
        </div>

        {/* Secondary Info Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Chức vụ: </span>
            <input
              type="text"
              disabled={!canEdit}
              value={reporterTitle}
              onChange={(e) => setReporterTitle(e.target.value)}
              className="w-full mt-0.5 h-7 px-2 font-bold text-slate-900 rounded border border-slate-200 bg-white text-xs"
            />
          </div>
          <div>
            <span className="text-slate-500 font-medium">Đơn vị: </span>
            <input
              type="text"
              disabled={!canEdit}
              value={reporterDepartment}
              onChange={(e) => setReporterDepartment(e.target.value)}
              className="w-full mt-0.5 h-7 px-2 font-bold text-slate-900 rounded border border-slate-200 bg-white text-xs"
            />
          </div>
          <div>
            <span className="text-slate-500 font-medium">Kỳ báo cáo: </span>
            <div className="font-bold text-slate-900 mt-1.5">{periodLabel}</div>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Nạp lịch từ Kế hoạch:</span>
            <div className="flex gap-1.5 mt-0.5">
              <select
                disabled={!canEdit || plans.length === 0}
                value={selectedSourcePlanId}
                onChange={(e) => setSelectedSourcePlanId(e.target.value)}
                className="h-7 w-full rounded border border-slate-200 text-xs px-2 bg-white font-medium"
              >
                <option value="">-- Chọn Kế hoạch --</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.documentNumber || p.title}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canEdit || !selectedSourcePlanId || isImportingPlan}
                onClick={handleImportPlan}
                className="h-7 text-[11px] font-bold text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 shrink-0"
              >
                {isImportingPlan ? "Đang nạp..." : "Nạp lịch"}
              </Button>
            </div>
          </div>
        </div>

        {/* Ghi chú nội bộ */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ghi chú nội bộ (không hiển thị khi xuất bản in/Word/PDF):
          </label>
          <AutoTextarea
            disabled={!canEdit}
            value={internalNote}
            onChange={(val) => setInternalNote(normalizeNfc(val))}
            placeholder="Nhập ghi chú cho ban lãnh đạo hoặc đồng nghiệp..."
            minHeight={46}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>
      </div>

      {/* SECTION 2: NỘI DUNG KIỂM TRA (20 MỤC NGUYÊN VĂN MẪU 01) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-600" />
            <h2 className="font-bold text-sm text-slate-900">
              {SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE}
            </h2>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowFull20Items(!showFull20Items)}
            className="h-7 text-xs font-bold text-blue-600 hover:bg-blue-50 gap-1"
          >
            {showFull20Items ? "Thu gọn" : "Xem toàn bộ nội dung"}
            {showFull20Items ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {!showFull20Items ? (
          <p className="text-xs text-slate-600 leading-relaxed">
            Danh mục gồm 20 nội dung kiểm tra ATLĐ, PCCC, VSMT theo Mẫu 01.
          </p>
        ) : (
          <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5 text-xs leading-[1.65] text-slate-800 space-y-2.5">
            {SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT.map((item) => (
              <div key={item.number} className="text-slate-800 text-xs flex items-start gap-1.5">
                <span className="font-bold text-slate-900 shrink-0">{item.number}.</span>
                <span>{item.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: BẢNG BÁO CÁO KẾT QUẢ KIỂM TRA (5 CỘT CHUẨN MẪU 01) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Bảng kết quả kiểm tra theo ngày (5 Cột chuẩn Mẫu 01)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu trúc 7 ngày (Thứ 2 đến Chủ nhật). Từng buổi (Sáng/Chiều/Tối) có thể nhập nhiều công trình & đánh giá thực tế.
            </p>
          </div>
        </div>

        {/* 5-Column Continuous Table Container Matching Supervision Layout */}
        <div className="overflow-hidden bg-white">
          {/* Table Desktop Header */}
          <div className="hidden grid-cols-[15%_minmax(0,28fr)_minmax(0,21fr)_minmax(0,19fr)_minmax(0,17fr)_44px] bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 md:grid">
            <div className="p-3 border-r border-slate-200">NGÀY KIỂM TRA</div>
            <div className="p-3 border-r border-slate-200">CÔNG TRÌNH/NỘI DUNG KIỂM TRA</div>
            <div className="p-3 border-r border-slate-200">ĐÁNH GIÁ CÔNG TRÌNH</div>
            <div className="p-3 border-r border-slate-200">KIẾN NGHỊ YÊU CẦU</div>
            <div className="p-3 border-r border-slate-200">KẾT QUẢ THỰC HIỆN</div>
            <div className="shrink-0 w-[44px]"></div>
          </div>

          {/* Days Loop */}
          {weekDays.map((w) => {
            const dayEntries = entries.filter((e) => e.inspectionDate === w.dateIso);
            const dayShifts = activeShifts[w.dateIso] || { MORNING: false, AFTERNOON: false, EVENING: false };
            const activeShiftKeys = shiftsList.filter((s) => dayShifts[s.key as keyof typeof dayShifts]);

            return (
              <div key={w.dateIso} className="border-b border-slate-200 last:border-b-0 md:grid md:grid-cols-[15%_85%] md:items-start">
                {/* Col 1 (15%): Date Label & Vertical Shift Checkboxes */}
                <div className="bg-slate-50 md:border-r md:border-slate-200 md:bg-white p-3 space-y-2.5">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{w.dayName}</span>
                    <span className="text-[11px] text-slate-500 font-medium">{w.dateFormatted}</span>
                  </div>

                  {/* Vertical Shift Checkboxes */}
                  {canEdit && (
                    <div className="space-y-1.5 pt-1">
                      {shiftsList.map((s) => {
                        const isChecked = !!dayShifts[s.key as keyof typeof dayShifts];
                        return (
                          <label key={s.key} className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 select-none hover:text-blue-600">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleShift(w.dateIso, s.key, e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Buổi {s.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Col 2 (85%): Shift Groups & Entries */}
                <div className="min-h-[44px]">
                  {activeShiftKeys.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic min-h-[64px] flex items-center justify-center">
                      Chưa phát sinh kết quả kiểm tra trong ngày.
                    </div>
                  ) : (
                    activeShiftKeys.map((s) => {
                      const shiftEntries = dayEntries.filter((e) => e.shift === s.key);

                      return (
                        <div key={s.key} className="border-b border-slate-200 last:border-b-0">
                          {/* Group Sub-Header with full day/date context */}
                          <div className="bg-blue-50/70 px-3.5 py-1.5 text-xs font-bold text-blue-900 border-b border-slate-200 flex items-center justify-between">
                            <span>Buổi {s.label} — {w.dayName}, ngày {w.dateFormatted}</span>
                          </div>

                          {/* Rows */}
                          {shiftEntries.map((entry) => (
                            <AssessmentEntryRow
                              key={entry.id}
                              entry={entry}
                              canEdit={canEdit}
                              projects={projects}
                              onUpdateField={handleUpdateEntryField}
                              onDuplicate={handleDuplicateRow}
                              onDelete={handleDeleteRow}
                              onOpenPickerModal={(id) => setPickerModalEntryId(id)}
                            />
                          ))}

                          {/* Add Row Button */}
                          {canEdit && (
                            <div className="p-2 bg-slate-50/50 flex items-center gap-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleAddRowForShift(w.dateIso, s.key)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Thêm công trình kiểm tra trong buổi [{s.label}]</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: PHẦN I — ĐÁNH GIÁ KẾT QUẢ XỬ LÝ TỒN TẠI TUẦN TRƯỚC */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 uppercase">
            {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionITitle}
          </h2>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">
              1. Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng:
            </label>
            <AutoTextarea
              disabled={!canEdit}
              value={previousWeekRemediation}
              onChange={(val) => setPreviousWeekRemediation(normalizeNfc(val))}
              placeholder="Nhập nội dung theo dõi khắc phục..."
              minHeight={80}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
            />
            {previousWeekRemediation.length > 500 && (
              <div className="text-[11px] text-slate-500 text-right">
                Độ dài: {previousWeekRemediation.length.toLocaleString()} ký tự
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">
              2. Kiểm tra lại sau khắc phục và xác nhận đã hoàn thành:
            </label>
            <AutoTextarea
              disabled={!canEdit}
              value={reinspectionConfirmation}
              onChange={(val) => setReinspectionConfirmation(normalizeNfc(val))}
              placeholder="Nhập kết quả kiểm tra lại..."
              minHeight={80}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
            />
            {reinspectionConfirmation.length > 500 && (
              <div className="text-[11px] text-slate-500 text-right">
                Độ dài: {reinspectionConfirmation.length.toLocaleString()} ký tự
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 5: PHẦN II — KIẾN NGHỊ ĐỀ XUẤT BAN GIÁM ĐỐC */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 uppercase">
            {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionIITitle}
          </h2>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">
              1. Bổ sung nhân lực, thiết bị, thay thế đội ngũ yếu kém không đạt về kỹ mỹ thuật, ATLĐ, PCCC, VSMT:
            </label>
            <AutoTextarea
              disabled={!canEdit}
              value={managementRecommendation}
              onChange={(val) => setManagementRecommendation(normalizeNfc(val))}
              placeholder="Nhập kiến nghị đề xuất..."
              minHeight={80}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
            />
            {managementRecommendation.length > 500 && (
              <div className="text-[11px] text-slate-500 text-right">
                Độ dài: {managementRecommendation.length.toLocaleString()} ký tự
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800">
              2. Ý kiến khác:
            </label>
            <AutoTextarea
              disabled={!canEdit}
              value={otherOpinion}
              onChange={(val) => setOtherOpinion(normalizeNfc(val))}
              placeholder="Nhập ý kiến khác..."
              minHeight={80}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
            />
            {otherOpinion.length > 500 && (
              <div className="text-[11px] text-slate-500 text-right">
                Độ dài: {otherOpinion.length.toLocaleString()} ký tự
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 20 Standard Checklist Item Picker Modal */}
      <SafetyItemPickerModal
        isOpen={!!pickerModalEntryId}
        onClose={() => setPickerModalEntryId(null)}
        onSelectItems={handleApplyPickerContent}
      />

      {/* Version Conflict Modal */}
      {conflictDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-full bg-amber-50">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Xung đột phiên dữ liệu</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dữ liệu trên máy đã cũ hơn dữ liệu đang lưu trên hệ thống (do được chỉnh sửa bởi phiên làm việc khác). Vui lòng tải lại dữ liệu mới nhất trước khi tiếp tục.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConflictDialogOpen(false)}
                className="text-xs font-semibold"
              >
                Đóng
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConflictDialogOpen(false);
                  window.location.reload();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                Tải lại dữ liệu mới nhất
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Deactivation Confirmation Modal */}
      {deactivatingShiftInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận hủy buổi kiểm tra
            </div>
            <p className="text-xs text-slate-600">
              Buổi này đang có <strong className="text-slate-900">{deactivatingShiftInfo.count} dòng</strong> kết quả kiểm tra đã nhập. Việc bỏ chọn buổi sẽ xóa toàn bộ nội dung đã nhập trong buổi này. Bạn có chắc chắn muốn tiếp tục?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setDeactivatingShiftInfo(null)} className="h-8 text-xs font-bold">
                Hủy bỏ
              </Button>
              <Button size="sm" variant="destructive" onClick={confirmDeactivateShift} className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700">
                Đồng ý xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
