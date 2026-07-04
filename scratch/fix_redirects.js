const fs = require('fs');

const filesToFix = [
  "src/app/print/reports/[reportId]/page.tsx",
  "src/app/(dashboard)/reports/page.tsx",
  "src/app/(dashboard)/users/page.tsx",
  "src/app/(dashboard)/suppliers/page.tsx",
  "src/app/(dashboard)/settings/page.tsx",
  "src/app/(dashboard)/projects/page.tsx",
  "src/app/(dashboard)/materials/page.tsx",
  "src/app/(dashboard)/documents/page.tsx",
  "src/app/(dashboard)/contracts/page.tsx",
  "src/components/layout/app-shell.tsx",
  "src/app/(dashboard)/approvals/page.tsx",
  "src/app/(dashboard)/accounting/page.tsx"
];

for (const file of filesToFix) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/redirect\(['"]\/login['"]\)/g, 'redirect("/login?reason=session_expired")');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed', file);
}
