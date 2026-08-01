"use client";

import React, { useEffect, useRef, useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Info,
  Lock,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafetyEditorHeader, AutoSaveState } from "./safety-editor-header";
import { AutoTextarea } from "./auto-textarea";
import { SafetySuggestedContentModal } from "./suggested-content-modal";
import { SafetyRowActionMenu } from "./safety-row-action-menu";
import { SafetyProjectCombobox } from "./safety-project-combobox";
import {
  saveSafetyPlanAction,
  deleteSafetyPlanAction,
} from "@/app/(dashboard)/reports/safety/actions";
import {
  formatVnDate,
  formatVnPeriod,
  getWeekRange,
  formatIsoDateOnly,
  normalizeNfc,
} from "@/lib/safety-reporting/date-utils";
import { SAFETY_PLAN_OFFICIAL_CONTENT } from "@/lib/safety-reporting/safety-plan-official-content";

export interface SafetyPlanEditorProps {
  plan: any;
  projects: Array<{ id: string; name: string; code?: string }>;
  currentUser: { id: string; role: string; name: string };
  hideHeader?: boolean;
  embedded?: boolean;
  onRegisterSave?: (saveFn: () => Promise<boolean>) => void;
  onSaveStateChange?: (state: AutoSaveState, lastSavedAt?: string | null) => void;
}

const shiftsList = [
  { key: "MORNING", label: "Sáng" },
  { key: "AFTERNOON", label: "Chiều" },
  { key: "EVENING", label: "Tối" },
];

