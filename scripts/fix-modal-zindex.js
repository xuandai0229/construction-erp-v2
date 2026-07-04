const fs = require('fs');
let file = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');
file = file.replace('className="fixed inset-0 z-50 flex items-start justify-center', 'className="fixed inset-0 z-[80] flex items-start justify-center');
fs.writeFileSync('src/components/reports/create-report-dialog.tsx', file);
