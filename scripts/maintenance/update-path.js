const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

const target = `  const selectedFolderData = folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const selectedFolderDisplayName = selectedFolderData
    ? formatDocumentFolderName(selectedFolderData.name)
    : "";
  const selectedParentFolder = selectedFolderData?.parentId
    ? folderById.get(selectedFolderData.parentId)
    : null;
  const selectedFolderPath = selectedFolderId
    ? [
        ...buildFolderAncestorChain(folders, selectedFolderId)
          .map((id) => folders.find((f) => f.id === id))
          .filter((f): f is FolderItem => f !== undefined),
        selectedFolderData,
      ].filter((f): f is FolderItem => f !== undefined)
    : [];`;

const replacement = `  const selectedFolderData = activeFolders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const selectedFolderDisplayName = selectedFolderData
    ? formatDocumentFolderName(selectedFolderData.name)
    : "";
  const selectedParentFolder = selectedFolderData?.parentId
    ? folderById.get(selectedFolderData.parentId)
    : null;
  const selectedFolderPath = selectedFolderId
    ? [
        ...buildFolderAncestorChain(activeFolders, selectedFolderId)
          .map((id) => activeFolders.find((f) => f.id === id))
          .filter((f): f is FolderItem => f !== undefined),
        selectedFolderData,
      ].filter((f): f is FolderItem => f !== undefined)
    : [];`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
