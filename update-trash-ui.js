const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// Update trash folder card UI
content = content.replace(
  /                                \}\}\n                              >\n                                <div className="mb-3 flex items-start gap-3">/g,
  `                                }}
                              >
                                <div className="mb-3 flex items-start justify-between gap-3">`
);

content = content.replace(
  /                                <div className="mb-3 flex items-start justify-between gap-3">\n                                  <Folder className="h-8 w-8 text-slate-400" \/>/g,
  `                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <Folder className="h-8 w-8 text-slate-400" />
                                  <span className="text-[10px] font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                                    Mở để xem
                                  </span>`
);

// If the folder is restored while being viewed, we need to handle it.
// `handleRestore` for folder:
// If the restored folder is currently `selectedTrashFolderId`, or is an ancestor, we probably just let React render it out. 
// If it's removed from Trash, `isTrashView` doesn't change, but `selectedTrashFolderId` might now point to an active folder. We should clear it if it's no longer in Trash!
content = content.replace(
  /        const result = await restoreFolder\(projectId, id\);\n        if \(result\?\.error\) \{\n          toast\.error\(result\.error\);\n          router\.refresh\(\);\n        \} else \{\n          toast\.success\("Đã khôi phục thư mục"\);\n          router\.refresh\(\);\n        \}/g,
  `        const result = await restoreFolder(projectId, id);
        if (result?.error) {
          toast.error(result.error);
          router.refresh();
        } else {
          toast.success("Đã khôi phục thư mục");
          // If we restored the folder we are currently viewing, or any folder, just clear the trash view state if needed.
          if (selectedTrashFolderId === id) setSelectedTrashFolderId(null);
          router.refresh();
        }`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