/* ── Memoized Row Component ── */
const ShiftEntryRow = React.memo(function ShiftEntryRow({
  entry,
  canEdit,
  projects,
  onUpdateField,
  onDuplicate,
  onDelete,
  onOpenSuggested,
}: {
  entry: any;
  canEdit: boolean;
  projects: Array<{ id: string; name: string; code?: string; location?: string }>;
  onUpdateField: (id: string, field: string, value: any) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenSuggested: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,33fr)_minmax(0,40fr)_minmax(0,27fr)_44px] border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50 transition-colors p-3 md:p-2.5 items-stretch">
      {/* Col 1: Project Selection */}
      <div className="md:border-r md:border-slate-200 md:pr-2.5 space-y-1.5 mb-2 md:mb-0 flex flex-col justify-start">
        <div className="h-6 flex items-center">
          <label className="text-[11px] font-semibold text-slate-500">Công trình kiểm tra:</label>
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
            placeholder="Nhập đầy đủ tên công trình..."
            minHeight={40}
            className="w-full rounded-lg border border-amber-300 bg-amber-50/30 p-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
          />
        )}
      </div>

      {/* Col 2: Inspection Content */}
      <div className="md:border-r md:border-slate-200 md:px-2.5 space-y-1.5 mb-2 md:mb-0 flex flex-col justify-start">
        <div className="h-6 flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-500">Nội dung kiểm tra, huấn luyện:</label>
          {canEdit && (
            <button
              type="button"
              onClick={() => onOpenSuggested(entry.id)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors ml-auto"
            >
              <Sparkles className="h-3 w-3 text-blue-500" />
              <span>Chọn mẫu</span>
            </button>
          )}
        </div>

        <AutoTextarea
          disabled={!canEdit}
          value={entry.inspectionContent}
          onChange={(val) => onUpdateField(entry.id, "inspectionContent", val)}
          placeholder="Nhập nội dung đi kiểm tra, huấn luyện an toàn..."
          minHeight={64}
          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
        />
      </div>

      {/* Col 3: Note / Changes */}
      <div className="md:border-r md:border-slate-200 md:px-2.5 space-y-1.5 mb-2 md:mb-0 flex flex-col justify-start">
        <div className="h-6 flex items-center">
          <label className="text-[11px] font-semibold text-slate-500">Phát sinh thay đổi:</label>
        </div>
        <AutoTextarea
          disabled={!canEdit}
          value={entry.note}
          onChange={(val) => onUpdateField(entry.id, "note", val)}
          placeholder="Ghi chú phát sinh (nếu có)..."
          minHeight={64}
          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
        />
      </div>

      {/* Col 4: Action Menu */}
      <div className="shrink-0 w-[44px] flex items-center justify-center pt-7">
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

export function SafetyPlanEditor({
  plan,
  projects,
  currentUser,
  hideHeader,
  embedded,
  onRegisterSave,
  onSaveStateChange,
}: SafetyPlanEditorProps) {
  const router = useRouter();

  const [internalNote, setInternalNote] = useState(plan.note || "");
  const [officialDocumentNumber, setOfficialDocumentNumber] = useState(plan.officialDocumentNumber || "");

  // Administrative metadata
  const recipientsRaw = plan.recipients as any;
  const [place, setPlace] = useState(() => {
    if (recipientsRaw && typeof recipientsRaw === "object" && !Array.isArray(recipientsRaw) && recipientsRaw.place) {
      return recipientsRaw.place;
    }
    return "Hà Nội";
  });
  const [recipientName, setRecipientName] = useState(() => {
    if (recipientsRaw && typeof recipientsRaw === "object" && !Array.isArray(recipientsRaw) && recipientsRaw.recipientName) {
      return recipientsRaw.recipientName;
    }
    return "Ban Giám đốc Công ty, Ban chỉ huy các công trình";
  });
  const [recipientTitle, setRecipientTitle] = useState(() => {
    if (recipientsRaw && typeof recipientsRaw === "object" && !Array.isArray(recipientsRaw) && recipientsRaw.recipientTitle) {
      return recipientsRaw.recipientTitle;
    }
    return "Phòng kỹ thuật, Các BCH công trường";
  });

  const [lockVersion, setLockVersion] = useState(plan.version || plan.lockVersion || 1);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Modals & Collapsibles
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [showFullMasterText, setShowFullMasterText] = useState(false);
  const [suggestedModalEntryId, setSuggestedModalEntryId] = useState<string | null>(null);

  // Undo Toast & Deactivation Confirmations
  const [undoToast, setUndoToast] = useState<{ entry: any; timer: any } | null>(null);
  const [deactivatingShiftInfo, setDeactivatingShiftInfo] = useState<{ dateIso: string; shiftKey: string; count: number } | null>(null);

  // All plans except CANCELLED can be edited and saved
  const canEdit = plan.status !== "CANCELLED";

  // Canonical Monday to Sunday week range
  const { weekStart, weekEnd } = useMemo(() => {
    return getWeekRange(plan.periodStart);
  }, [plan.periodStart]);

  const periodLabel = useMemo(() => formatVnPeriod(weekStart, weekEnd), [weekStart, weekEnd]);
  const authorName = plan.createdBy?.name || currentUser.name || "Cán bộ Safety";

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
        dateObj: d,
      };
    });
  }, [weekStart]);

  // Form Entries State
  const [entries, setEntries] = useState<any[]>(() => {
    const existing = plan.entries || [];
    return existing.map((e: any, idx: number) => ({
      id: e.id || `entry-${idx}`,
      isSaved: true,
      inspectionDate: formatIsoDateOnly(new Date(e.inspectionDate)),
      shift: e.shift || "MORNING",
      projectId: e.projectId,
      projectMode: e.location ? "CUSTOM" : "EXISTING",
      customProjectName: e.location || "",
      inspectionContent: normalizeNfc(e.inspectionContent || ""),
      note: normalizeNfc(e.note || ""),
      sortOrder: e.sortOrder ?? idx,
    }));
  });

  // Shift Checkboxes State
  const [activeShifts, setActiveShifts] = useState<Record<string, Record<string, boolean>>>(() => {
    const map: Record<string, Record<string, boolean>> = {};
    weekDays.forEach((w) => {
      map[w.dateIso] = { MORNING: false, AFTERNOON: false, EVENING: false };
    });
    (plan.entries || []).forEach((e: any) => {
      const dIso = formatIsoDateOnly(new Date(e.inspectionDate));
      if (!map[dIso]) map[dIso] = { MORNING: false, AFTERNOON: false, EVENING: false };
      if (e.shift) map[dIso][e.shift] = true;
    });
    return map;
  });

  // Unified Save Coordinator Refs
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

  // Keep latest state in ref to avoid stale closure issues in saveDraft
  const dataRef = useRef({
    officialDocumentNumber,
    place,
    recipientName,
    recipientTitle,
    internalNote,
    entries,
  });

  useEffect(() => {
    dataRef.current = {
      officialDocumentNumber,
      place,
      recipientName,
      recipientTitle,
      internalNote,
      entries,
    };
  }, [officialDocumentNumber, place, recipientName, recipientTitle, internalNote, entries]);

  const lastSavedSnapshotRef = useRef<string>("");

  const computeSnapshotString = useCallback((data: {
    officialDocumentNumber: string;
    place: string;
    recipientName: string;
    recipientTitle: string;
    internalNote: string;
    entries: any[];
  }) => {
    return JSON.stringify({
      docNo: (data.officialDocumentNumber || "").trim(),
      pl: (data.place || "").trim(),
      recN: (data.recipientName || "").trim(),
      recT: (data.recipientTitle || "").trim(),
      note: (data.internalNote || "").trim(),
      entries: (data.entries || []).map((e) => ({
        d: e.inspectionDate,
        s: e.shift,
        p: e.projectMode === "CUSTOM" ? "" : e.projectId,
        c: e.projectMode === "CUSTOM" ? (e.customProjectName || "").trim() : "",
        i: (e.inspectionContent || "").trim(),
        n: (e.note || "").trim(),
        o: e.sortOrder,
      })),
    });
  }, []);

  const serializeEntriesForSave = useCallback((rawEntries: any[]) => {
    const defaultProj = projects[0]?.id || "";
    return rawEntries.map((e) => {
      const isCustom = e.projectMode === "CUSTOM";
      return {
        id: e.id.startsWith("temp-") ? undefined : e.id,
        inspectionDate: e.inspectionDate,
        shift: e.shift,
        projectId: isCustom ? defaultProj : e.projectId || defaultProj,
        location: isCustom ? e.customProjectName.trim() : undefined,
        inspectionContent: e.inspectionContent.trim(),
        note: e.note ? e.note.trim() : undefined,
        sortOrder: e.sortOrder,
      };
    });
  }, [projects]);

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
          const payloadEntries = serializeEntriesForSave(currentData.entries);
          const currentVer = lockVersionRef.current;

          const res = await saveSafetyPlanAction(plan.id, {
            expectedLockVersion: currentVer,
            officialDocumentNumber: currentData.officialDocumentNumber.trim(),
            place: currentData.place.trim(),
            recipientName: currentData.recipientName.trim(),
            recipientTitle: currentData.recipientTitle.trim(),
            title: plan.title,
            note: currentData.internalNote,
            entries: payloadEntries,
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
                  return {
                    ...prev,
                    id: matchedServer.id,
                    isSaved: true,
                  };
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

          if (options?.refreshAfter) {
            router.refresh();
          }
          return true;
        } catch (err: any) {
          failedRef.current = true;
          if (err.message?.includes("CONFLICT") || err.message?.includes("xung đột")) {
            setAutoSaveState("conflict");
            setConflictDialogOpen(true);
          } else {
            setAutoSaveState("error");
            if (options?.source === "MANUAL" || options?.source === "KEYBOARD") {
              alert(err.message || "Lỗi lưu Kế hoạch.");
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
    [plan.id, plan.title, computeSnapshotString, serializeEntriesForSave, router]
  );

  // Notify parent workspace of save state
  useEffect(() => {
    onSaveStateChange?.(autoSaveState, lastSavedAt);
  }, [autoSaveState, lastSavedAt, onSaveStateChange]);

  useEffect(() => {
    onRegisterSave?.(() => saveDraft({ source: "MANUAL", refreshAfter: false }));
  }, [onRegisterSave, saveDraft]);

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

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

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
  }, [officialDocumentNumber, place, recipientName, recipientTitle, internalNote, entries, triggerAutoSave, computeSnapshotString]);

  // Handle Flush Before Preview Navigation
  const handlePreviewClick = async () => {
    if (dirtyRef.current || autoSaveState === "dirty" || computeSnapshotString(dataRef.current) !== lastSavedSnapshotRef.current) {
      await saveDraft({ source: "MANUAL" });
    }
    router.push(`/reports/safety/plans/${plan.id}/preview`);
  };

  // Handle Delete Plan
  const handleDeletePlan = async () => {
    try {
      await deleteSafetyPlanAction(plan.id);
      router.push("/reports/safety?tab=PLAN");
    } catch (err: any) {
      alert(err.message || "Không thể xóa kế hoạch.");
    }
  };

  // Toggle Shift Checkbox
  const handleToggleShift = useCallback((dateIso: string, shiftKey: string, checked: boolean) => {
    if (checked) {
      setActiveShifts((prev) => ({
        ...prev,
        [dateIso]: { ...prev[dateIso], [shiftKey]: true },
      }));
      setEntries((prev) => {
        const exists = prev.some((e) => e.inspectionDate === dateIso && e.shift === shiftKey);
        if (exists) return prev;
        const newEntry = {
          id: `temp-${Date.now()}-${Math.random()}`,
          isSaved: false,
          inspectionDate: dateIso,
          shift: shiftKey,
          projectId: projects[0]?.id || "",
          projectMode: "EXISTING",
          customProjectName: "",
          inspectionContent: "",
          note: "",
          sortOrder: prev.length,
        };
        return [...prev, newEntry];
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
        isSaved: false,
        inspectionDate: dateIso,
        shift: shiftKey,
        projectId: projects[0]?.id || "",
        projectMode: "EXISTING",
        customProjectName: "",
        inspectionContent: "",
        note: "",
        sortOrder: prev.length,
      },
    ]);
  }, [projects]);

  const handleDuplicateRow = useCallback((entryId: string) => {
    setEntries((prev) => {
      const target = prev.find((e) => e.id === entryId);
      if (!target) return prev;
      const duplicated = {
        ...target,
        id: `temp-${Date.now()}-${Math.random()}`,
        isSaved: false,
        sortOrder: prev.length,
      };
      return [...prev, duplicated];
    });
  }, []);

  const handleDeleteRow = useCallback((entryId: string) => {
    setEntries((prev) => {
      const target = prev.find((e) => e.id === entryId);
      if (!target) return prev;
      if (canEdit) {
        setUndoToast((currentUndo) => {
          if (currentUndo?.timer) clearTimeout(currentUndo.timer);
          const timer = setTimeout(() => {
            setUndoToast(null);
          }, 5000);
          return { entry: target, timer };
        });
      }
      return prev.filter((e) => e.id !== entryId);
    });
  }, [canEdit]);

  const handleUndoDelete = useCallback(() => {
    if (!undoToast) return;
    if (undoToast.timer) clearTimeout(undoToast.timer);
    setEntries((prev) => [...prev, undoToast.entry]);
    setUndoToast(null);
  }, [undoToast]);

  const handleUpdateEntryField = useCallback((id: string, field: string, value: any) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: normalizeNfc(value) } : e))
    );
  }, []);

  const handleOpenSuggestedModal = useCallback((id: string) => {
    setSuggestedModalEntryId(id);
  }, []);

  const handleApplySuggestedContent = (selectedTexts: string[]) => {
    if (!suggestedModalEntryId || selectedTexts.length === 0) return;
    const joined = selectedTexts.join("; ");
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== suggestedModalEntryId) return e;
        const current = e.inspectionContent.trim();
        const nextContent = current ? `${current}; ${joined}` : joined;
        return { ...e, inspectionContent: normalizeNfc(nextContent) };
      })
    );
  };

  return (
    <div className="w-full space-y-5 pb-24 sm:pb-20 font-sans text-slate-900">
      {/* SIMPLIFIED EDITOR HEADER */}
      {!hideHeader && (
        <SafetyEditorHeader
          documentNumber={plan.documentNumber || null}
          title="Kế hoạch kiểm tra ATLĐ, PCCC, VSMT công trình"
          periodLabel={periodLabel}
          autoSaveState={autoSaveState}
          lastSavedAt={lastSavedAt}
          canEdit={canEdit}
          onSave={() => saveDraft({ source: "MANUAL", refreshAfter: false })}
          onPreview={handlePreviewClick}
          onDelete={handleDeletePlan}
        />
      )}

      {/* SUB METADATA BAR FOR EMBEDDED MODE */}
      {(hideHeader || embedded) && (
        <div className="flex items-center justify-between bg-slate-100/70 border border-slate-200/80 rounded-xl px-4 py-2 text-xs mb-3">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <CalendarCheck className="h-4 w-4 text-blue-600" />
            <span>Kế hoạch kiểm tra</span>
            {(officialDocumentNumber || plan.documentNumber) && (
              <span className="font-mono text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                {officialDocumentNumber || plan.documentNumber}
              </span>
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: THÔNG TIN KẾ HOẠCH */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-900">Thông tin kế hoạch</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Thông tin hành chính của Kế hoạch kiểm tra ATLĐ, PCCC, VSMT.
            </p>
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
              value={place}
              onChange={(e) => setPlace(e.target.value)}
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
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="VD: Ban Giám đốc Công ty, Ban chỉ huy các công trình"
              className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>

          {/* Column 4: Đơn vị/Chức vụ nhận */}
          <div className="space-y-1">
            <label className="block text-slate-700 font-bold">Đơn vị/Chức vụ nhận</label>
            <input
              type="text"
              disabled={!canEdit}
              value={recipientTitle}
              onChange={(e) => setRecipientTitle(e.target.value)}
              placeholder="VD: Phòng kỹ thuật, Các BCH công trường"
              className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Dải thông tin phía dưới */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Từ ngày: </span>
            <span className="font-bold text-slate-900">{formatVnDate(weekStart)}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Đến ngày: </span>
            <span className="font-bold text-slate-900">{formatVnDate(weekEnd)}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Người lập kế hoạch: </span>
            <span className="font-bold text-slate-900">{authorName}</span>
          </div>
        </div>

        {/* Ghi chú nội bộ */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ghi chú nội bộ:
          </label>
          <AutoTextarea
            disabled={!canEdit}
            value={internalNote}
            onChange={(val) => setInternalNote(normalizeNfc(val))}
            placeholder="Nhập ghi chú cho ban lãnh đạo hoặc đồng nghiệp..."
            minHeight={52}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>
      </div>

      {/* SECTION 2: NỘI DUNG CỐ ĐỊNH THEO MẪU CÔNG TY */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-600" />
            <h2 className="font-bold text-sm text-slate-900">Nội dung kiểm tra chuẩn theo quy định Công ty</h2>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowFullMasterText(!showFullMasterText)}
            className="h-7 text-xs font-bold text-blue-600 hover:bg-blue-50 gap-1"
          >
            {showFullMasterText ? "Thu gọn" : "Xem toàn bộ nội dung mẫu"}
            {showFullMasterText ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Kế hoạch kiểm tra tự động áp dụng 100% mục đích, căn cứ pháp lý và nội dung kiểm tra tiêu chuẩn (PCCC, VSMT, Điện thi công, Giàn giáo, Thiết bị nghiêm ngặt...). Cán bộ chỉ cần chọn công trình và nhập nội dung cụ thể bên dưới.
        </p>

        {showFullMasterText && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs space-y-3 leading-relaxed text-slate-800">
            <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 text-xs uppercase">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionI.title}</div>
            <p>{SAFETY_PLAN_OFFICIAL_CONTENT.sectionI.content}</p>

            <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 pt-2 text-xs uppercase">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.title}</div>
            <div className="space-y-1">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part1.title}</div>
              <ul className="pl-4 list-disc space-y-0.5 text-slate-700">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part1.items.map((item, i) => (
                  <li key={i} className={item.startsWith("  +") ? "pl-4 list-none" : ""}>{item.trim()}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1 pt-1">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part2.title}</div>
              <ul className="pl-4 list-disc space-y-0.5 text-slate-700">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part2.items.map((item, i) => (
                  <li key={i} className={item.startsWith("  +") ? "pl-4 list-none" : ""}>{item.trim()}</li>
                ))}
              </ul>
            </div>

            <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 pt-2 text-xs uppercase">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.title}</div>
            <div className="space-y-1">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part1.title}</div>
              <ul className="pl-4 list-disc space-y-0.5 text-slate-700">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part1.items.map((item, i) => (
                  <li key={i} className={item.startsWith("  +") ? "pl-4 list-none" : ""}>{item.trim()}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1 pt-1">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part2.title}</div>
              <ul className="pl-4 list-disc space-y-0.5 text-slate-700">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part2.items.map((item, i) => (
                  <li key={i} className={item.startsWith("  +") ? "pl-4 list-none" : ""}>{item.trim()}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1 pt-1">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part3.title}</div>
              <div className="pl-4 space-y-0.5 text-slate-700">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part3.items.map((item, i) => (
                  <div key={i}>{item}</div>
                ))}
              </div>
            </div>
            <div className="space-y-1 pt-1">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part4.title}</div>
              <div className="pl-4 space-y-0.5 text-slate-700">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part4.items.map((item, i) => (
                  <div key={i}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: LỊCH KIỂM TRA CHI TIẾT */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-900">Báo cáo kế hoạch kiểm tra chi tiết theo ngày</h2>
          </div>
        </div>

        {/* 5-Column Table Container Matching Supervision Layout */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Table Desktop Header */}
          <div className="hidden grid-cols-[16%_minmax(0,28fr)_minmax(0,34fr)_minmax(0,22fr)_44px] bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 md:grid">
            <div className="p-3 border-r border-slate-200">THỜI GIAN KIỂM TRA</div>
            <div className="p-3 border-r border-slate-200">CÔNG TRÌNH KIỂM TRA</div>
            <div className="p-3 border-r border-slate-200">NỘI DUNG KIỂM TRA, HUẤN LUYỆN</div>
            <div className="p-3 border-r border-slate-200">PHÁT SINH THAY ĐỔI</div>
            <div className="shrink-0 w-[44px]"></div>
          </div>

          {/* Days Loop */}
          {weekDays.map((w) => {
            const dayEntries = entries.filter((e) => e.inspectionDate === w.dateIso);
            const dayShifts = activeShifts[w.dateIso] || { MORNING: false, AFTERNOON: false, EVENING: false };
            const activeShiftKeys = shiftsList.filter((s) => dayShifts[s.key]);

            return (
              <div key={w.dateIso} className="border-b border-slate-200 last:border-b-0 md:grid md:grid-cols-[16%_84%] md:items-start">
                {/* Col 1 (16%): Date Label & Vertical Shift Checkboxes */}
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
                            <span>{s.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Col 2 (84%): Shift Groups & Entries */}
                <div className="min-h-[44px]">
                  {activeShiftKeys.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic min-h-[64px] flex items-center justify-center">
                      Chưa phát sinh kế hoạch kiểm tra trong ngày.
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
                            <ShiftEntryRow
                              key={entry.id}
                              entry={entry}
                              canEdit={canEdit}
                              projects={projects}
                              onUpdateField={handleUpdateEntryField}
                              onDuplicate={handleDuplicateRow}
                              onDelete={handleDeleteRow}
                              onOpenSuggested={handleOpenSuggestedModal}
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

      {/* Undo Toast */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-5">
          <span className="text-xs font-medium">Đã xóa 1 dòng lịch kiểm tra.</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Hoàn tác
          </button>
        </div>
      )}

      {/* Suggested Content Modal */}
      {suggestedModalEntryId && (
        <SafetySuggestedContentModal
          isOpen={true}
          onClose={() => setSuggestedModalEntryId(null)}
          onSelectItems={handleApplySuggestedContent}
        />
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
              Buổi này đang có <strong className="text-slate-900">{deactivatingShiftInfo.count} dòng</strong> lịch kiểm tra đã nhập. Việc bỏ chọn buổi sẽ xóa toàn bộ nội dung đã nhập trong buổi này. Bạn có chắc chắn muốn tiếp tục?
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
