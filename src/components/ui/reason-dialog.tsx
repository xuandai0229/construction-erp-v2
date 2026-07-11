"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./button";
import { CloseButton } from "./close-button";

interface ReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  minLength?: number;
  requireReason?: boolean;
}

export function ReasonDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  onConfirm,
  isLoading = false,
  placeholder = "Nhập lý do...",
  minLength = 10,
  requireReason = true,
}: ReasonDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError("");
      if (textareaRef.current) {
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  const handleSubmit = async () => {
    if (requireReason && !reason.trim()) {
      setError("Vui lòng nhập lý do.");
      return;
    }
    if (reason.trim() && reason.trim().length < minLength) {
      setError(`Lý do phải có ít nhất ${minLength} ký tự.`);
      return;
    }
    setError("");
    await onConfirm(reason.trim());
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reason-dialog-title"
      onClick={!isLoading ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/20 outline-none animate-in zoom-in-95 duration-200 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3 px-5 pt-5 pb-2 sm:p-6 sm:pb-3">
          <div className="flex items-start justify-between">
            <h3 id="reason-dialog-title" className="text-lg font-bold text-slate-900">
              {title}
            </h3>
            <CloseButton onClick={onClose} disabled={isLoading} tone="neutral" />
          </div>
          
          {description && (
            <div className="text-sm text-slate-600">
              {description}
            </div>
          )}
          
          <div className="mt-2">
            <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              ref={textareaRef}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              onBlur={() => {
                if (requireReason && !reason.trim()) {
                  setError("Vui lòng nhập lý do.");
                } else if (reason.trim() && reason.trim().length < minLength) {
                  setError(`Lý do phải có ít nhất ${minLength} ký tự.`);
                }
              }}
              disabled={isLoading}
              className={`w-full rounded-xl border ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'} bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-y`}
              placeholder={placeholder}
            />
            <div className="mt-1.5 flex items-center justify-between">
              {error ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              ) : <div />}
              <div className={`text-xs ${reason.trim().length < minLength ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                {reason.trim().length}/{minLength} ký tự tối thiểu
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:gap-3 sm:px-6 mt-auto">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto mt-2 sm:mt-0"
          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading || reason.trim().length < minLength}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
          >
            {isLoading ? "Đang xử lý..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
