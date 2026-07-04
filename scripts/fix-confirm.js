const fs = require('fs');
let content = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

content = content.replace(/onCancel=\{\(\) \=\> setShowConfirmClose\(false\)\}/g, 'onClose={() => setShowConfirmClose(false)}');

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', content);
