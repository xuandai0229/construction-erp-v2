import fs from 'fs';
import path from 'path';

const replacements = [
  { search: /Mã VT/g, replace: "Mã vật tư" },
  { search: /Tên VT/g, replace: "Tên vật tư" },
  { search: /ĐVT/g, replace: "Đơn vị" },
  { search: /SL đề xuất/g, replace: "Số lượng đề xuất" },
  { search: /Tổng SL đề xuất/g, replace: "Tổng số lượng đề xuất" },
  { search: /SL:/g, replace: "Số lượng:" },
  { search: /CV:/g, replace: "Công việc:" },
  { search: /Thiếu GD nhập/g, replace: "Chưa nhập kho" },
];

const filesToUpdate = [
  "src/components/materials/materials-stock-table.tsx",
  "src/components/materials/stock-detail-drawer.tsx",
  "src/components/materials/materials-catalog.tsx",
  "src/components/materials/material-detail-drawer.tsx",
  "src/components/reports/create-dialog/work-picker.tsx",
  "src/components/reports/create-dialog/weekly-report-form.tsx",
  "src/components/reports/report-detail-drawer.tsx",
  "src/components/reports/report-print-template.tsx",
  "src/components/reports/create-report-dialog.tsx",
  "src/components/material-request/material-request-list.tsx",
  "src/components/material-request/material-request-form.tsx",
  "src/components/material-request/material-request-detail.tsx",
  "src/components/field-progress/summary-desktop-view.tsx",
  "src/app/(dashboard)/approvals/components/approval-center-client.tsx"
];

let changedFilesCount = 0;

for (const relPath of filesToUpdate) {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  let originalContent = content;
  
  for (const r of replacements) {
    content = content.replace(r.search, r.replace);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${relPath}`);
    changedFilesCount++;
  }
}

console.log(`Done. Updated ${changedFilesCount} files.`);
