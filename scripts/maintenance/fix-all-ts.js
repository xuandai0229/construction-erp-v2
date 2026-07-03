const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// remove folderRenameModal
content = content.replace(/\{folderRenameModal\.isOpen[\s\S]*?handleRenameFolder\}\r?\n?\s*\/>\r?\n?\s*\}/g, "");

// fix doc.metadata?.note
content = content.replace(/note:\s*doc\.metadata\?\.note\s*\|\|\s*"",/g, 'note: (doc.metadata as any)?.note || "",');

// fix canUploadToCurrentFolder -> canUpload
content = content.replace(/canUpload=\{canUploadToCurrentFolder\}/g, 'canUpload={canUpload}');

// fix canManageFolders -> canCreateFolderContextually
content = content.replace(/canCreateFolder=\{canManageFolders\}/g, 'canCreateFolder={canCreateFolderContextually}');

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
