const fs = require("fs"); 
let c = fs.readFileSync("src/app/(dashboard)/reports/page.tsx", "utf8"); 
c = c.replace(/(a\.createdAt as Date)\.toISOString\(\)/g, "serializeDate(a.createdAt as any) || \\"\\"");
if (!c.includes("import { serializeDate }")) {
  c = c.replace("import { formatFileSize", "import { serializeDate } from \\"@/lib/reports/report-serializers\\";\\nimport { formatFileSize");
}
fs.writeFileSync("src/app/(dashboard)/reports/page.tsx", c);

