const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// Update displayDocs
content = content.replace(
  /  const displayDocs = useMemo\(\(\) => \{\n    let filtered = localDocuments\.filter\(\n      \(document\) => document\.folderId === selectedFolderId,\n    \);/g,
  `  const displayDocs = useMemo(() => {
    let filtered = isTrashView 
      ? localDocuments 
      : localDocuments.filter((document) => document.folderId === selectedFolderId);`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
