const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

content = content.replace(
  /  const selectedFolderRule = selectedFolderData\n    \? getDocumentRule\(formatDocumentFolderName\(selectedFolderData\.name\)\)\n    : null;/g,
  `  const selectedFolderRule = selectedFolderData
    ? getDocumentRule(formatDocumentFolderName(selectedFolderData.name))
    : null;

  const deletedFolderById = useMemo(
    () => new Map(deletedFolders.map((folder) => [folder.id, folder])),
    [deletedFolders]
  );
  const selectedTrashFolderData = isTrashView && selectedTrashFolderId ? deletedFolders.find(f => f.id === selectedTrashFolderId) : null;
  const selectedTrashFolderPath = useMemo(() => {
    if (!isTrashView || !selectedTrashFolderId) return [];
    const chain: FolderItem[] = [];
    let currentId: string | null = selectedTrashFolderId;
    while (currentId) {
      const folder = deletedFolderById.get(currentId);
      if (!folder) break;
      chain.unshift(folder);
      currentId = folder.parentId;
    }
    return chain;
  }, [deletedFolderById, isTrashView, selectedTrashFolderId]);`
);

// We need to filter displayFolders and displayDocs based on selectedTrashFolderId!
// When in trash view, if selectedTrashFolderId is null, we show ALL deleted root folders (folders whose parent is not deleted or null). Wait!
// Actually, if selectedTrashFolderId is null, maybe we just show all items that are explicitly "trashed roots"?
// Trashed roots: items whose parentId is null OR whose parentId is NOT in deletedFolders.
content = content.replace(
  /  const displayFolders = useMemo\(\(\) => \{\n    if \(!isTrashView\) return \[\];\n    let filtered = deletedFolders;\n    if \(searchQuery\) \{/g,
  `  const displayFolders = useMemo(() => {
    if (!isTrashView) return [];
    let filtered = deletedFolders;
    
    if (selectedTrashFolderId) {
      filtered = filtered.filter(f => f.parentId === selectedTrashFolderId);
    } else {
      // Root trash items: no parent, or parent is not in deletedFolders
      filtered = filtered.filter(f => !f.parentId || !deletedFolderById.has(f.parentId));
    }

    if (searchQuery) {`
);

content = content.replace(
  /  const displayDocs = useMemo\(\(\) => \{\n    let filtered = isTrashView \n      \? localDocuments \n      : localDocuments\.filter\(\(document\) => document\.folderId === selectedFolderId\);/g,
  `  const displayDocs = useMemo(() => {
    let filtered = localDocuments;
    if (isTrashView) {
      if (selectedTrashFolderId) {
        filtered = filtered.filter(doc => doc.folderId === selectedTrashFolderId);
      } else {
        // Root trash items: folder is null, or folder is not in deletedFolders
        filtered = filtered.filter(doc => !doc.folderId || !deletedFolderById.has(doc.folderId));
      }
    } else {
      filtered = filtered.filter((document) => document.folderId === selectedFolderId);
    }`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
