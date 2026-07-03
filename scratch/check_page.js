const fs = require("fs"); 
let c = fs.readFileSync("src/app/(dashboard)/reports/page.tsx", "utf8"); 
const wk = c.indexOf("<ReportsWorkspace");
console.log(c.substring(wk, wk + 500));

