const fs = require('fs');
const path = 'src/components/documents/document-workspace.tsx';
let content = fs.readFileSync(path, 'utf-8');

const oldContextFuncRegex = /export function DocumentContextMenu\(\{[\s\S]*?\}\) \{\n  if \(\!contextMenu\) return null;[\s\S]*?<\/div>\n    \);\n  \}/;

const newContextFunc = `export function DocumentContextMenu({
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
}: {
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
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!contextMenu || !menuRef.current) return;
    const { innerWidth, innerHeight } = window;
    const { offsetWidth, offsetHeight } = menuRef.current;
    
    let newX = contextMenu.x;
    let newY = contextMenu.y;
    
    // Collision detection
    if (newX + offsetWidth > innerWidth - 12) {
      newX = innerWidth - offsetWidth - 12;
    }
    if (newY + offsetHeight > innerHeight - 12) {
      newY = innerHeight - offsetHeight - 12;
    }
    
    setPosition({ x: newX, y: newY });
  }, [contextMenu]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScrollOrResize = () => onClose();
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    
    // Slight delay to prevent immediate close on the click that opens the menu
    setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside);
    }, 0);
    
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu, onClose]);

  if (!contextMenu) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl overflow-hidden"
      style={{ top: position.y || contextMenu.y, left: position.x || contextMenu.x, opacity: position.x ? 1 : 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      {isTrashView ? (
        <>
          {contextMenu.type === "folder" && (
            <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
              <FolderOpen className="h-4 w-4" />
              Mở / Xem nội dung
            </button>
          )}
          {contextMenu.type === "file" && (
            <>
              <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
                <Eye className="h-4 w-4" />
                Xem chi tiết
              </button>
              <button onClick={() => { onDownload(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
                <Download className="h-4 w-4" />
                Tải xuống
              </button>
            </>
          )}
          {contextMenu.type !== "workspace" && (
            <>
              <div className="my-1 h-px bg-slate-100"></div>
              <button onClick={() => { onRestore?.(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Khôi phục
              </button>
              <button onClick={() => { onPermanentDelete?.(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-red-50 text-red-600">
                <Trash2 className="h-4 w-4" />
                Xóa vĩnh viễn
              </button>
            </>
          )}
        </>
      ) : contextMenu.type === "workspace" ? (
        <>
          <button onClick={() => { onUpload(); onClose(); }} disabled={!canUpload} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <UploadCloud className="h-4 w-4" />
            Tải tài liệu lên
          </button>
          <button onClick={() => { onCreateFolder(); onClose(); }} disabled={!canCreateFolder} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <FolderPlus className="h-4 w-4" />
            Tạo mục bên trong
          </button>
          <div className="my-1 h-px bg-slate-100"></div>
          <button onClick={() => { onRefresh(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            Làm mới
          </button>
          {contextMenu.targetId && (
            <button onClick={() => { onDeselect(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
              <X className="h-4 w-4" />
              Bỏ chọn thư mục
            </button>
          )}
        </>
      ) : contextMenu.type === "folder" ? (
        <>
          <button onClick={() => { onUpload(); onClose(); }} disabled={!canUpload} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <UploadCloud className="h-4 w-4" />
            Tải tài liệu lên đây
          </button>
          <button onClick={() => { onCreateFolder(); onClose(); }} disabled={!canCreateFolder} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <FolderPlus className="h-4 w-4" />
            Tạo mục bên trong
          </button>
          <div className="my-1 h-px bg-slate-100"></div>
          <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <FolderOpen className="h-4 w-4" />
            Mở thư mục
          </button>
          <button onClick={() => { onRename(); onClose(); }} disabled={!canRename} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <Pencil className="h-4 w-4" />
            Đổi tên
          </button>
          <button onClick={() => { onCopyLink(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <Copy className="h-4 w-4" />
            Sao chép đường dẫn
          </button>
          <div className="my-1 h-px bg-slate-100"></div>
          <button onClick={() => { onDelete(); onClose(); }} disabled={!canDelete} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent text-red-600">
            <Trash2 className="h-4 w-4" />
            Chuyển vào thùng rác
          </button>
        </>
      ) : (
        <>
          <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <Eye className="h-4 w-4" />
            Xem chi tiết
          </button>
          <button onClick={() => { onOpenInNewTab(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <ExternalLink className="h-4 w-4" />
            Mở thẻ mới
          </button>
          <button onClick={() => { onDownload(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <Download className="h-4 w-4" />
            Tải xuống
          </button>
          <div className="my-1 h-px bg-slate-100"></div>
          <button onClick={() => { onEditMetadata(); onClose(); }} disabled={!canRename} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <Pencil className="h-4 w-4" />
            Chỉnh sửa metadata
          </button>
          <button onClick={() => { onRename(); onClose(); }} disabled={!canRename} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <Pencil className="h-4 w-4" />
            Đổi tên file
          </button>
          <button onClick={() => { onCopyLink(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <Copy className="h-4 w-4" />
            Sao chép liên kết
          </button>
          <div className="my-1 h-px bg-slate-100"></div>
          <button onClick={() => { onDelete(); onClose(); }} disabled={!canDelete} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent text-red-600">
            <Trash2 className="h-4 w-4" />
            Chuyển vào thùng rác
          </button>
        </>
      )}
    </div>, document.body
  );
}`;

content = content.replace(oldContextFuncRegex, newContextFunc);
fs.writeFileSync(path, content);
console.log("Updated context menu.");
