const fs = require('fs');
let content = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

// Update interface
content = content.replace(/initialData\?\: FieldReport;/g, 'initialReport?: FieldReport | null;\n  mode?: "create" | "edit";');

// Update destructuring
content = content.replace(/initialData,/g, 'initialReport,\n  mode = "create",');

// Replace usage
content = content.replace(/initialData/g, 'initialReport');

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', content);
