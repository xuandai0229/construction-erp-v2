const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

const target = `  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  const foldersByParentId = useMemo(() => {
    const map = new Map<string | null, FolderItem[]>();
    for (const folder of folders) {
      const siblings = map.get(folder.parentId) || [];
      siblings.push(folder);
      map.set(folder.parentId, siblings);
    }
    return map;
  }, [folders]);`;

const replacement = `  const activeFolders = useMemo(() => {
    if (!isTrashView) return folders;
    // In trash view, flatten all deleted folders so they show up in the root
    return deletedFolders.map(f => ({ ...f, parentId: null }));
  }, [folders, deletedFolders, isTrashView]);

  const folderById = useMemo(
    () => new Map(activeFolders.map((folder) => [folder.id, folder])),
    [activeFolders],
  );

  const foldersByParentId = useMemo(() => {
    const map = new Map<string | null, FolderItem[]>();
    for (const folder of activeFolders) {
      const siblings = map.get(folder.parentId) || [];
      siblings.push(folder);
      map.set(folder.parentId, siblings);
    }
    return map;
  }, [activeFolders]);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
