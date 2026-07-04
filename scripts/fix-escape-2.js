const fs = require('fs');
const files = [
  'src/components/reports/create-report-dialog.tsx',
  'src/components/reports/create-dialog/work-picker.tsx',
  'src/components/reports/create-dialog/general-info-card.tsx',
  'src/components/reports/create-dialog/resources-and-quality.tsx',
  'src/components/reports/create-dialog/attachments-card.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\`/g, '`');
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content);
}
