"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  Maximize2,
  Minimize2,
  Pencil,
  RotateCcw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { format } from "date-fns";
import { getDocumentPreviewKind } from "@/lib/document-file-utils";
import { DocumentStatus } from "@prisma/client";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

export interface DocumentListItem {
  id: string;
  projectId: string;
  folderId: string;
  originalName: string;
  displayName: string | null;
  documentType: string | null;
  status: DocumentStatus;
  metadata: any;
  fileHash: string | null;
  storedName: string;
  mimeType: string;
  extension: string;
  size: number;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  uploadedById: string;
  uploadedBy?: { name: string } | null;
  rejectedReason?: string | null;
}

interface DocumentViewerProps {
  document: DocumentListItem;
  folderName: string;
  hasPrevious: boolean;
  hasNext: boolean;
  canRename: boolean;
  canDelete: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  canEditMetadata: boolean;
  onEditMetadata: () => void;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1,
  );
  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(decimals))} ${sizes[index]}`;
}

function getFallbackCopy(extension: string) {
  const normalized = extension.toLowerCase();
  if ([".doc", ".docx"].includes(normalized)) {
    return {
      title: "Tài liệu Word",
      description:
        "Định dạng Word chưa hỗ trợ xem trực tiếp trong hệ thống. Vui lòng tải xuống để mở bằng Microsoft Word hoặc ứng dụng tương thích.",
      icon: FileText,
      iconClassName: "text-blue-600",
    };
  }
  if ([".xls", ".xlsx"].includes(normalized)) {
    return {
      title: "Bảng tính Excel",
      description:
        "Định dạng Excel chưa hỗ trợ xem trực tiếp trong hệ thống. Vui lòng tải xuống để mở bằng Microsoft Excel hoặc ứng dụng tương thích.",
      icon: FileSpreadsheet,
      iconClassName: "text-emerald-600",
    };
  }
  if ([".dwg", ".dxf"].includes(normalized)) {
    return {
      title: "File bản vẽ CAD",
      description:
        "Vui lòng tải xuống để mở bằng phần mềm CAD chuyên dụng. Nếu cần xem nhanh trong hệ thống, nên tải thêm bản PDF của bản vẽ.",
      icon: FileCode,
      iconClassName: "text-violet-600",
    };
  }
  if (normalized === ".xml") {
    return {
      title: "Dữ liệu XML hóa đơn",
      description:
        "Phase A.1 chưa đọc nội dung XML trong app. Vui lòng tải xuống để kiểm tra bằng phần mềm hóa đơn phù hợp.",
      icon: FileCode,
      iconClassName: "text-amber-600",
    };
  }
  if ([".heic", ".heif"].includes(normalized)) {
    return {
      title: "Ảnh HEIC",
      description:
        "Trình duyệt hiện tại có thể không hỗ trợ xem HEIC. Vui lòng tải xuống hoặc chuyển ảnh sang JPG/PNG để xem ổn định.",
      icon: FileImage,
      iconClassName: "text-sky-600",
    };
  }
  return {
    title: "Chưa hỗ trợ xem trực tiếp",
    description:
      "Định dạng này chưa có viewer trong hệ thống. Bạn vẫn có thể tải file xuống để mở bằng ứng dụng phù hợp.",
    icon: FileText,
    iconClassName: "text-slate-500",
  };
}

export function DocumentViewer({
  document,
  folderName,
  hasPrevious,
  hasNext,
  canRename,
  canDelete,
  onClose,
  onPrevious,
  onNext,
  onRename,
  onDelete,
  onCopyLink,
  canEditMetadata,
  onEditMetadata,
}: DocumentViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  useBodyScrollLock(true);
  const previewKind = getDocumentPreviewKind(
    document.mimeType,
    document.extension,
  );
  const previewUrl = `/api/documents/${document.id}/download?preview=true`;
  const downloadUrl = `/api/documents/${document.id}/download`;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isExpanded) setIsExpanded(false);
        else onClose();
      }
      if (event.key === "ArrowLeft" && hasPrevious) onPrevious();
      if (event.key === "ArrowRight" && hasNext) onNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    hasNext,
    hasPrevious,
    isExpanded,
    onClose,
    onNext,
    onPrevious,
  ]);

  const fallback = getFallbackCopy(document.extension);
  const FallbackIcon = fallback.icon;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Xem tài liệu ${document.originalName}`}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className={`absolute inset-0 flex flex-col overflow-hidden bg-white shadow-2xl md:inset-y-0 md:left-auto ${
          isExpanded ? "md:w-full" : "md:w-[min(760px,72vw)]"
        }`}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900" title={document.displayName || document.originalName}>
              {document.displayName || document.originalName}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
              <span>
                {folderName} · {formatBytes(document.size)} · {document.extension.toUpperCase()}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="hidden rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:inline-flex"
            aria-label={isExpanded ? "Thu nhỏ viewer" : "Phóng toàn màn"}
            title={isExpanded ? "Thu nhỏ" : "Phóng toàn màn"}
          >
            {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Đóng viewer"
            title="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 sm:px-5">
          <a
            href={downloadUrl}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Tải xuống
          </a>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ExternalLink className="h-4 w-4" />
            Mở tab mới
          </a>
          <button
            type="button"
            onClick={onCopyLink}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Copy className="h-4 w-4" />
            Sao chép link
          </button>
          {canRename && (
            <button
              type="button"
              onClick={onRename}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Pencil className="h-4 w-4" />
              Đổi tên
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Xóa
            </button>
          )}
          {canEditMetadata && (
            <button
              type="button"
              onClick={onEditMetadata}
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Pencil className="h-4 w-4" />
              Sửa thông tin
            </button>
          )}

        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-100">
          {previewKind === "image" && (
            <>
              <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setImageScale((value) => Math.max(0.5, value - 0.25))}
                  className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                  aria-label="Thu nhỏ ảnh"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="min-w-14 text-center text-xs font-medium text-slate-600">
                  {Math.round(imageScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageScale((value) => Math.min(3, value + 0.25))}
                  className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                  aria-label="Phóng to ảnh"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageScale(1)}
                  className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                  aria-label="Đặt lại kích thước ảnh"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              <div className="flex h-full items-center justify-center overflow-auto p-6 pt-16">
                {/* Protected route, not a public storage URL. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={document.originalName}
                  className="max-h-full max-w-full select-none object-contain shadow-sm transition-transform"
                  style={{ transform: `scale(${imageScale})` }}
                  draggable={false}
                />
              </div>
            </>
          )}

          {previewKind === "pdf" && (
            <iframe
              src={previewUrl}
              title={`PDF ${document.originalName}`}
              className="h-full w-full border-0 bg-white"
            />
          )}

          {previewKind === "details" && (
            <div className="flex h-full items-center justify-center overflow-y-auto p-6">
              <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <FallbackIcon className={`h-9 w-9 ${fallback.iconClassName}`} />
                </div>
                <h2 className="mt-4 text-lg font-bold text-slate-900">{fallback.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{fallback.description}</p>
                <a
                  href={downloadUrl}
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" />
                  Tải file xuống
                </a>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 p-2.5 text-slate-700 shadow-md hover:bg-white disabled:hidden"
            aria-label="Tài liệu trước"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 p-2.5 text-slate-700 shadow-md hover:bg-white disabled:hidden"
            aria-label="Tài liệu tiếp theo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs sm:px-5">
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">

            <div>
              <p className="text-slate-400">Ghi chú</p>
              <p className="mt-0.5 font-medium text-slate-700 truncate" title={document.metadata?.note}>
                {document.metadata?.note || "-"}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Người tải lên</p>
              <p className="mt-0.5 truncate font-medium text-slate-700">
                {document.uploadedBy?.name || "Không rõ"}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Ngày tải lên</p>
              <p className="mt-0.5 font-medium text-slate-700">
                {format(new Date(document.createdAt), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
          </div>
          <details className="group">
            <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-700">Thông tin kỹ thuật</summary>
            <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3 rounded-md bg-slate-50 p-2 text-[11px]">
              <div>
                <p className="text-slate-400">File Hash (SHA-256)</p>
                <p className="mt-0.5 font-mono text-slate-600 truncate" title={document.fileHash || "-"}>{document.fileHash || "-"}</p>
              </div>
              <div>
                <p className="text-slate-400">MIME Type</p>
                <p className="mt-0.5 font-mono text-slate-600 truncate" title={document.mimeType}>{document.mimeType}</p>
              </div>
              <div>
                <p className="text-slate-400">Storage ID</p>
                <p className="mt-0.5 font-mono text-slate-600 truncate" title={document.storedName}>{document.storedName}</p>
              </div>
            </div>
          </details>
        </footer>
      </section>
    </div>
  );
}
