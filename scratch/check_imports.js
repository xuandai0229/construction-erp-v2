const fs = require("fs"); 
let c = fs.readFileSync("src/app/(dashboard)/reports/page.tsx", "utf8"); 
console.log(c.split("\n").filter(l => l.includes("getSiteReportsPage")).join("\n"));

