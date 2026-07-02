const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

content = content.replace(
  /            setContextMenu\(\{\n              type: "workspace",\n              targetId: selectedFolderId \|\| undefined,\n              x: e\.clientX,\n              y: e\.clientY,\n            \}\);/g,
  `            setContextMenu({
              type: isTrashView ? (selectedTrashFolderId ? "folder" : "workspace") : "workspace",
              targetId: isTrashView ? (selectedTrashFolderId || undefined) : (selectedFolderId || undefined),
              x: e.clientX,
              y: e.clientY,
            });`
);

// If type is "workspace" in isTrashView, we shouldn't show "Khôi phục" or "Xóa vĩnh viễn" because you can't restore the root trash view.
// In `DocumentContextMenu` replacement:
content = content.replace(
  /          <button onClick=\{\(\) => \{ onRestore\?\.\(\); onClose\(\); \}\} className="flex w-full items-center gap-2 rounded-md px-2 py-1\.5 text-sm hover:bg-slate-100 text-slate-700">/g,
  `          {contextMenu.type !== "workspace" && (
            <>
              <button onClick={() => { onRestore?.(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">`
);

content = content.replace(
  /            Xóa vĩnh viễn\n          <\/button>\n        <\/>\n      \) :/g,
  `                Xóa vĩnh viễn
              </button>
            </>
          )}
        </>
      ) :`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
