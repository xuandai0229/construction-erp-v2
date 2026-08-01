"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  ChevronDown,
  Eye,
  FileSpreadsheet,
  MoreVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaveIndicator, type AutoSaveState } from "./safety-editor-header";
import { SafetyPlanEditor } from "./safety-plan-editor";
import { SafetyAssessmentEditor } from "./safety-assessment-editor";
import { UnifiedActionMenu, ActionMenuItem } from "@/components/ui/unified-action-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createSafetyPlanAction,
  createSafetyAssessmentAction,
  deleteSafetyWeeklyFileAction,
} from "@/app/(dashboard)/reports/safety/actions";
import { formatVnPeriod, getWeekRange } from "@/lib/safety-reporting/date-utils";

export function SafetyWeeklyFileWorkspace({
  weeklyFileDetail,
  projects,
  currentUser,
  initialTab = "PLAN",
}: {
  weeklyFileDetail: any;
  projects: Array<{ id: string; name: string; code?: string }>;
  currentUser: { id: string; role: string; name: string };
  initialTab?: "PLAN" | "ASSESSMENT";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"PLAN" | "ASSESSMENT">(() => {
    const paramTab = searchParams.get("tab")?.toUpperCase();
    if (paramTab === "ASSESSMENT" || paramTab === "REPORT") return "ASSESSMENT";
    return initialTab;
  });

  const [pending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Save states for active child editors
  const [planSaveState, setPlanSaveState] = useState<AutoSaveState>("saved");
  const [planLastSavedAt, setPlanLastSavedAt] = useState<string | null>(null);

  const [assessmentSaveState, setAssessmentSaveState] = useState<AutoSaveState>("saved");
  const [assessmentLastSavedAt, setAssessmentLastSavedAt] = useState<string | null>(null);

  const planSaveFnRef = useRef<(() => Promise<boolean>) | null>(null);
  const assessmentSaveFnRef = useRef<(() => Promise<boolean>) | null>(null);
  const [isManualSaving, setIsManualSaving] = useState(false);

  const { planData, assessmentData, periodStart } = weeklyFileDetail;
  const { weekStart, weekEnd } = getWeekRange(periodStart);
  const periodLabel = formatVnPeriod(weekStart, weekEnd);

  const docNumber =
    planData?.officialDocumentNumber ||
    planData?.documentNumber ||
    assessmentData?.officialDocumentNumber ||
    assessmentData?.documentNumber ||
    "Hồ sơ tuần";

  const currentSaveState = activeTab === "PLAN" ? planSaveState : assessmentSaveState;
  const currentLastSavedAt = activeTab === "PLAN" ? planLastSavedAt : assessmentLastSavedAt;

  // Handle Tab Switch (flushes pending save before switching)
  const handleTabChange = async (tab: "PLAN" | "ASSESSMENT") => {
    if (tab === activeTab) return;

    if (activeTab === "PLAN" && planSaveFnRef.current) {
      await planSaveFnRef.current();
    } else if (activeTab === "ASSESSMENT" && assessmentSaveFnRef.current) {
      await assessmentSaveFnRef.current();
    }

    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab.toLowerCase());
    router.replace(`/reports/safety/weekly-files/${weeklyFileDetail.weeklyFileId}?${params.toString()}`, {
      scroll: false,
    });
  };

  // Keyboard navigation for Tabs (Left / Right arrows)
  const handleTabKeyDown = (e: React.KeyboardEvent, current: "PLAN" | "ASSESSMENT") => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const target = current === "PLAN" ? "ASSESSMENT" : "PLAN";
      handleTabChange(target);
    }
  };

  // Global Workspace Manual Save (and Ctrl+S)
  const handleWorkspaceSave = async () => {
    setIsManualSaving(true);
    try {
      if (activeTab === "PLAN" && planSaveFnRef.current) {
        await planSaveFnRef.current();
      } else if (activeTab === "ASSESSMENT" && assessmentSaveFnRef.current) {
        await assessmentSaveFnRef.current();
      }
    } finally {
      setIsManualSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S at workspace level
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleWorkspaceSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  const handleCreatePlan = () => {
    startTransition(async () => {
      try {
        const dateStr = new Date(periodStart).toISOString().split("T")[0];
        await createSafetyPlanAction(dateStr);
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Không thể tạo kế hoạch.");
      }
    });
  };

  const handleCreateAssessment = () => {
    startTransition(async () => {
      try {
        const dateStr = new Date(periodStart).toISOString().split("T")[0];
        await createSafetyAssessmentAction(dateStr);
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Không thể tạo báo cáo.");
      }
    });
  };

  const handleDeleteWeeklyFile = async () => {
    try {
      await deleteSafetyWeeklyFileAction(weeklyFileDetail.weeklyFileId);
      router.push("/reports/safety");
    } catch (err: any) {
      alert(err.message || "Không thể xóa hồ sơ tuần.");
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 font-sans text-slate-900">
      {/* SINGLE UNIFIED WORKSPACE HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        {/* Top Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Link href="/reports" className="hover:text-blue-600 transition-colors">
            Báo cáo
          </Link>
          <span>/</span>
          <Link href="/reports/safety" className="hover:text-blue-600 transition-colors">
            Hồ sơ An toàn lao động
          </Link>
        </div>

        {/* Main Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/reports/safety"
              className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>

            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                  Hồ sơ ATLĐ tuần {periodLabel}
                </h1>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                  {docNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Single Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* AutoSave Indicator */}
            <div className="mr-1">
              <SaveIndicator state={currentSaveState} lastSavedAt={currentLastSavedAt} />
            </div>

            {/* Unified Preview Action Menu */}
            <UnifiedActionMenu
              align="end"
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  data-preview-trigger
                  className="h-9 px-3 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl"
                >
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span>Xem trước</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              }
            >
              {planData ? (
                <ActionMenuItem
                  data-preview-plan
                  onClick={() => router.push(`/reports/safety/plans/${planData.id}/preview`)}
                  icon={<CalendarCheck className="h-4 w-4 text-blue-600" />}
                >
                  Kế hoạch kiểm tra
                </ActionMenuItem>
              ) : (
                <div className="px-3 py-2 text-xs text-slate-400 italic">Kế hoạch chưa tạo</div>
              )}

              {assessmentData ? (
                <ActionMenuItem
                  data-preview-assessment
                  onClick={() => router.push(`/reports/safety/self-assessments/${assessmentData.id}/preview`)}
                  icon={<FileSpreadsheet className="h-4 w-4 text-amber-600" />}
                >
                  Báo cáo tự đánh giá
                </ActionMenuItem>
              ) : (
                <div className="px-3 py-2 text-xs text-slate-400 italic border-t border-slate-100">
                  Báo cáo tự đánh giá chưa tạo
                </div>
              )}
            </UnifiedActionMenu>

            {/* Single Save Button */}
            <Button
              size="sm"
              onClick={handleWorkspaceSave}
              disabled={isManualSaving || currentSaveState === "saving"}
              className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>{isManualSaving ? "Đang lưu…" : "Lưu"}</span>
            </Button>

            {/* 3-Dots Action Menu */}
            <UnifiedActionMenu
              align="end"
              trigger={
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Thao tác hồ sơ"
                  data-weekly-file-action-trigger
                  className="h-9 w-9 p-0 text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              }
            >
              <ActionMenuItem
                destructive
                data-delete-weekly-file-action
                onClick={() => setShowDeleteConfirm(true)}
                icon={<Trash2 className="h-4 w-4 text-rose-500" />}
              >
                Xóa hồ sơ
              </ActionMenuItem>
            </UnifiedActionMenu>
          </div>
        </div>
      </div>

      {/* MODERN SEGMENTED CONTROL TAB SWITCHER */}
      <div
        role="tablist"
        aria-label="Chọn phần làm việc trong Hồ sơ ATLĐ"
        className="w-full bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-1 h-12 shadow-2xs"
      >
        <button
          role="tab"
          id="tab-plan"
          aria-selected={activeTab === "PLAN"}
          aria-controls="panel-plan"
          tabIndex={activeTab === "PLAN" ? 0 : -1}
          onClick={() => handleTabChange("PLAN")}
          onKeyDown={(e) => handleTabKeyDown(e, "PLAN")}
          className={`flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            activeTab === "PLAN"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <CalendarCheck className="h-4 w-4 shrink-0" />
          <span>Kế hoạch kiểm tra</span>
        </button>

        <button
          role="tab"
          id="tab-assessment"
          aria-selected={activeTab === "ASSESSMENT"}
          aria-controls="panel-assessment"
          tabIndex={activeTab === "ASSESSMENT" ? 0 : -1}
          onClick={() => handleTabChange("ASSESSMENT")}
          onKeyDown={(e) => handleTabKeyDown(e, "ASSESSMENT")}
          className={`flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            activeTab === "ASSESSMENT"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          <span>Báo cáo tự đánh giá</span>
        </button>
      </div>

      {/* TAB PANELS CONTAINER */}
      <div className="space-y-4">
        {/* Panel 1: Plan Editor */}
        <div
          id="panel-plan"
          role="tabpanel"
          aria-labelledby="tab-plan"
          className={activeTab === "PLAN" ? "block" : "hidden"}
        >
          {planData ? (
            <SafetyPlanEditor
              plan={planData}
              projects={projects}
              currentUser={currentUser}
              hideHeader={true}
              embedded={true}
              onRegisterSave={(saveFn) => {
                planSaveFnRef.current = saveFn;
              }}
              onSaveStateChange={(state, savedAt) => {
                setPlanSaveState(state);
                if (savedAt) setPlanLastSavedAt(savedAt);
              }}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <CalendarCheck className="h-12 w-12 text-blue-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                Tuần này chưa có Kế hoạch kiểm tra
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Khởi tạo Kế hoạch kiểm tra để sắp xếp lịch làm việc cho các công trình trong tuần.
              </p>
              <Button
                onClick={handleCreatePlan}
                disabled={pending}
                className="bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs h-10 px-5 rounded-xl gap-2 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Khởi tạo Kế hoạch</span>
              </Button>
            </div>
          )}
        </div>

        {/* Panel 2: Assessment Report Editor */}
        <div
          id="panel-assessment"
          role="tabpanel"
          aria-labelledby="tab-assessment"
          className={activeTab === "ASSESSMENT" ? "block" : "hidden"}
        >
          {assessmentData ? (
            <SafetyAssessmentEditor
              report={assessmentData}
              projects={projects}
              plans={planData ? [{ id: planData.id, documentNumber: planData.documentNumber, title: planData.title }] : []}
              currentUser={currentUser}
              hideHeader={true}
              embedded={true}
              onRegisterSave={(saveFn) => {
                assessmentSaveFnRef.current = saveFn;
              }}
              onSaveStateChange={(state, savedAt) => {
                setAssessmentSaveState(state);
                if (savedAt) setAssessmentLastSavedAt(savedAt);
              }}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <FileSpreadsheet className="h-12 w-12 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                Tuần này chưa có Báo cáo tự đánh giá
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Khởi tạo Báo cáo tự đánh giá để nạp lịch kiểm tra từ Kế hoạch và đánh giá kết quả.
              </p>
              <Button
                onClick={handleCreateAssessment}
                disabled={pending}
                className="bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs h-10 px-5 rounded-xl gap-2 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Khởi tạo Báo cáo</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Standard Destructive Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Xóa toàn bộ hồ sơ tuần"
        description={`Tất cả Kế hoạch kiểm tra và Báo cáo tự đánh giá thuộc tuần (${periodLabel}) sẽ bị xóa vĩnh viễn khỏi hệ thống. Hành động này không thể hoàn tác.`}
        variant="danger"
        confirmText="Xóa hồ sơ tuần"
        cancelText="Hủy"
        onConfirm={handleDeleteWeeklyFile}
        isLoading={pending}
      />
    </div>
  );
}
