const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// 1. Refactor Back button styling
const backButtonRegex = /                <div className="mb-3 flex items-center gap-2">\n                  \{isTrashView \? \([\s\S]*?                  \)\} : null\n                  \)\}\n                <\/div>/;

const newBackButton = `                <div className="mb-3 flex items-center gap-2">
                  {isTrashView ? (
                    selectedTrashFolderId ? (
                      <button
                        type="button"
                        onClick={() => setSelectedTrashFolderId(selectedTrashFolderData?.parentId || null)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 hover:shadow"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {selectedTrashFolderData?.parentId ? 'Quay lại' : 'Thùng rác'}
                      </button>
                    ) : null
                  ) : (
                    selectedFolderId ? (
                      <button
                        type="button"
                        onClick={() => {
                          const url = new URL(window.location.href);
                          if (selectedFolderData?.parentId) {
                            url.searchParams.set("folder", selectedFolderData.parentId);
                          } else {
                            url.searchParams.delete("folder");
                          }
                          window.history.pushState({}, "", url.toString());
                          setSelectedFolderId(selectedFolderData?.parentId || null);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 hover:shadow"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {selectedFolderData?.parentId ? 'Quay lại' : 'Tất cả tài liệu'}
                      </button>
                    ) : null
                  )}
                </div>`;
content = content.replace(backButtonRegex, newBackButton);

// 2. Refactor Toolbar
const toolbarRegex = /                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3">\n                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">[\s\S]*?                        <\/div>\n                      \)\}\n                    <\/div>\n                  <\/div>/;

const newToolbar = `                  {/* TODO: Advanced filters can be reintroduced as a polished popover later. */}
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm tài liệu, thư mục hoặc file gốc..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 pl-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <div className="relative flex shrink-0 items-center">
                      <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value as SortOption)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all hover:bg-slate-50 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option className="bg-white text-slate-900" value="NEWEST">Mới nhất</option>
                        <option className="bg-white text-slate-900" value="OLDEST">Cũ nhất</option>
                        <option className="bg-white text-slate-900" value="NAME">Tên A-Z</option>
                        <option className="bg-white text-slate-900" value="SIZE">Kích thước</option>
                      </select>
                    </div>
                  </div>`;

content = content.replace(toolbarRegex, newToolbar);

// Remove active filter tags display if any
const filterTagsRegex = /                  \{activeFilterCount > 0 && \([\s\S]*?                  \)\}/;
content = content.replace(filterTagsRegex, "");

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
