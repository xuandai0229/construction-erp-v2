const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/documents/actions.ts', 'utf-8');

// Update restoreDocument to check parent folder
content = content.replace(
  /    if \(!existing\) return \{ error: "Không tìm thấy tài liệu trong thùng rác" \};\n    \n    await prisma\.document\.update\(\{/g,
  `    if (!existing) return { error: "Không tìm thấy tài liệu trong thùng rác" };
    
    if (existing.folderId) {
      const parentFolder = await prisma.documentFolder.findUnique({ where: { id: existing.folderId }});
      if (parentFolder?.deletedAt) {
        return { error: "Cần khôi phục thư mục cha trước" };
      }
    }

    await prisma.document.update({`
);

fs.writeFileSync('src/app/(dashboard)/documents/actions.ts', content);
