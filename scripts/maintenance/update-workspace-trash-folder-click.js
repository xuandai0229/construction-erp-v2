const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// Make trash folders clickable
content = content.replace(
  /                            className="group relative flex cursor-pointer flex-col rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-red-300 hover:shadow-md"/g,
  `                            className="group relative flex cursor-pointer flex-col rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-red-300 hover:shadow-md"
                            onClick={() => setSelectedTrashFolderId(folder.id)}`
);

// Update empty state text
content = content.replace(
  /                        \? "Thùng rác đang trống"/g,
  `                        ? (selectedTrashFolderId ? "Không có tài liệu trong thư mục đã xóa này" : "Thùng rác đang trống")`
);

// We also need to fix the crash in `canRenameDocument` and `canDeleteDocument` which uses `selectedFolderData!.id`.
// Actually, `canRenameDocument` takes a `DocumentItem` and a `FolderItem`. In trash view, we can just skip rendering these buttons entirely.
content = content.replace(
  /\{canRenameDocument\(sessionUser/g,
  `{!isTrashView && canRenameDocument(sessionUser`
);

content = content.replace(
  /\{canDeleteDocument\(sessionUser/g,
  `{!isTrashView && canDeleteDocument(sessionUser`
);

content = content.replace(
  /\{canEditDocumentMetadata\(sessionUser/g,
  `{!isTrashView && canEditDocumentMetadata(sessionUser`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
