const fs = require('fs');

const files = [
  'src/components/reports/create-dialog/work-picker.tsx',
  'src/components/reports/create-report-dialog.tsx',
  'src/components/reports/report-detail-drawer.tsx',
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/className="([^"]*)overflow-y-auto([^"]*)"/g, (match, p1, p2) => {
      if (p2.includes('custom-scrollbar') || p1.includes('custom-scrollbar')) return match;
      return `className="${p1}overflow-y-auto custom-scrollbar${p2}"`;
    });
    fs.writeFileSync(f, content);
  }
});
