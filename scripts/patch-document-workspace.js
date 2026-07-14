const fs = require('fs');

const targetFile = 'src/components/documents/document-workspace.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Fix Folder Card sizing
content = content.replace(
  /className=\{`group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md \$\{density === 'list' \? 'flex items-center gap-3 p-3' : 'p-5'}`\}/g,
  `className={\`group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md \${density === 'list' ? 'flex items-center gap-2 sm:gap-3 p-2 sm:p-3' : 'p-3 sm:p-5'}\`}`
);

content = content.replace(
  /<div className=\{`flex items-center justify-center rounded-lg \$\{density === 'list' \? 'h-10 w-10 shrink-0 bg-blue-50\/50' : 'mb-3 h-12 w-12 bg-blue-50\/50'}`\}>/g,
  `<div className={\`flex items-center justify-center rounded-lg \${density === 'list' ? 'h-9 w-9 sm:h-10 sm:w-10 shrink-0 bg-blue-50/50' : 'mb-2 sm:mb-3 h-10 w-10 sm:h-12 sm:w-12 bg-blue-50/50'}\`}>`
);

content = content.replace(
  /<Folder className=\{`\$\{isTrashView \? 'text-red-400' : 'text-blue-500'\} \$\{density === 'list' \? 'h-5 w-5' : 'h-6 w-6'}`\} \/>/g,
  `<Folder className={\`\${isTrashView ? 'text-red-400' : 'text-blue-500'} \${density === 'list' ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-5 w-5 sm:h-6 sm:w-6'}\`} />`
);

content = content.replace(
  /className="absolute right-2 top-2"/g,
  `className="absolute right-1 top-1 sm:right-2 sm:top-2"`
);

content = content.replace(
  /className="rounded-md p-1\.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"/g,
  `className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"`
);

content = content.replace(
  /<p className=\{`truncate font-semibold text-slate-900 \$\{density === 'compact' \? 'text-sm' : 'text-sm'}`\}>/g,
  `<p className={\`truncate font-semibold text-slate-900 \${density === 'compact' ? 'text-xs sm:text-sm' : 'text-sm'}\`}>`
);

content = content.replace(
  /className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"/g,
  `className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"`
);

// 2. Fix Context Menu
const contextMenuRegex = /export function DocumentContextMenu\(\{[\s\S]*?className="fixed z-\[9999\] min-w-\[220px\] rounded-xl border border-slate-200 bg-white p-1\.5 shadow-2xl overflow-hidden"[\s\S]*?style=\{\{ top: position\.y !== null \? position\.y : contextMenu\.y, left: position\.x !== null \? position\.x : contextMenu\.x, opacity: position\.x !== null \? 1 : 0 \}\}[\s\S]*?onClick=\{\(e\) => e\.stopPropagation\(\)\}[\s\S]*?onContextMenu=\{\(e\) => e\.preventDefault\(\)\}[\s\S]*?>/;

const newMenuWrapper = `
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!contextMenu) return null;

  const contentUI = (
`;

const menuReplacement = `
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
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 480);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScrollOrResize = () => onClose();
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    
    setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside);
    }, 0);
    
    // Don't close on scroll if it's mobile drawer
    if (!isMobile) {
      window.addEventListener("scroll", handleScrollOrResize, true);
    }
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu, onClose, isMobile]);

  if (!contextMenu) return null;

  const contentUI = (
    <div className={\`flex flex-col gap-1 \${isMobile ? "w-full overflow-y-auto max-h-[70vh] p-4 pb-8" : ""}\`}>
      {isMobile && (
        <div className="mb-4 flex items-center justify-between pb-2 border-b border-slate-100">
          <h4 className="font-bold text-slate-800 text-base">Tùy chọn</h4>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>
      )}
`;

const contextMenuComponentRegex = /export function DocumentContextMenu\(\{[\s\S]*?\}\) \{[\s\S]*?if \(!contextMenu\) return null;[\s\S]*?return createPortal\([\s\S]*?<div[\s\S]*?ref=\{menuRef\}[\s\S]*?className="fixed z-\[9999\] min-w-\[220px\] rounded-xl border border-slate-200 bg-white p-1\.5 shadow-2xl overflow-hidden"[\s\S]*?style=\{\{ top: position\.y !== null \? position\.y : contextMenu\.y, left: position\.x !== null \? position\.x : contextMenu\.x, opacity: position\.x !== null \? 1 : 0 \}\}[\s\S]*?onClick=\{\(e\) => e\.stopPropagation\(\)\}[\s\S]*?onContextMenu=\{\(e\) => e\.preventDefault\(\)\}[\s\S]*?>/m;

content = content.replace(contextMenuComponentRegex, menuReplacement);

const closeDivRegex = /<\/div>,\s*document\.body\s*\);\s*\}\s*$/m;
const mobilePortalLogic = `
    </div>
  );

  return createPortal(
    isMobile ? (
      <div 
        className="fixed inset-0 z-[9999] flex items-end bg-slate-900/40 backdrop-blur-sm sm:hidden"
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div 
          ref={menuRef}
          className="w-full max-h-[85vh] rounded-t-2xl bg-white shadow-2xl transition-transform"
          onClick={(e) => e.stopPropagation()}
        >
          {contentUI}
        </div>
      </div>
    ) : (
      <div
        ref={menuRef}
        className="fixed z-[9999] min-w-[220px] max-w-[calc(100vw-24px)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl overflow-hidden hidden sm:block"
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
`;

content = content.replace(closeDivRegex, mobilePortalLogic);

fs.writeFileSync(targetFile, content);
console.log('Patched document-workspace.tsx');
