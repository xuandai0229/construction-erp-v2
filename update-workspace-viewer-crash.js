const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// Fix the DocumentViewer props evaluation
content = content.replace(
  /          canRename=\{\!isTrashView && canRenameDocument\(sessionUser, \{ id: selectedDocument\.id, status: selectedDocument\.status, uploadedById: selectedDocument\.uploadedById \}, \{ id: selectedFolderData!\.id, name: selectedFolderData!\.name \}\)\}\n          canDelete=\{\!isTrashView && canDeleteDocument\(sessionUser, \{ id: selectedDocument\.id, status: selectedDocument\.status, uploadedById: selectedDocument\.uploadedById \}, \{ id: selectedFolderData!\.id, name: selectedFolderData!\.name \}\)\}\n          canEditMetadata=\{\!isTrashView && canEditDocumentMetadata\(sessionUser, \{ id: selectedDocument\.id, status: selectedDocument\.status, uploadedById: selectedDocument\.uploadedById \}, \{ id: selectedFolderData!\.id, name: selectedFolderData!\.name \}\)\}/g,
  `          canRename={!isTrashView && canRenameDocument(sessionUser, { id: selectedDocument.id, status: selectedDocument.status, uploadedById: selectedDocument.uploadedById }, selectedFolderData ? { id: selectedFolderData.id, name: selectedFolderData.name } : { id: "trash", name: "Thùng rác" })}
          canDelete={!isTrashView && canDeleteDocument(sessionUser, { id: selectedDocument.id, status: selectedDocument.status, uploadedById: selectedDocument.uploadedById }, selectedFolderData ? { id: selectedFolderData.id, name: selectedFolderData.name } : { id: "trash", name: "Thùng rác" })}
          canEditMetadata={!isTrashView && canEditDocumentMetadata(sessionUser, { id: selectedDocument.id, status: selectedDocument.status, uploadedById: selectedDocument.uploadedById }, selectedFolderData ? { id: selectedFolderData.id, name: selectedFolderData.name } : { id: "trash", name: "Thùng rác" })}`
);

// We should also find all other occurrences of `selectedFolderData!.id` in the code and safely fallback.
content = content.replace(
  /\{ id: selectedFolderData!\.id, name: selectedFolderData!\.name \}/g,
  `selectedFolderData ? { id: selectedFolderData.id, name: selectedFolderData.name } : { id: "trash", name: "Thùng rác" }`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
