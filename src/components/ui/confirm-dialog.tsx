"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "./button";
import { CloseButton } from "./close-button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  variant?: "danger" | "warning" | "info" | "success";
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  description,
  variant = "info",
  confirmText,
  cancelText = "Hủy",
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const icons = {
    danger: <AlertCircle className="w-6 h-6 text-red-600" aria-hidden="true" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-600" aria-hidden="true" />,
    info: <Info className="w-6 h-6 text-blue-600" aria-hidden="true" />,
    success: <CheckCircle className="w-6 h-6 text-emerald-600" aria-hidden="true" />,
  };

  const colors = {
    danger: "bg-red-100",
    warning: "bg-amber-100",
    info: "bg-blue-100",
    success: "bg-emerald-100",
  };

  const buttonVariants = {
    danger: "destructive" as const,
    warning: "default" as const,
    info: "default" as const,
    success: "default" as const,
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={!isLoading ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/20 outline-none animate-in zoom-in-95 duration-200 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4 overflow-y-auto px-5 py-5 sm:p-6">
          <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${colors[variant]}`}>
            {icons[variant]}
          </div>
          <div className="flex-1 mt-1">
            <h3 id="confirm-dialog-title" className="text-lg font-bold text-slate-900 mb-2">
              {title}
            </h3>
            {description && (
              <div id="confirm-dialog-desc" className="text-sm text-slate-600 whitespace-pre-wrap">
                {description}
              </div>
            )}
          </div>
          <CloseButton onClick={onClose} disabled={isLoading} className="absolute right-3 top-3" tone="neutral" />
        </div>
        
        <div className="flex flex-col-reverse items-stretch justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:gap-3 sm:px-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto mt-2 sm:mt-0"
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariants[variant]}
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full sm:w-auto ${
              variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 
              variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 
              variant === 'info' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
            }`}
          >
            {isLoading ? "Đang xử lý..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
