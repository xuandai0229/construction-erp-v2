const fs = require('fs');
let content = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

content = content.replace(/const updateWorkLine = \(index: number, field: keyof ReportWorkLine, value: any\) => \{/, "const updateWorkLine = (index: number, field: keyof Omit<ReportWorkLine, 'id'>, value: any) => {");

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', content);
