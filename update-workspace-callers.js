const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// Replace FolderNode delete
content = content.replace(
  /onClick=\{\(event\) => \{\s*event\.stopPropagation\(\);\s*setDeleteConfirm\(\{\s*isOpen: true,\s*type: "folder",\s*id: folder\.id,\s*\}\);\s*\}\}/g,
  'onClick={(event) => {\n                      event.stopPropagation();\n                      executeSoftDelete("folder", folder.id);\n                    }}'
);

// Replace DocumentViewer delete
content = content.replace(
  /onDelete=\{\(\) =>\s*setDeleteConfirm\(\{\s*isOpen: true,\s*type: "doc",\s*id: selectedDocument\.id,\s*\}\)\s*\}/g,
  'onDelete={() =>\n            executeSoftDelete("doc", selectedDocument.id)\n          }'
);

// Replace DocumentContextMenu delete
content = content.replace(
  /onDelete=\{\(\) => \{\s*if \(contextMenu\?\.type === "folder" && contextMenu\.targetId\) \{\s*setDeleteConfirm\(\{ isOpen: true, type: "folder", id: contextMenu\.targetId \}\);\s*\} else if \(contextMenu\?\.type === "file" && contextMenu\.targetId\) \{\s*setDeleteConfirm\(\{ isOpen: true, type: "doc", id: contextMenu\.targetId \}\);\s*\}\s*\}\}/g,
  `onDelete={() => {
          if (contextMenu?.type === "folder" && contextMenu.targetId) {
            executeSoftDelete("folder", contextMenu.targetId);
          } else if (contextMenu?.type === "file" && contextMenu.targetId) {
            executeSoftDelete("doc", contextMenu.targetId);
          }
        }}
        onRestore={() => {
          if (contextMenu?.type === "folder" && contextMenu.targetId) {
            handleRestore("folder", contextMenu.targetId);
          } else if (contextMenu?.type === "file" && contextMenu.targetId) {
            handleRestore("doc", contextMenu.targetId);
          }
        }}
        onPermanentDelete={() => {
          if (contextMenu?.type === "folder" && contextMenu.targetId) {
            setDeleteConfirm({ isOpen: true, type: "folder", id: contextMenu.targetId });
          } else if (contextMenu?.type === "file" && contextMenu.targetId) {
            setDeleteConfirm({ isOpen: true, type: "doc", id: contextMenu.targetId });
          }
        }}`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
