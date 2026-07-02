const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// Update onOpen in document-workspace.tsx
content = content.replace(
  /        onOpen=\{\(\) => \{\n          if \(contextMenu\?\.type === "file" && contextMenu\.targetId\) \{\n            const doc = localDocuments\.find\(\(d\) => d\.id === contextMenu\.targetId\);\n            if \(doc\) openDocument\(doc\);\n          \}\n        \}\}/g,
  `        onOpen={() => {
          if (contextMenu?.type === "file" && contextMenu.targetId) {
            const doc = localDocuments.find((d) => d.id === contextMenu.targetId);
            if (doc) openDocument(doc);
          } else if (contextMenu?.type === "folder" && contextMenu.targetId && isTrashView) {
            setSelectedTrashFolderId(contextMenu.targetId);
          }
        }}`
);

// Update DocumentContextMenu for Trash View
const trashMenuReplacement = `      {isTrashView ? (
        <>
          {contextMenu.type === "folder" && (
            <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              Mở / Xem nội dung
            </button>
          )}
          {contextMenu.type === "file" && (
            <>
              <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                Xem chi tiết
              </button>
              <button onClick={() => { onDownload(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Tải xuống
              </button>
            </>
          )}
          <button onClick={() => { onRestore?.(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Khôi phục
          </button>
          <div className="my-1 h-px bg-slate-100"></div>
          <button onClick={() => { onPermanentDelete?.(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-red-50 text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Xóa vĩnh viễn
          </button>
        </>
      ) :`;

content = content.replace(
  /      \{isTrashView \? \(\n        <>\n          <button onClick=\{\(\) => \{ onRestore\?\.\(\); onClose\(\); \}\} className="flex w-full items-center gap-2 rounded-md px-2 py-1\.5 text-sm hover:bg-slate-100 text-slate-700">\n            <svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9\.75 9\.75 0 0 0-6\.74 2\.74L3 8"\/><path d="M3 3v5h5"\/><\/svg>\n            Khôi phục\n          <\/button>\n          <div className="my-1 h-px bg-slate-100"><\/div>\n          <button onClick=\{\(\) => \{ onPermanentDelete\?\.\(\); onClose\(\); \}\} className="flex w-full items-center gap-2 rounded-md px-2 py-1\.5 text-sm hover:bg-red-50 text-red-600">\n            <svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"\/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"\/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"\/><\/svg>\n            Xóa vĩnh viễn\n          <\/button>\n        <\/>\n      \) :/g,
  trashMenuReplacement
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
