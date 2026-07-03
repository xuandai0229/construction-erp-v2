const fs = require("fs"); 
let c = fs.readFileSync("src/components/reports/create-report-dialog.tsx", "utf8"); 
const wk = c.indexOf("weeklyPreview");
console.log(c.substring(wk, wk + 1500));

