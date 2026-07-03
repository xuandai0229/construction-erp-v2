const fs = require("fs"); 
let c = fs.readFileSync("src/app/(dashboard)/reports/actions.ts", "utf8"); 
c = c.replace("createdAt: log.createdAt", "createdAt: log.createdAt ? log.createdAt.toISOString() : null");
fs.writeFileSync("src/app/(dashboard)/reports/actions.ts", c);

