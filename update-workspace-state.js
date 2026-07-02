const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

content = content.replace(
  /  const \[isTrashView, setIsTrashView\] = useState\(false\);\n\n  useEffect/g,
  `  const [isTrashView, setIsTrashView] = useState(false);
  const [selectedTrashFolderId, setSelectedTrashFolderId] = useState<string | null>(null);

  useEffect`
);

content = content.replace(
  /    \(folder: FolderItem\) => \{\n      setIsTrashView\(false\);\n      setSelectedFolderId\(folder\.id\);/g,
  `    (folder: FolderItem) => {
      setIsTrashView(false);
      setSelectedTrashFolderId(null);
      setSelectedFolderId(folder.id);`
);

content = content.replace(
  /            onClick=\{\(\) => \{\n              setIsTrashView\(true\);\n              setSelectedFolderId\(null\);\n            \}\}/g,
  `            onClick={() => {
              setIsTrashView(true);
              setSelectedTrashFolderId(null);
              setSelectedFolderId(null);
            }}`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
