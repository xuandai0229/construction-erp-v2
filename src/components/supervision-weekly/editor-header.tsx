"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ChevronRight, Cloud, CloudOff,
  Eye, Loader2, Printer, RefreshCw, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── Types ── */
export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

export type EditorHeaderProps = {
  title: string;
  weekLabel: string;
  dateRange: string;
  version: number;
  status?: string;
  saveState: SaveState;
  lastSavedAt: string | null;
  message?: string;
  editable: boolean;
  canReview?: boolean;
  workflowPending?: boolean;
  latestRevision?: any;
  onBackToList: () => void;
  onSaveDraft: () => void;
  onSubmit?: () => void;
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

/* ════════════════════════════════════════════════════
   MAIN EDITOR HEADER COMPONENT
   ════════════════════════════════════════════════════ */
export function EditorHeader(props: EditorHeaderProps) {
  const {
    title, weekLabel, dateRange, version, saveState, lastSavedAt, message,
    editable, onBackToList, onSaveDraft, onPreview, onRetrySave,
    sections, activeSectionId, onSectionClick,
  } = props;

  return (
    <>
      <div className="space-y-0 print:hidden">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 px-1 py-2 text-sm" aria-label="Breadcrumb">
          <Link href="/reports/weekly-inspection"
            onClick={() => { if (onBackToList) onBackToList(); }}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Quay lại Trung tâm Báo cáo">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Danh sách</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-slate-500 hidden sm:inline">Báo cáo</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 hidden sm:inline" />
          <span className="text-slate-500 hidden sm:inline">Báo cáo Giám sát công trình</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 hidden sm:inline" />
          <span className="font-semibold text-slate-800">Soạn báo cáo</span>
        </nav>

        {/* Main Header Card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
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
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} onRetry={onRetrySave} />
            </div>
          </div>

          {message && message !== "Đã lưu" && (
            <div className="border-t border-slate-100 bg-blue-50/50 px-4 py-2 text-xs font-medium text-blue-800 sm:px-5">
              {message}
            </div>
          )}

          {/* Action bar */}
          <div data-testid="weekly-editor-action-bar" className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
            <div className="text-xs text-slate-400 hidden md:block">
              Nhấn Ctrl+S để lưu nhanh
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" className="h-9 text-slate-700 border-slate-200" onClick={onPreview}>
                <Eye className="mr-1.5 h-4 w-4" /> Xem trước
              </Button>
              {editable && (
                <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" onClick={onSaveDraft}
                  disabled={saveState === "saving"}>
                  <Save className="mr-1.5 h-4 w-4" />
                  {saveState === "saving" ? "Đang lưu..." : "Lưu báo cáo"}
                </Button>
              )}
            </div>
          </div>

          {/* Section nav */}
          {sections.length > 0 && (
            <div className="border-t border-slate-100 px-4 sm:px-5">
              <SectionNav sections={sections} activeId={activeSectionId} onClickSection={onSectionClick} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      {editable && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-4 py-3 sm:hidden print:hidden safe-area-bottom">
          <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={onSaveDraft} disabled={saveState === "saving"}>
            <Save className="mr-1.5 h-4 w-4" /> {saveState === "saving" ? "Đang lưu..." : "Lưu báo cáo"}
          </Button>
        </div>
      )}
    </>
  );
}
