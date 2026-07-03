const fs = require("fs"); 
let c = fs.readFileSync("src/app/(dashboard)/reports/actions.ts", "utf8"); 
const summaryStart = c.indexOf("export async function getWeeklyReportSummary");
console.log(c.substring(summaryStart, summaryStart + 1500));

