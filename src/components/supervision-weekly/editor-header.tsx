"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, Check, ChevronRight, Cloud, CloudOff,
  Eye, Loader2, MoreHorizontal, RefreshCw, Save, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WeeklyRevisionInfo } from "@/lib/supervision-weekly/editor-types";

/* ── Types ── */
export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

export type EditorHeaderProps = {
  title: string;
  weekLabel: string;
  dateRange: string;
  version: number;
  status: string;
  saveState: SaveState;
  lastSavedAt: string | null;
  message?: string;
  editable: boolean;
  canReview: boolean;
  workflowPending: boolean;
  latestRevision?: WeeklyRevisionInfo | null;
  onBackToList: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onPreview: () => void;
  onRetrySave: () => void;
  onRequestRevision?: () => void;
  onApprove?: () => void;
  onLock?: () => void;
  sections: SectionNavItem[];
  activeSectionId: string | null;
  onSectionClick: (id: string) => void;
};

export type SectionNavItem = {
  id: string;
  label: string;
  shortLabel?: string;
  status: "complete" | "active" | "incomplete" | "error" | "empty";
};

/* ── Status config ── */
const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Bản nháp", className: "bg-slate-100 text-slate-700 border-slate-200" },
  SUBMITTED: { label: "Đã gửi", className: "bg-blue-50 text-blue-700 border-blue-200" },
  REVISION_REQUIRED: { label: "Yêu cầu chỉnh sửa", className: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Đã phê duyệt", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  LOCKED: { label: "Đã khóa", className: "bg-slate-100 text-slate-600 border-slate-300" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${cfg.className}`}>
      {status === "REVISION_REQUIRED" && <AlertTriangle className="h-3 w-3" />}
      {status === "APPROVED" && <Check className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

/* ── Save status indicator ── */
function SaveIndicator({ state, lastSavedAt, onRetry }: {
  state: SaveState; message?: string; lastSavedAt: string | null; onRetry: () => void;
}) {
  const icon = state === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
    : state === "saved" ? <Cloud className="h-3.5 w-3.5 text-emerald-500" />
    : state === "dirty" ? <Cloud className="h-3.5 w-3.5 text-slate-400" />
    : <CloudOff className="h-3.5 w-3.5 text-rose-500" />;

  const text = state === "saving" ? "Đang lưu..."
    : state === "saved" ? (lastSavedAt ? `Đã lưu lúc ${lastSavedAt}` : "Đã lưu")
    : state === "dirty" ? "Có thay đổi chưa lưu"
    : state === "conflict" ? "Xung đột phiên bản"
    : "Lưu thất bại";

  const textClass = state === "error" || state === "conflict" ? "text-rose-600 font-semibold"
    : state === "saving" ? "text-blue-600" : state === "saved" ? "text-emerald-600" : "text-slate-500";

  return (
    <div className="flex items-center gap-1.5 text-xs" data-testid="autosave-status">
      {icon}
      <span className={textClass}>{text}</span>
      {(state === "error" || state === "conflict") && (
        <button type="button" onClick={onRetry}
          className="ml-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors"
          aria-label="Thử lưu lại">
          <RefreshCw className="h-3 w-3" /> Thử lại
        </button>
      )}
    </div>
  );
}

/* ── Revision alert ── */
function RevisionAlert({ revision }: { revision: WeeklyRevisionInfo }) {
  const date = revision.createdAt ? new Date(revision.createdAt) : null;
  const timeStr = date && !Number.isNaN(date.getTime())
    ? date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-amber-900">Báo cáo cần chỉnh sửa</h3>
          <p className="mt-1 text-sm text-amber-800">
            <span className="font-semibold">{revision.actorName || "Người phê duyệt"}</span>
            {timeStr ? " yêu cầu chỉnh sửa lúc " : " yêu cầu chỉnh sửa"}
            {timeStr && <span className="font-semibold">{timeStr}</span>}
          </p>
          {revision.reason && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-white/60 px-3 py-2 text-sm text-amber-900">
              {revision.reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Section Nav ── */
function SectionNav({ sections, activeId, onClickSection }: {
  sections: SectionNavItem[]; activeId: string | null; onClickSection: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dotClass = (s: SectionNavItem["status"]) =>
    s === "complete" ? "bg-emerald-500" : s === "active" ? "bg-blue-500" : s === "error" ? "bg-rose-500" : s === "incomplete" ? "bg-amber-400" : "bg-slate-300";
  return (
    <div ref={scrollRef} className="flex gap-1 overflow-x-auto hide-scrollbar py-1" role="tablist" aria-label="Điều hướng nội dung báo cáo">
      {sections.map((s) => (
        <button key={s.id} role="tab" aria-selected={activeId === s.id}
          onClick={() => onClickSection(s.id)}
          className={`group flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap
            ${activeId === s.id ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
          <span className={`h-2 w-2 rounded-full shrink-0 ${dotClass(s.status)}`} aria-hidden="true" />
          <span className="hidden sm:inline">{s.label}</span>
          <span className="sm:hidden">{s.shortLabel || s.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── More actions menu ── */
function MoreMenu({ canReview, status, onRequestRevision, onApprove, onLock }: {
  canReview: boolean; status: string;
  onRequestRevision?: () => void; onApprove?: () => void; onLock?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const hasItems = (canReview && status === "SUBMITTED") || (canReview && status === "APPROVED");
  if (!hasItems) return null;

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} aria-label="Thêm hành động"
        className="h-9 w-9 p-0">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          {canReview && status === "SUBMITTED" && (
            <>
              <button type="button" className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => { setOpen(false); onRequestRevision?.(); }}>
                Yêu cầu chỉnh sửa
              </button>
              <button type="button" className="w-full px-4 py-2.5 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                onClick={() => { setOpen(false); onApprove?.(); }}>
                Phê duyệt báo cáo
              </button>
            </>
          )}
          {canReview && status === "APPROVED" && (
            <button type="button" className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => { setOpen(false); onLock?.(); }}>
              Khóa hồ sơ
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function getSubmitDisabledReason({ editable, workflowPending, saveState }: {
  editable: boolean; workflowPending: boolean; saveState: SaveState;
}): string | undefined {
  if (!editable) return "Báo cáo không ở trạng thái có thể chỉnh sửa.";
  if (workflowPending) return "Đang xử lý gửi báo cáo...";
  if (saveState === "saving") return "Đang lưu dữ liệu bản nháp...";
  if (saveState === "error" || saveState === "conflict") return "Không thể gửi do lưu nháp đang có lỗi. Vui lòng bấm 'Thử lại'.";
  return undefined;
}

/* ── Sticky toolbar ── */
function StickyToolbar({ visible, title, saveState, lastSavedAt, editable, workflowPending,
  onSaveDraft, onSubmit, onPreview, onRetrySave }: {
  visible: boolean; title: string; saveState: SaveState; lastSavedAt: string | null;
  editable: boolean; workflowPending: boolean;
  onSaveDraft: () => void; onSubmit: () => void; onPreview: () => void; onRetrySave: () => void;
}) {
  const submitDisabledReason = getSubmitDisabledReason({ editable, workflowPending, saveState });
  const isSubmitDisabled = Boolean(submitDisabledReason);

  if (!visible) return null;

  return (
    <div className="sticky top-[var(--app-header-h,56px)] z-20 w-full rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-md my-2 transition-all duration-200 print:hidden hidden sm:block"
      aria-hidden={!visible}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="truncate text-sm font-bold text-slate-800">{title}</span>
          <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} onRetry={onRetrySave} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 hidden sm:inline-flex" onClick={onPreview}>
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Xem trước
          </Button>
          {editable && (
            <Button variant="secondary" size="sm" className="h-8" onClick={onSaveDraft} disabled={saveState === "saving"}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> Lưu
            </Button>
          )}
          {editable && (
            <div title={submitDisabledReason} className="inline-block">
              <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                onClick={onSubmit} disabled={isSubmitDisabled}>
                {workflowPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                Gửi
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Mobile bottom bar ── */
function MobileBottomBar({ editable, workflowPending, saveState, onSaveDraft, onSubmit }: {
  editable: boolean; workflowPending: boolean; saveState: SaveState; onSaveDraft: () => void; onSubmit: () => void;
}) {
  if (!editable) return null;
  const submitDisabledReason = getSubmitDisabledReason({ editable, workflowPending, saveState });
  const isSubmitDisabled = Boolean(submitDisabledReason);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-4 py-3 sm:hidden print:hidden safe-area-bottom"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1 h-11" onClick={onSaveDraft} disabled={saveState === "saving"}>
          <Save className="mr-1.5 h-4 w-4" /> Lưu nháp
        </Button>
        <div title={submitDisabledReason} className="flex-1">
          <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" onClick={onSubmit}
            disabled={isSubmitDisabled}>
            {workflowPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            {workflowPending ? "Đang gửi..." : "Gửi báo cáo"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN EDITOR HEADER COMPONENT
   ════════════════════════════════════════════════════ */
export function EditorHeader(props: EditorHeaderProps) {
  const {
    title, weekLabel, dateRange, version, status, saveState, lastSavedAt, message,
    editable, canReview, workflowPending, latestRevision,
    onBackToList, onSaveDraft, onSubmit, onPreview, onRetrySave,
    onRequestRevision, onApprove, onLock,
    sections, activeSectionId, onSectionClick,
  } = props;

  const headerRef = useRef<HTMLDivElement>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const submitDisabledReason = getSubmitDisabledReason({ editable, workflowPending, saveState });
  const isSubmitDisabled = Boolean(submitDisabledReason);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    let observer: IntersectionObserver | null = null;

    const setupObserver = () => {
      if (observer) observer.disconnect();
      const appHeader = typeof document !== "undefined"
        ? (document.querySelector<HTMLElement>("[data-app-header]") || document.querySelector("header"))
        : null;
      const appHeaderHeight = appHeader?.getBoundingClientRect().height ?? 0;
      const safeHeaderHeight = Number.isFinite(appHeaderHeight) && appHeaderHeight > 0
        ? Math.round(appHeaderHeight)
        : 56;

      observer = new IntersectionObserver(
        ([entry]) => setStickyVisible(!entry.isIntersecting),
        { threshold: 0, rootMargin: `-${safeHeaderHeight}px 0px 0px 0px` }
      );
      observer.observe(el);
    };

    setupObserver();

    window.addEventListener("resize", setupObserver);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", setupObserver);
    };
  }, []);

  return (
    <>
      {/* ── Main header ── */}
      <div ref={headerRef} className="space-y-0 print:hidden">
        {/* Row A: Breadcrumb */}
        <nav className="flex items-center gap-2 px-1 py-2 text-sm" aria-label="Breadcrumb">
          <Link href="/supervision/weekly"
            onClick={() => { if (onBackToList) onBackToList(); }}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Quay lại danh sách báo cáo tuần">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Danh sách</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-slate-500 hidden sm:inline">Giám sát</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 hidden sm:inline" />
          <span className="text-slate-500 hidden sm:inline">Báo cáo tuần</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 hidden sm:inline" />
          <span className="font-semibold text-slate-800">Soạn báo cáo</span>
        </nav>

        {/* Row B + C + D: Main header card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Row B: Report info + status */}
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
            {/* Left: Report info */}
            <div className="min-w-0 space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">{weekLabel}</span>
                <span className="text-slate-300">·</span>
                <span>{dateRange}</span>
                <span className="text-slate-300">·</span>
                <span>Phiên bản {version}</span>
              </div>
            </div>
            {/* Right: Status + save */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <StatusBadge status={status} />
              <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} onRetry={onRetrySave} />
            </div>
          </div>

          {/* Optional notification message banner */}
          {message && message !== "Đã lưu" && (
            <div className="border-t border-slate-100 bg-blue-50/50 px-4 py-2 text-xs font-medium text-blue-800 sm:px-5">
              {message}
            </div>
          )}

          {/* Row C: Revision alert if needed */}
          {status === "REVISION_REQUIRED" && latestRevision && (
            <div className="border-t border-slate-100 px-4 pb-4 sm:px-5">
              <RevisionAlert revision={latestRevision} />
            </div>
          )}

          {/* Row D: Action bar */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
            <div className="text-xs text-slate-400 hidden md:block">
              Nhấn Ctrl+S để lưu nhanh
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <Button variant="ghost" size="sm" className="h-9 text-slate-600" onClick={onPreview}>
                <Eye className="mr-1.5 h-4 w-4" /> Xem trước
              </Button>
              {editable && (
                <Button variant="outline" size="sm" className="h-9" onClick={onSaveDraft}
                  disabled={saveState === "saving"}>
                  <Save className="mr-1.5 h-4 w-4" />
                  {saveState === "saving" ? "Đang lưu..." : "Lưu nháp"}
                </Button>
              )}
              {editable && (
                <div title={submitDisabledReason} className="inline-block">
                  <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 disabled:opacity-50"
                    onClick={onSubmit}
                    disabled={isSubmitDisabled}>
                    {workflowPending
                      ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      : <Send className="mr-1.5 h-4 w-4" />}
                    {workflowPending ? "Đang gửi..." : "Gửi báo cáo"}
                  </Button>
                </div>
              )}
              <MoreMenu canReview={canReview} status={status}
                onRequestRevision={onRequestRevision} onApprove={onApprove} onLock={onLock} />
            </div>
          </div>

          {/* Row E: Section navigation */}
          {sections.length > 0 && (
            <div className="border-t border-slate-100 px-4 sm:px-5">
              <SectionNav sections={sections} activeId={activeSectionId} onClickSection={onSectionClick} />
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky toolbar (appears on scroll inside main container) ── */}
      <StickyToolbar visible={stickyVisible} title={title}
        saveState={saveState} lastSavedAt={lastSavedAt}
        editable={editable} workflowPending={workflowPending}
        onSaveDraft={onSaveDraft} onSubmit={onSubmit} onPreview={onPreview} onRetrySave={onRetrySave} />

      {/* ── Mobile bottom bar ── */}
      <MobileBottomBar editable={editable} workflowPending={workflowPending} saveState={saveState}
        onSaveDraft={onSaveDraft} onSubmit={onSubmit} />
    </>
  );
}
