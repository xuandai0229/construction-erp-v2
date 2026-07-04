const fs = require('fs');
let content = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

content = content.replace(/const updateField = \(field: keyof CreateReportFormData, value: any\) => \{/, 'const updateField = (field: string, value: any) => {');

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', content);
