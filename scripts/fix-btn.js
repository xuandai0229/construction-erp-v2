const fs = require('fs');
let content = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

content = content.replace(/variant="secondary"/g, 'variant="outline"');

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', content);
