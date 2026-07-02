const fs = require('fs');

let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

content = content.replace(
  /canCreateFolder=\{!!canCreateFolderContextually\}\s*\/>/m,
  `canCreateFolder={!!canCreateFolderContextually}
        isTrashView={isTrashView}
      />`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
