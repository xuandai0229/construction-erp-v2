const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// Fix displayFolders to handle isTrashView === false
content = content.replace(
  /  const displayFolders = useMemo\(\(\) => \{\n    if \(!isTrashView\) return \[\];\n    let filtered = deletedFolders;\n    \n    if \(selectedTrashFolderId\) \{\n      filtered = filtered\.filter\(f => f\.parentId === selectedTrashFolderId\);\n    \} else \{\n      \/\/ Root trash items: no parent, or parent is not in deletedFolders\n      filtered = filtered\.filter\(f => !f\.parentId \|\| !deletedFolderById\.has\(f\.parentId\)\);\n    \}\n\n    if \(searchQuery\) \{\n      const query = searchQuery\.toLowerCase\(\);\n      filtered = filtered\.filter\(\(folder\) => folder\.name\.toLowerCase\(\)\.includes\(query\)\);\n    \}\n    return filtered;\n  \}, \[deletedFolders, isTrashView, searchQuery, selectedTrashFolderId, deletedFolderById\]\);/g,
  `  const displayFolders = useMemo(() => {
    let filtered = isTrashView ? deletedFolders : folders;
    
    if (isTrashView) {
      if (selectedTrashFolderId) {
        filtered = filtered.filter(f => f.parentId === selectedTrashFolderId);
      } else {
        filtered = filtered.filter(f => !f.parentId || !deletedFolderById.has(f.parentId));
      }
    } else {
      if (selectedFolderId) {
        filtered = filtered.filter(f => f.parentId === selectedFolderId);
      } else {
        filtered = filtered.filter(f => !f.parentId);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((folder) => folder.name.toLowerCase().includes(query));
    }
    return filtered;
  }, [deletedFolders, folders, isTrashView, searchQuery, selectedTrashFolderId, selectedFolderId, deletedFolderById]);`
);

// We need to update the toolbar (Search, Filter, Sort) to be cleaner.
// And we need to implement the popover. Instead of popover, we can just use a floating panel or keep it simple. The user asked for a popover/dropdown.
// Let's replace the whole toolbar section. First, we need to know what it looks like.

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
