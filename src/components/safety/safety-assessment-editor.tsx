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
} from "@/lib/safety-reporting/date-utils";
import { SAFETY_ASSESSMENT_OFFICIAL_CONTENT } from "@/lib/safety-reporting/safety-assessment-official-content";

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
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,25fr)_minmax(0,22fr)_minmax(0,22fr)_minmax(0,21fr)_44px] border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50 transition-colors p-3 xl:p-2.5 items-stretch gap-3 xl:gap-0 font-sans">
      {/* Col 1: Công trình & Nội dung kiểm tra */}
      <div className="xl:border-r xl:border-slate-200 xl:pr-2.5 space-y-2 flex flex-col justify-start">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-700">1. Công trình & Nội dung:</label>
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
          placeholder="Nhập nội dung đi kiểm tra..."
          minHeight={60}
          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
        />
      </div>

      {/* Col 2: Đánh giá công trình */}
      <div className="xl:border-r xl:border-slate-200 xl:px-2.5 space-y-1.5 flex flex-col justify-start">
        <label className="text-[11px] font-bold text-slate-700">2. Đánh giá công trình:</label>
        <AutoTextarea
          disabled={!canEdit}
          value={entry.assessment || ""}
          onChange={(val) => onUpdateField(entry.id, "assessment", val)}
          placeholder="Nhập kết quả đánh giá thực tế..."
          minHeight={90}
          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
        />
      </div>

      {/* Col 3: Kiến nghị yêu cầu */}
      <div className="xl:border-r xl:border-slate-200 xl:px-2.5 space-y-1.5 flex flex-col justify-start">
        <label className="text-[11px] font-bold text-slate-700">3. Kiến nghị yêu cầu:</label>
        <AutoTextarea
          disabled={!canEdit}
          value={entry.recommendation || ""}
          onChange={(val) => onUpdateField(entry.id, "recommendation", val)}
          placeholder="Ghi nhận kiến nghị, yêu cầu khắc phục..."
          minHeight={90}
          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
        />
      </div>

      {/* Col 4: Kết quả thực hiện */}
      <div className="xl:border-r xl:border-slate-200 xl:px-2.5 space-y-1.5 flex flex-col justify-start">
        <label className="text-[11px] font-bold text-slate-700">4. Kết quả thực hiện:</label>
        <AutoTextarea
          disabled={!canEdit}
          value={entry.implementationResult || ""}
          onChange={(val) => onUpdateField(entry.id, "implementationResult", val)}
          placeholder="Xác nhận kết quả xử lý..."
          minHeight={90}
          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
        />
      </div>

      {/* Col 5: Actions */}
      <div className="shrink-0 w-[44px] flex items-center justify-center pt-6 xl:pt-7">
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
  const [previousWeekRemediation, setPreviousWeekRemediation] = useState(report.previousWeekRemediation || "");
  const [reinspectionConfirmation, setReinspectionConfirmation] = useState(report.reinspectionConfirmation || "");
  const [managementRecommendation, setManagementRecommendation] = useState(report.managementRecommendation || report.managementResourceRecommendation || "");
  const [otherOpinion, setOtherOpinion] = useState(report.otherOpinion || report.otherRecommendation || "");

  const [lockVersion, setLockVersion] = useState(report.version || 1);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Modals
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [showFull20Items, setShowFull20Items] = useState(false);
  const [pickerModalEntryId, setPickerModalEntryId] = useState<string | null>(null);
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
    previousWeekRemediation,
    reinspectionConfirmation,
    managementRecommendation,
    otherOpinion,
    entries,
  ]);

  const lastSavedSnapshotRef = useRef<string>("");

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

      const executeSave = async () => {
        try {
          isSavingRef.current = true;
          setAutoSaveState("saving");

          const currentData = dataRef.current;
          const snapBeforeSave = computeSnapshotString(currentData);
          const currentVer = lockVersionRef.current;

          const res = await saveSafetyAssessmentAction(report.id, {
            expectedLockVersion: currentVer,
            officialDocumentNumber: currentData.officialDocumentNumber.trim(),
            documentPlace: currentData.documentPlace.trim(),
            recipientText: currentData.recipientText.trim(),
            reporterName: currentData.reporterName.trim(),
            reporterTitle: currentData.reporterTitle.trim(),
            reporterDepartment: currentData.reporterDepartment.trim(),
            internalNote: currentData.internalNote,
            previousWeekRemediation: currentData.previousWeekRemediation,
            reinspectionConfirmation: currentData.reinspectionConfirmation,
            managementRecommendation: currentData.managementRecommendation,
            otherOpinion: currentData.otherOpinion,
            entries: currentData.entries.map((e) => ({
              id: e.id.startsWith("temp-") ? undefined : e.id,
              inspectionDate: e.inspectionDate,
              shift: e.shift,
              projectId: e.projectMode === "CUSTOM" ? null : e.projectId || null,
              customProjectName: e.projectMode === "CUSTOM" ? e.customProjectName.trim() : null,
              inspectionContent: e.inspectionContent.trim(),
              assessment: e.assessment ? e.assessment.trim() : "",
              recommendation: e.recommendation ? e.recommendation.trim() : "",
              implementationResult: e.implementationResult ? e.implementationResult.trim() : "",
              sortOrder: e.sortOrder,
            })),
          });

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
            if (options?.source === "MANUAL" || options?.source === "KEYBOARD") {
              alert(err.message || "Lỗi lưu Báo cáo.");
            }
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
    [report.id, computeSnapshotString, router]
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

  // Debounced AutoSave (900ms)
  const triggerAutoSave = useCallback(() => {
    if (!canEdit) return;
    dirtyRef.current = true;
    failedRef.current = false;
    setAutoSaveState("dirty");

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft({ source: "AUTOSAVE" });
    }, 900);
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
      setActiveShifts((prev) => ({
        ...prev,
        [dateIso]: { ...prev[dateIso], [shiftKey]: false },
      }));
      setEntries((prev) => prev.filter((e) => !(e.inspectionDate === dateIso && e.shift === shiftKey)));
    }
  }, [projects]);

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

      {/* SECTION 2: DANH MỤC 20 MỤC KIỂM TRA CHUẨN */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-600" />
            <h2 className="font-bold text-sm text-slate-900">
              Danh mục 20 nội dung kiểm tra tiêu chuẩn (Mẫu 01)
            </h2>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowFull20Items(!showFull20Items)}
            className="h-7 text-xs font-bold text-blue-600 hover:bg-blue-50 gap-1"
          >
            {showFull20Items ? "Thu gọn" : "Xem 20 mục tiêu chuẩn"}
            {showFull20Items ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {showFull20Items && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs space-y-2 leading-relaxed text-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.standard20Items.map((item, i) => (
                <div key={i} className="p-1.5 bg-white rounded border border-slate-200 font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: BẢNG BÁO CÁO KẾT QUẢ KIỂM TRA (5 CỘT) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

        <div className="divide-y divide-slate-200">
          {weekDays.map((day) => {
            return (
              <div key={day.dateIso} className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-sm text-slate-900">{day.dayName}</span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {day.dateFormatted}
                  </span>
                </div>

                {/* Shift Checkboxes & Rows */}
                <div className="space-y-4">
                  {shiftsList.map((shiftObj) => {
                    const shiftKey = shiftObj.key;
                    const shiftLabel = shiftObj.label;
                    const isChecked = !!activeShifts[day.dateIso]?.[shiftKey];
                    const shiftEntries = entries.filter(
                      (e) => e.inspectionDate === day.dateIso && e.shift === shiftKey
                    );

                    return (
                      <div key={shiftKey} className="rounded-xl border border-slate-200/80 bg-slate-50/30 overflow-hidden">
                        <div className="bg-slate-100/70 px-3.5 py-2 flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                            <input
                              type="checkbox"
                              disabled={!canEdit}
                              checked={isChecked}
                              onChange={(e) => handleToggleShift(day.dateIso, shiftKey, e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Buổi {shiftLabel}</span>
                          </label>

                          {canEdit && isChecked && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAddRowForShift(day.dateIso, shiftKey)}
                              className="h-6 text-[11px] font-bold text-blue-600 hover:bg-blue-100 px-2 gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Thêm dòng</span>
                            </Button>
                          )}
                        </div>

                        {isChecked && (
                          <div className="bg-white">
                            {shiftEntries.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 italic text-center">
                                Chưa có nội dung kiểm tra cho Buổi {shiftLabel}. Bấm "Thêm dòng" để nhập thông tin.
                              </div>
                            ) : (
                              shiftEntries.map((entry) => (
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
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: PHẦN I — ĐÁNH GIÁ KẾT QUẢ XỬ LÝ TỒN TẠI TUẦN TRƯỚC */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-2">
          <h2 className="font-bold text-sm text-slate-900 uppercase">
            {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionITitle}
          </h2>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              1. Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng:
            </label>
            <AutoTextarea
              disabled={!canEdit}
              value={previousWeekRemediation}
              onChange={(val) => setPreviousWeekRemediation(normalizeNfc(val))}
              placeholder="Nhập tiến độ và tình hình khắc phục các tồn tại của tuần trước..."
              minHeight={64}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              2. Kiểm tra lại sau khắc phục và xác nhận đã hoàn thành:
            </label>
            <AutoTextarea
              disabled={!canEdit}
              value={reinspectionConfirmation}
              onChange={(val) => setReinspectionConfirmation(normalizeNfc(val))}
              placeholder="Xác nhận kết quả tái kiểm tra đối với các mục đã yêu cầu sửa đổi..."
              minHeight={64}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* SECTION 5: PHẦN II — KIẾN NGHỊ ĐỀ XUẤT BAN GIÁM ĐỐC */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-2">
          <h2 className="font-bold text-sm text-slate-900 uppercase">
            {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionIITitle}
          </h2>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              1. Bổ sung nhân lực, thiết bị, thay thế đội ngũ yếu kém không đạt về kỹ mỹ thuật, ATLĐ, PCCC, VSMT:
            </label>
            <AutoTextarea
              disabled={!canEdit}
              value={managementRecommendation}
              onChange={(val) => setManagementRecommendation(normalizeNfc(val))}
              placeholder="Ghi rõ yêu cầu kiến nghị Ban Giám đốc về nhân sự, thiết bị..."
              minHeight={64}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              2. Ý kiến khác:
            </label>
            <AutoTextarea
              disabled={!canEdit}
              value={otherOpinion}
              onChange={(val) => setOtherOpinion(normalizeNfc(val))}
              placeholder="Nhập các đề xuất, ý kiến bổ sung khác..."
              minHeight={64}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* 20 Standard Checklist Item Picker Modal */}
      <SafetyItemPickerModal
        isOpen={!!pickerModalEntryId}
        onClose={() => setPickerModalEntryId(null)}
        onSelectItems={handleApplyPickerContent}
      />
    </div>
  );
}
