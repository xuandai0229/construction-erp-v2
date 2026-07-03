const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

const target = `    setExpandedFolderIds((current) => {
      const next = new Set(current);
      for (const ancestorId of buildFolderAncestorChain(folders, nextFolderId)) {
        next.add(ancestorId);
      }
      if (nextFolderId && (foldersByParentId.get(nextFolderId)?.length || 0) > 0) {
        next.add(nextFolderId);
      }
      return next;
    });
  }, [folderById, folderFromUrl, folders, foldersByParentId]);`;

const replacement = `    setExpandedFolderIds((current) => {
      const next = new Set(current);
      for (const ancestorId of buildFolderAncestorChain(activeFolders, nextFolderId)) {
        next.add(ancestorId);
      }
      if (nextFolderId && (foldersByParentId.get(nextFolderId)?.length || 0) > 0) {
        next.add(nextFolderId);
      }
      return next;
    });
  }, [folderById, folderFromUrl, activeFolders, foldersByParentId]);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
