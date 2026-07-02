const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// Insert displayFolders mapping
content = content.replace(
  /                <div className="space-y-8">\n                  \{Object\.entries\(groupedDocs\)\.map/g,
  `                <div className="space-y-8">
                  {displayFolders.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-700">Thư mục đã xóa</h3>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {displayFolders.length} thư mục
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {displayFolders.map((folder) => (
                          <article
                            key={folder.id}
                            className="group relative flex cursor-pointer flex-col rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-red-300 hover:shadow-md"
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
                            <div className="mb-3 flex items-start gap-3">
                              <Folder className="h-8 w-8 text-slate-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {folder.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {(folder as any).deletedAt && format(new Date((folder as any).deletedAt), "dd/MM/yyyy HH:mm")}
                              </p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.entries(groupedDocs).map`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
