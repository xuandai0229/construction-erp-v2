const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// 1. Ensure `ArrowLeft` and `ArrowUp` are imported.
if (!content.includes('ArrowLeft')) {
  content = content.replace('ArrowRight,', 'ArrowRight, ArrowLeft, ArrowUp,');
}

// 2. Add navigation buttons above the breadcrumb.
const breadcrumbRegex = /                <nav className="mb-2 flex min-w-0 flex-wrap items-center gap-1\.5 text-xs font-medium text-slate-500">/;
const newBreadcrumb = `                <div className="mb-3 flex items-center gap-2">
                  {isTrashView ? (
                    selectedTrashFolderId ? (
                      <button
                        type="button"
                        onClick={() => setSelectedTrashFolderId(selectedTrashFolderData?.parentId || null)}
                        className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {selectedTrashFolderData?.parentId ? 'Lên cấp trên' : 'Về Thùng rác'}
                      </button>
                    ) : null
                  ) : (
                    selectedFolderId ? (
                      <button
                        type="button"
                        onClick={() => {
                          // Note: updating URL query string to clear it or match parent
                          const url = new URL(window.location.href);
                          if (selectedFolderData?.parentId) {
                            url.searchParams.set("folder", selectedFolderData.parentId);
                          } else {
                            url.searchParams.delete("folder");
                          }
                          window.history.pushState({}, "", url.toString());
                          setSelectedFolderId(selectedFolderData?.parentId || null);
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {selectedFolderData?.parentId ? 'Lên thư mục cha' : 'Tất cả tài liệu'}
                      </button>
                    ) : null
                  )}
                </div>
                <nav className="mb-2 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">`;

content = content.replace(breadcrumbRegex, newBreadcrumb);

// 3. Update the Trash breadcrumb to use `formatDocumentFolderName(folder.name)`
const trashBreadcrumbFolderRegex = /                              title=\{folder\.name\}\n                            >\n                              \{folder\.name\}\n                            <\/button>/g;
const newTrashBreadcrumbFolder = `                              title={formatDocumentFolderName(folder.name)}
                            >
                              {formatDocumentFolderName(folder.name)}
                            </button>`;
content = content.replace(trashBreadcrumbFolderRegex, newTrashBreadcrumbFolder);

// 4. Update the Workspace Title `selectedTrashFolderData ? selectedTrashFolderData.name : "Thùng rác"`
const workspaceTitleRegex = /\{isTrashView\n                        \? \(selectedTrashFolderData \? selectedTrashFolderData\.name : "Thùng rác"\)/;
const newWorkspaceTitle = `{isTrashView
                        ? (selectedTrashFolderData ? formatDocumentFolderName(selectedTrashFolderData.name) : "Thùng rác")`;
content = content.replace(workspaceTitleRegex, newWorkspaceTitle);

// 5. Update subtitle for trash folder
const subtitleTrashRegex = /Các tài liệu và thư mục đã xóa tạm thời\. Admin có thể xóa vĩnh viễn hoặc khôi phục dữ liệu tại đây\./;
const newSubtitleTrash = `Các tài liệu và thư mục đã xóa tạm thời.`;
content = content.replace(subtitleTrashRegex, newSubtitleTrash);

const subtitleTrashCodeRegex = /                      \{isTrashView\n                        \? "Các tài liệu và thư mục đã xóa tạm thời\."\n                        : selectedFolderId && selectedFolderData/;
const newSubtitleTrashCode = `                      {isTrashView
                        ? selectedTrashFolderId 
                          ? "Xem nội dung đã xóa bên trong thư mục này." 
                          : "Các tài liệu và thư mục đã xóa tạm thời. Admin có thể khôi phục dữ liệu tại đây."
                        : selectedFolderId && selectedFolderData`;
content = content.replace(subtitleTrashCodeRegex, newSubtitleTrashCode);

// 6. Fix subtitle for active folder (don't use thư mục con too much)
const activeFolderSubtitleRegex = /Thư mục con trong \$\{formatDocumentFolderName\(selectedParentFolder\.name\)\}/;
const newActiveFolderSubtitle = `Tài liệu và mục bên trong của \${formatDocumentFolderName(selectedParentFolder.name)}`;
content = content.replace(activeFolderSubtitleRegex, newActiveFolderSubtitle);

const rootActiveFolderSubtitleRegex = /Chọn thư mục bên trái để xem hoặc tải hồ sơ theo đúng vị trí\./;
const newRootActiveFolderSubtitle = `Chọn thư mục bên trái hoặc mở trực tiếp các thư mục bên dưới.`;
content = content.replace(rootActiveFolderSubtitleRegex, newRootActiveFolderSubtitle);

// 7. Folder Card Display Name formatting in Grid
const folderCardNameRegex = /\{folder\.name\}\n                                  <\/p>/g;
const newFolderCardName = `{formatDocumentFolderName(folder.name)}
                                  </p>`;
content = content.replace(folderCardNameRegex, newFolderCardName);

// 8. Upload buttons redesign in Header
const uploadBtnRegex = /                \{!isTrashView && canUpload \? \(\n                  <>\n                    <input\n                      type="file"\n                      className="hidden"\n                      ref=\{fileInputRef\}\n                      onChange=\{handleFileSelected\}\n                      accept=\{selectedFolderRule\?\.accept \|\| systemSettings\?\.allowedExtensions\}\n                      capture=\{\n                        selectedFolderRule\?\.key === "07_Hình ảnh hiện trường"\n                          \? "environment"\n                          : undefined\n                      \}\n                    \/>\n                    <Button\n                      onClick=\{\(\) => fileInputRef\.current\?\.click\(\)\}\n                      disabled=\{isUploading\}\n                      className="h-10 w-full rounded-lg shadow-sm shadow-blue-600\/20 sm:w-auto"\n                    >\n                      <UploadCloud className="mr-2 h-4 w-4" \/>\n                      \{isUploading \? "Đang tải\.\.\." : "Tải tài liệu lên thư mục này"\}\n                    <\/Button>\n                  <\/>\n                \) : null\}/;

const newUploadBtn = `                {!isTrashView && canUpload ? (
                  <>
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileSelected}
                      accept={selectedFolderRule?.accept || systemSettings?.allowedExtensions}
                      capture={
                        selectedFolderRule?.key === "07_Hình ảnh hiện trường"
                          ? "environment"
                          : undefined
                      }
                    />
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      {selectedFolderId && (
                        <Button
                          variant="outline"
                          onClick={() => setCreateFolderModal(true)}
                          className="h-10 w-full rounded-lg sm:w-auto border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                        >
                          <FolderPlus className="mr-2 h-4 w-4" />
                          Tạo mục bên trong
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || !selectedFolderId}
                        className={\`h-10 w-full rounded-lg shadow-sm sm:w-auto \${!selectedFolderId ? 'opacity-70 cursor-not-allowed' : 'shadow-blue-600/20'}\`}
                        title={!selectedFolderId ? "Hãy chọn hoặc mở một thư mục để tải tài liệu lên" : undefined}
                      >
                        <UploadCloud className="mr-2 h-4 w-4" />
                        {isUploading ? "Đang tải..." : selectedFolderId ? "Tải tài liệu lên thư mục này" : "Tải tài liệu lên"}
                      </Button>
                    </div>
                  </>
                ) : null}`;

content = content.replace(uploadBtnRegex, newUploadBtn);


fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
