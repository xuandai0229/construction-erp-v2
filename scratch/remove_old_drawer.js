const fs = require('fs');
let code = fs.readFileSync('src/components/reports/report-detail-drawer.tsx', 'utf8');

const oldStr = `{report.type === 'WEEKLY' && (report.nextWeekPlans && report.nextWeekPlans.length > 0) && (`;
const idx = code.indexOf(oldStr);
if (idx !== -1) {
  const endIdx = code.indexOf("</div>\n            </div>\n          )}", idx);
  if (endIdx !== -1) {
    code = code.substring(0, idx) + code.substring(endIdx + 38);
    fs.writeFileSync("src/components/reports/report-detail-drawer.tsx", code);
  }
}
code = code.replace(/React\.Fragment/g, "Fragment");
if (!code.includes("import { Fragment }")) {
  code = code.replace("import React,", "import React, { Fragment },");
}
fs.writeFileSync("src/components/reports/report-detail-drawer.tsx", code);
