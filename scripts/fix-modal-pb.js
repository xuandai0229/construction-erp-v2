const fs = require('fs');

let dialog = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

dialog = dialog.replace(
  'className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 pb-32"',
  'className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6"'
);

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', dialog);
