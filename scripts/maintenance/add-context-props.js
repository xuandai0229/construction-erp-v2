const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

const target = `        canUpload={canUploadToCurrentFolder}
        canCreateFolder={canManageFolders}
      />`;

const replacement = `        canUpload={canUploadToCurrentFolder}
        canCreateFolder={canManageFolders}
        isTrashView={isTrashView}
        onRestore={() => {
          if (contextMenu?.type === "folder" && contextMenu.targetId) {
            handleRestore("folder", contextMenu.targetId);
          } else if (contextMenu?.type === "file" && contextMenu.targetId) {
            handleRestore("file", contextMenu.targetId);
          }
        }}
        onPermanentDelete={() => {
          if (contextMenu?.type === "folder" && contextMenu.targetId) {
            handlePermanentDelete("folder", contextMenu.targetId);
          } else if (contextMenu?.type === "file" && contextMenu.targetId) {
            handlePermanentDelete("file", contextMenu.targetId);
          }
        }}
      />`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
