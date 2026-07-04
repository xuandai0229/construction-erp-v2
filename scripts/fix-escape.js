const fs = require('fs');
const files = [
  'src/components/reports/create-report-dialog.tsx',
  'src/components/reports/create-dialog/work-picker.tsx',
  'src/components/reports/create-dialog/selected-work-card.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\`/g, '`');
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content);
}
