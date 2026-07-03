const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// The grid layout is defined by density:
// comfortable: grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4
// compact: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5
// list: flex flex-col gap-2

content = content.replace(
  /            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">\n              \{displayDocs\.length > 0 \|\| displayFolders\.length > 0 \? \(/g,
  `            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
              {(() => {
                const totalVisibleItems = displayFolders.length + displayDocs.length;
                const density = totalVisibleItems >= 18 ? "list" : totalVisibleItems >= 8 ? "compact" : "comfortable";
                
                return displayDocs.length > 0 || displayFolders.length > 0 ? (
                  <div className="space-y-8">
                    {displayFolders.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-700">
                            {isTrashView
                              ? selectedTrashFolderData
                                ? \`Thư mục trong \${selectedTrashFolderData.name}\`
                                : "Thư mục đã xóa"
                              : selectedFolderId 
                                ? "Mục bên trong" 
                                : "Thư mục gốc"}
                          </h3>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {displayFolders.length} mục
                          </span>
                        </div>
                        <div className={\`\${density === 'list' ? 'flex flex-col gap-2' : density === 'compact' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}\`}>
                          {displayFolders.map((folder) => {
                            const isDeleted = !!(folder as any).deletedAt;
                            return (
                              <article
                                key={folder.id}
                                className={\`group relative flex cursor-pointer transition-all hover:shadow-md \${
                                  density === 'list' 
                                    ? 'flex-row items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3' 
                                    : 'flex-col rounded-lg border border-slate-200 bg-white p-4 hover:-translate-y-0.5'
                                } \${isTrashView ? 'hover:border-red-300' : 'hover:border-blue-300'}\`}
                                onClick={() => {
                                  if (isTrashView) {
                                    setSelectedTrashFolderId(folder.id);
                                  } else {
                                    setSelectedFolderId(folder.id);
                                  }
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setContextMenu({
                                    type: "folder",
                                    targetId: folder.id,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                              >
                                <div className={\`flex items-center justify-center rounded-lg \${density === 'list' ? 'h-10 w-10 shrink-0 bg-blue-50/50' : 'mb-3 h-12 w-12 bg-blue-50/50'}\`}>
                                  <Folder className={\`\${isTrashView ? 'text-red-400' : 'text-blue-500'} \${density === 'list' ? 'h-5 w-5' : 'h-6 w-6'}\`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={\`truncate font-semibold text-slate-900 \${density === 'compact' ? 'text-sm' : 'text-sm'}\`}>
                                    {folder.name}
                                  </p>
                                  {density !== 'compact' && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      {isDeleted 
                                        ? \`Đã xóa lúc: \${format(new Date((folder as any).deletedAt), "dd/MM/yyyy HH:mm")}\`
                                        : \`Thư mục hồ sơ\`}
                                    </p>
                                  )}
                                </div>
                                {isDeleted && density === 'list' && (
                                  <span className="text-xs text-red-500 font-medium">Đã xóa</span>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    )}`
);

content = content.replace(
  /                  <div className="space-y-8">\n                    \{displayFolders\.length > 0 && \([\s\S]*?<\/div>\n                    \)\}/,
  "" // Remove old displayFolders render block entirely, we just injected it above.
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
