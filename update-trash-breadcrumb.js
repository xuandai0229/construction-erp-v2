const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// Update breadcrumb for Trash View
content = content.replace(
  /                  \{isTrashView \? \(\n                    <span className="flex min-w-0 items-center gap-1\.5">\n                      <span className="text-slate-300">\/<\/span>\n                      <span className="font-semibold text-slate-900">Thùng rác<\/span>\n                    <\/span>\n                  \) : \(/g,
  `                  {isTrashView ? (
                    <>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="text-slate-300">/</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTrashFolderId(null)}
                          className={\`max-w-[180px] truncate text-left transition-colors \${
                            !selectedTrashFolderId ? "font-semibold text-slate-900" : "hover:text-blue-600 hover:underline"
                          }\`}
                        >
                          Thùng rác
                        </button>
                      </span>
                      {selectedTrashFolderPath.map((folder) => {
                        const isCurrent = folder.id === selectedTrashFolderId;
                        return (
                          <span key={folder.id} className="flex min-w-0 items-center gap-1.5">
                            <span className="text-slate-300">/</span>
                            <button
                              type="button"
                              onClick={() => !isCurrent && setSelectedTrashFolderId(folder.id)}
                              className={\`max-w-[180px] truncate text-left transition-colors \${
                                isCurrent
                                  ? "font-semibold text-slate-900"
                                  : "hover:text-blue-600 hover:underline"
                              }\`}
                              title={folder.name}
                            >
                              {folder.name}
                            </button>
                          </span>
                        );
                      })}
                    </>
                  ) : (`
);

// Update Header Text for Trash View
content = content.replace(
  /                    <h2 className="truncate text-2xl font-bold tracking-tight text-slate-950">\n                      \{isTrashView\n                        \? "Thùng rác"\n                        : selectedFolderId && selectedFolderData\n                        \? selectedFolderDisplayName\n                        : "Tất cả tài liệu"\}\n                    <\/h2>/g,
  `                    <h2 className="truncate text-2xl font-bold tracking-tight text-slate-950">
                      {isTrashView
                        ? (selectedTrashFolderData ? selectedTrashFolderData.name : "Thùng rác")
                        : selectedFolderId && selectedFolderData
                        ? selectedFolderDisplayName
                        : "Tất cả tài liệu"}
                    </h2>
                    {isTrashView && selectedTrashFolderData && (selectedTrashFolderData as any).deletedAt && (
                      <p className="mt-1 text-sm text-slate-500">
                        Đã xóa lúc: {format(new Date((selectedTrashFolderData as any).deletedAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    )}`
);

// Also we should hide the Upload button when viewing inside a Trash Folder
content = content.replace(
  /              <div className="flex shrink-0 items-center gap-2">/g,
  `              <div className="flex shrink-0 items-center gap-2">
                {!isTrashView && (`
);

content = content.replace(
  /                  <\/Button>\n                \)\}\n              <\/div>/g,
  `                  </Button>
                )}
                )}
              </div>`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
