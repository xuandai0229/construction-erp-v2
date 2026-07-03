const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// The replacement was meant to replace the folder mapping block.
const blockToReplaceRegex = /                      <div className="mb-3 flex items-center gap-2">\n                        <h3 className="text-sm font-bold text-slate-700">\n                          \{isTrashView\n                            \? selectedTrashFolderData\n                              \? `Thư mục trong \$\{selectedTrashFolderData\.name\}`\n                              : "Thư mục đã xóa"\n                            : "Thư mục con"\}\n                        <\/h3>\n                        <span className="rounded-full bg-slate-200 px-2 py-0\.5 text-\[10px\] font-bold text-slate-600">\n                          \{displayFolders\.length\} thư mục\n                        <\/span>\n                      <\/div>\n                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">\n                        \{displayFolders\.map\(\(folder\) => \([\s\S]*?<\/article>\n                        \)\)\}\n                      <\/div>/;

const newBlock = `                      <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-700">
                          {isTrashView
                            ? selectedTrashFolderData
                              ? \`Thư mục trong \${selectedTrashFolderData.name}\`
                              : "Thư mục đã xóa"
                            : selectedFolderId 
                              ? "Thư mục con" 
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
                      </div>`;

content = content.replace(blockToReplaceRegex, newBlock);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
