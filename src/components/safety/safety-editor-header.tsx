"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MoreVertical,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type AutoSaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

export interface SectionNavItem {
  id: string;
  label: string;
}

export function SaveIndicator({
  state,
  lastSavedAt,
  onRetry,
}: {
  state: AutoSaveState;
  lastSavedAt?: string | null;
  onRetry?: () => void;
}) {
  const textClass =
    state === "error" || state === "conflict"
      ? "text-rose-600 font-semibold"
      : state === "saving"
      ? "text-blue-600 font-semibold"
      : state === "saved"
      ? "text-emerald-600 font-semibold"
      : "text-slate-500 font-medium";

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium">
      {state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />}
      {state === "saved" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
      {state === "dirty" && <Clock className="h-3.5 w-3.5 text-amber-500" />}
      {(state === "error" || state === "conflict") && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}

      <span className={textClass}>
        {state === "saving"
          ? "Đang lưu…"
          : state === "saved"
          ? lastSavedAt
            ? `Đã lưu lúc ${lastSavedAt}`
            : "Đã lưu"
          : state === "dirty"
          ? "Chưa lưu"
          : state === "conflict"
          ? "Xung đột dữ liệu!"
          : "Lưu không thành công — Thử lại"}
      </span>

      {(state === "error" || state === "conflict") && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
        >
          <RefreshCw className="h-3 w-3" /> Thử lại
        </button>
      )}
    </div>
  );
}

export function SafetyEditorHeader({
  documentNumber,
  title,
  docTypeLabel,
  periodLabel,
  autoSaveState,
  lastSavedAt,
  onSave,
  onPreview,
  onDelete,
  canEdit = true,
}: {
  documentNumber?: string | null;
  title: string;
  docTypeLabel?: string;
  periodLabel?: string;
  status?: string;
  version?: number;
  autoSaveState: AutoSaveState;
  lastSavedAt?: string | null;
  sections?: SectionNavItem[];
  activeSection?: string;
  onSelectSection?: (id: string) => void;
  onSave?: () => void;
  onSubmit?: () => void;
  onApprove?: () => void;
  onRequestRevision?: () => void;
  onPreview?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canSubmit?: boolean;
  canApprove?: boolean;
  currentUserRole?: string;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 120);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-3 font-sans">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: Title & Action Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/reports/safety?tab=PLAN"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Link href="/reports/safety?tab=PLAN" className="hover:underline">
                  Hồ sơ An toàn lao động
                </Link>
                <span>/</span>
                <span className="text-slate-700">Kế hoạch kiểm tra</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-xl">
                  {title}
                </h1>
                {documentNumber && (
                  <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Mã hồ sơ">
                    {documentNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {onPreview && (
              <Button
                size="sm"
                variant="outline"
                onClick={onPreview}
                className="h-9 text-xs font-semibold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="hidden sm:inline">Xem trước</span>
              </Button>
            )}

            {canEdit && onSave && (
              <Button
                size="sm"
                onClick={onSave}
                disabled={autoSaveState === "saving"}
                className="h-9 text-xs font-bold gap-1.5 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
              >
                <Save className="h-4 w-4" />
                <span>Lưu</span>
              </Button>
            )}

            {onDelete && (
              <div className="relative" ref={menuRef}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="h-9 w-9 p-0 text-slate-500 hover:bg-slate-100 rounded-lg"
                  title="Thao tác"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>

                {showMenu && (
                  <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white border border-slate-200 shadow-lg py-1 z-50 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                      <span>Xóa kế hoạch</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Period & Save Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100 pt-3">
          <div className="font-semibold text-slate-600">
            {docTypeLabel ? (
              <span className="text-slate-800 font-bold">{docTypeLabel}</span>
            ) : (
              <>Kỳ kế hoạch: <span className="text-slate-900 font-bold">{periodLabel}</span></>
            )}
          </div>
          <SaveIndicator state={autoSaveState} lastSavedAt={lastSavedAt} onRetry={onSave} />
        </div>
      </div>

      {/* Floating Sticky Bar on Scroll */}
      {isScrolled && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-4 border border-slate-700 text-xs">
          <div className="font-bold truncate max-w-[200px] sm:max-w-xs">
            {documentNumber || title}
          </div>
          <div className="h-4 w-[1px] bg-slate-700" />
          <SaveIndicator state={autoSaveState} onRetry={onSave} />
          <div className="flex items-center gap-2">
            {onPreview && (
              <button
                onClick={onPreview}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-full font-semibold transition"
              >
                Xem trước
              </button>
            )}
            {canEdit && onSave && (
              <button
                onClick={onSave}
                disabled={autoSaveState === "saving"}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 rounded-full font-bold transition"
              >
                Lưu
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa kế hoạch</h3>
                <p className="text-xs text-slate-500 font-medium">Hành động này không thể hoàn tác.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Xóa kế hoạch này? Dữ liệu sẽ không còn xuất hiện trong danh sách.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                className="h-9 text-xs font-semibold"
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete?.();
                }}
                className="h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Xóa kế hoạch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
