"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

export interface DocumentContextMenuProps {
  contextMenu: { type: "folder" | "file" | "workspace"; targetId?: string; x: number; y: number } | null;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  onOpen: () => void;
  onUpload: () => void;
  onCreateFolder: () => void;
  onRefresh: () => void;
  onDeselect: () => void;
  onBack: () => void;
  onEditMetadata: () => void;
  onOpenInNewTab: () => void;
  onDownload: () => void;
  canRename: boolean;
  canDelete: boolean;
  canUpload: boolean;
  canCreateFolder: boolean;
  isTrashView?: boolean;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
}

export function DocumentContextMenu({
  contextMenu,
  onClose,
  onRename,
  onDelete,
  onCopyLink,
  onOpen,
  onUpload,
  onCreateFolder,
  onRefresh,
  onDeselect,
  onBack,
  onEditMetadata,
  onOpenInNewTab,
  onDownload,
  canRename,
  canDelete,
  canUpload,
  canCreateFolder,
  isTrashView,
  onRestore,
  onPermanentDelete,
}: DocumentContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Breakpoint from the prompt: < 640px is mobile sheet
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!contextMenu || !menuRef.current || isMobile) return;
    const { innerWidth, innerHeight } = window;
    const { offsetWidth, offsetHeight } = menuRef.current;
    
    let newX = contextMenu.x;
    let newY = contextMenu.y;
    
    if (newX + offsetWidth > innerWidth - 12) {
      newX = innerWidth - offsetWidth - 12;
    }
    if (newY + offsetHeight > innerHeight - 12) {
      newY = innerHeight - offsetHeight - 12;
    }
    newX = Math.max(12, newX);
    newY = Math.max(12, newY);
    
    setPosition({ x: newX, y: newY });
  }, [contextMenu, isMobile]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScrollOrResize = () => {
      if (!isMobile) onClose();
    };
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    
    setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside);
    }, 0);
    
    if (!isMobile) {
      window.addEventListener("scroll", handleScrollOrResize, true);
    }
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu, onClose, isMobile]);

  if (!contextMenu) return null;

  const contentUI = (
    <div className={`flex flex-col gap-1 ${isMobile ? "w-full overflow-y-auto p-4 pb-[max(16px,env(safe-area-inset-bottom))]" : ""}`}>
      {isMobile && (
        <div className="mb-4 flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <h4 className="font-bold text-[var(--foreground)] text-base flex-1 min-w-0 truncate pr-4">
            {contextMenu.type === "folder" ? "Tùy chọn thư mục" : contextMenu.type === "file" ? "Tùy chọn tài liệu" : "Tùy chọn"}
          </h4>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 rounded-full text-[var(--muted-foreground)] opacity-70 hover:bg-[var(--border)] hover:text-[var(--muted-foreground)] transition-colors"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      {isTrashView ? (
        <>
          {contextMenu.type === "workspace" && (
            <>
              {contextMenu.targetId && (
                <>
                  <button onClick={() => { onBack(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    Quay lại
                  </button>
                  <button onClick={() => { onRestore?.(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
                    <FolderOpen className="h-4 w-4 shrink-0" />
                    Khôi phục thư mục hiện tại
                  </button>
                  <button onClick={() => { onPermanentDelete?.(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-red-50 text-red-600">
                    <Trash2 className="h-4 w-4 shrink-0" />
                    Xóa vĩnh viễn thư mục hiện tại
                  </button>
                  <div className="my-1 h-px bg-[var(--border)]"></div>
                </>
              )}
              <button onClick={() => { onRefresh(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
                <svg className="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                Làm mới
              </button>
            </>
          )}
          {contextMenu.type === "folder" && (
            <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
              <FolderOpen className="h-4 w-4 shrink-0" />
              Mở / Xem nội dung
            </button>
          )}
          {contextMenu.type === "file" && (
            <>
              <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
                <Eye className="h-4 w-4 shrink-0" />
                Xem chi tiết
              </button>
              <button onClick={() => { onDownload(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
                <Download className="h-4 w-4 shrink-0" />
                Tải xuống
              </button>
            </>
          )}
          {contextMenu.type !== "workspace" && (
            <>
              <div className="my-1 h-px bg-[var(--border)]"></div>
              <button onClick={() => { onRestore?.(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
                <svg className="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Khôi phục
              </button>
              <button onClick={() => { onPermanentDelete?.(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-red-50 text-red-600">
                <Trash2 className="h-4 w-4 shrink-0" />
                Xóa vĩnh viễn
              </button>
            </>
          )}
        </>
      ) : contextMenu.type === "workspace" ? (
        <>
          {contextMenu.targetId && (
            <button onClick={() => { onCopyLink(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
              <Copy className="h-4 w-4 shrink-0" />
              Sao chép đường dẫn thư mục
            </button>
          )}
          <button onClick={() => { onUpload(); onClose(); }} disabled={!canUpload} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] disabled:opacity-50 disabled:hover:bg-transparent text-[var(--foreground)]">
            <UploadCloud className="h-4 w-4 shrink-0" />
            Tải tài liệu lên
          </button>
          <button onClick={() => { onCreateFolder(); onClose(); }} disabled={!canCreateFolder} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] disabled:opacity-50 disabled:hover:bg-transparent text-[var(--foreground)]">
            <FolderPlus className="h-4 w-4 shrink-0" />
            Tạo mục bên trong
          </button>
          <div className="my-1 h-px bg-[var(--border)]"></div>
          <button onClick={() => { onRefresh(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
            <svg className="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            Làm mới
          </button>
          {contextMenu.targetId && (
            <button onClick={() => { onDeselect(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
              <X className="h-4 w-4 shrink-0" />
              Bỏ chọn thư mục
            </button>
          )}
        </>
      ) : contextMenu.type === "folder" ? (
        <>
          <button onClick={() => { onUpload(); onClose(); }} disabled={!canUpload} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] disabled:opacity-50 disabled:hover:bg-transparent text-[var(--foreground)]">
            <UploadCloud className="h-4 w-4 shrink-0" />
            Tải tài liệu lên đây
          </button>
          <button onClick={() => { onCreateFolder(); onClose(); }} disabled={!canCreateFolder} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] disabled:opacity-50 disabled:hover:bg-transparent text-[var(--foreground)]">
            <FolderPlus className="h-4 w-4 shrink-0" />
            Tạo mục bên trong
          </button>
          <div className="my-1 h-px bg-[var(--border)]"></div>
          <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
            <FolderOpen className="h-4 w-4 shrink-0" />
            Mở thư mục
          </button>
          <button onClick={() => { onRename(); onClose(); }} disabled={!canRename} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] disabled:opacity-50 disabled:hover:bg-transparent text-[var(--foreground)]">
            <Pencil className="h-4 w-4 shrink-0" />
            Đổi tên
          </button>
          <button onClick={() => { onCopyLink(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
            <Copy className="h-4 w-4 shrink-0" />
            Sao chép đường dẫn
          </button>
          <div className="my-1 h-px bg-[var(--border)]"></div>
          <button onClick={() => { onDelete(); onClose(); }} disabled={!canDelete} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent text-red-600">
            <Trash2 className="h-4 w-4 shrink-0" />
            Chuyển vào thùng rác
          </button>
        </>
      ) : (
        <>
          <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
            <Eye className="h-4 w-4 shrink-0" />
            Xem chi tiết
          </button>
          <button onClick={() => { onOpenInNewTab(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
            <ExternalLink className="h-4 w-4 shrink-0" />
            Mở thẻ mới
          </button>
          <button onClick={() => { onDownload(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
            <Download className="h-4 w-4 shrink-0" />
            Tải xuống
          </button>
          <div className="my-1 h-px bg-[var(--border)]"></div>
          <button onClick={() => { onEditMetadata(); onClose(); }} disabled={!canRename} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] disabled:opacity-50 disabled:hover:bg-transparent text-[var(--foreground)]">
            <Pencil className="h-4 w-4 shrink-0" />
            Chỉnh sửa metadata
          </button>
          <button onClick={() => { onRename(); onClose(); }} disabled={!canRename} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] disabled:opacity-50 disabled:hover:bg-transparent text-[var(--foreground)]">
            <Pencil className="h-4 w-4 shrink-0" />
            Đổi tên file
          </button>
          <button onClick={() => { onCopyLink(); onClose(); }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-[var(--border)] text-[var(--foreground)]">
            <Copy className="h-4 w-4 shrink-0" />
            Sao chép liên kết
          </button>
          <div className="my-1 h-px bg-[var(--border)]"></div>
          <button onClick={() => { onDelete(); onClose(); }} disabled={!canDelete} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 sm:px-2 sm:py-1.5 text-sm hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent text-red-600">
            <Trash2 className="h-4 w-4 shrink-0" />
            Chuyển vào thùng rác
          </button>
        </>
      )}
    </div>
  );

  return createPortal(
    isMobile ? (
      <div 
        className="fixed inset-0 z-[9999] flex items-end bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div 
          ref={menuRef}
          className="w-full max-h-[85vh] rounded-t-2xl bg-[var(--surface)] shadow-2xl transition-transform"
          onClick={(e) => e.stopPropagation()}
        >
          {contentUI}
        </div>
      </div>
    ) : (
      <div
        ref={menuRef}
        className="fixed z-[9999] min-w-[220px] max-w-[calc(100vw-24px)] rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl overflow-hidden"
        style={{ top: position.y !== null ? position.y : contextMenu.y, left: position.x !== null ? position.x : contextMenu.x, opacity: position.x !== null ? 1 : 0 }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {contentUI}
      </div>
    ),
    document.body
  );
}
