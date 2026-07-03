const fs = require("fs"); 

let p = fs.readFileSync("src/app/(dashboard)/reports/page.tsx", "utf8"); 
p = p.replace("const projects = (await getActiveProjects()).map(p => ({ id: p.id, code: p.code, name: p.name, status: p.status, location: p.location, budget: p.budget ? p.budget.toString() : null, startDate: serializeDate(p.startDate), endDate: serializeDate(p.endDate) }));", "const projects = (await getActiveProjects()).map(p => ({ id: p.id, code: p.code, name: p.name }));");
if (!p.includes("import { serializeDate }")) {
  p = "import { serializeDate } from \\"@/lib/reports/report-serializers\\";\\n" + p;
}
fs.writeFileSync("src/app/(dashboard)/reports/page.tsx", p);

let rs = fs.readFileSync("src/lib/reports/report-serializers.ts", "utf8");
rs = rs.replace("import { Decimal } from \\"@prisma/client/runtime/library\\";", "import { Prisma } from \\"@prisma/client\\";");
rs = rs.replace(/Decimal \| number \| string/g, "Prisma.Decimal | number | string");
fs.writeFileSync("src/lib/reports/report-serializers.ts", rs);

let r = fs.readFileSync("src/app/api/reports/[reportId]/history/route.ts", "utf8");
r = r.replace("new Date(log.createdAt)", "log.createdAt ? new Date(log.createdAt) : new Date(0)");
fs.writeFileSync("src/app/api/reports/[reportId]/history/route.ts", r);

