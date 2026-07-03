const fs = require('fs');
let txt = fs.readFileSync('src/app/print/reports/[reportId]/page.tsx', 'utf8');
txt = txt.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/app/print/reports/[reportId]/page.tsx', txt);
