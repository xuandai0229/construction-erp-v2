const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/daily-entry-table.tsx', 'utf8');

const regex = /const isReadOnly = isReportSourced && userRole !== 'ADMIN' && userRole !== 'DIRECTOR';/;
const replacement = `const isReadOnly = Boolean(isReportSourced) && userRole !== 'ADMIN' && userRole !== 'DIRECTOR';`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/field-progress/daily-entry-table.tsx', content);
