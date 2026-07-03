const fs = require("fs"); 
let c = fs.readFileSync("src/app/(dashboard)/reports/actions.ts", "utf8"); 
const wk = c.indexOf("const stats: ReportStats =");
console.log(c.substring(wk, wk + 500));

