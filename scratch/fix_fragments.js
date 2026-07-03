const fs = require("fs"); 
let c2 = fs.readFileSync("src/components/reports/report-detail-drawer.tsx", "utf8");
c2 = c2.replace(/<\/Fragment>/g, "<\/React.Fragment>");
fs.writeFileSync("src/components/reports/report-detail-drawer.tsx", c2);

