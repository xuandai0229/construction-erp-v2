const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// Update selectFolder
content = content.replace(
  /    \(folder: FolderItem\) => \{\n      setSelectedFolderId\(folder\.id\);\n      if \(\(foldersByParentId\.get\(folder\.id\)\?/g,
  `    (folder: FolderItem) => {
      setIsTrashView(false);
      setSelectedFolderId(folder.id);
      if ((foldersByParentId.get(folder.id)?`
);

// Update header title in Trash View to "Thùng rác"
content = content.replace(
  /                  <div className="min-w-0">\n                    <h2 className="truncate text-2xl font-bold tracking-tight text-slate-950">\n                      \{isTrashView\n                        \? "Thùng rác"\n                        : selectedFolderId && selectedFolderData\n                        \? selectedFolderDisplayName\n                        : "Tất cả tài liệu"\}\n                    <\/h2>/g,
  `                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-bold tracking-tight text-slate-950">
                      {isTrashView
                        ? "Thùng rác"
                        : selectedFolderId && selectedFolderData
                        ? selectedFolderDisplayName
                        : "Tất cả tài liệu"}
                    </h2>`
);

// We need to add deletedAt rendering to documents if it's trash view.
// In document rendering:
content = content.replace(
  /                              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">\n                                <span>\n                                  \{format\(\n                                    new Date\(document\.createdAt\),\n                                    "dd\/MM\/yyyy HH:mm",\n                                  \)\}\n                                <\/span>/g,
  `                              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                <span>
                                  {isTrashView && (document as any).deletedAt 
                                    ? \`Xóa lúc: \$\{format(new Date((document as any).deletedAt), "dd/MM/yyyy HH:mm")}\`
                                    : format(new Date(document.createdAt), "dd/MM/yyyy HH:mm")}
                                </span>`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
