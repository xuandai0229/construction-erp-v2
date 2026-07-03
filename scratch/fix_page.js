const fs = require("fs"); 
let c = fs.readFileSync("src/app/(dashboard)/reports/page.tsx", "utf8"); 

c = c.replace(/(a\.createdAt as Date)\.toISOString\(\)/g, "serializeDate(a.createdAt) || \"\"");
if (!c.includes("import { serializeDate }")) {
  c = c.replace("import { formatFileSize", "import { serializeDate } from \"@/lib/reports/report-serializers\";\nimport { formatFileSize");
}

c = c.replace("const pageData = serializePrisma(await getSiteReportsPage(filters));", "const pageData = await getSiteReportsPage(filters);");
c = c.replace("const projects = serializePrisma(await getActiveProjects());", "const projects = (await getActiveProjects()).map(p => ({ id: p.id, code: p.code, name: p.name, status: p.status, location: p.location, budget: p.budget ? p.budget.toString() : null, startDate: serializeDate(p.startDate), endDate: serializeDate(p.endDate) }));");

fs.writeFileSync("src/app/(dashboard)/reports/page.tsx", c);
