const fs = require('fs');
let content = fs.readFileSync('src/components/reports/create-dialog/selected-work-card.tsx', 'utf8');

content = content.replace(/line: ReportWorkLine;/g, "line: Omit<ReportWorkLine, 'id'>;");
content = content.replace(/updateWorkLine: \(index: number, field: keyof ReportWorkLine, value: any\) => void;/g, "updateWorkLine: (index: number, field: keyof Omit<ReportWorkLine, 'id'>, value: any) => void;");

fs.writeFileSync('src/components/reports/create-dialog/selected-work-card.tsx', content);
