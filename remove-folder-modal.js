const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

const target = `      {folderRenameModal.isOpen && (
        <RenameDialog
          title="Đổi tên thư mục"
          value={folderRenameModal.newName}
          onChange={(newName) =>
            setFolderRenameModal((current) => ({ ...current, newName }))
          }
          onClose={() =>
            setFolderRenameModal({ isOpen: false, id: "", newName: "" })
          }
          onSave={handleRenameFolder}
        />
      )}`;

const replacement = ``;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
