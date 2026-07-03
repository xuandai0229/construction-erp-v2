const fs = require("fs"); 
let c1 = fs.readFileSync("src/components/reports/create-report-dialog.tsx", "utf8"); 
c1 = c1.replace("getWeeklyReportPreview", "getWeeklyReportSummary"); 
fs.writeFileSync("src/components/reports/create-report-dialog.tsx", c1);

let c2 = fs.readFileSync("src/components/reports/report-detail-drawer.tsx", "utf8");
c2 = c2.replace(/<Fragment key=/g, "<React.Fragment key=");
fs.writeFileSync("src/components/reports/report-detail-drawer.tsx", c2);

let c3 = fs.readFileSync("src/lib/serialize.ts", "utf8");
c3 = c3.replace("return (value as never).toString();", "return String(value);");
fs.writeFileSync("src/lib/serialize.ts", c3);

