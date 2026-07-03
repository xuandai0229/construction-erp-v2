const fs = require('fs'); 
let code = fs.readFileSync('src/app/(dashboard)/reports/page.tsx', 'utf8'); 
code = code.replace('import { getGlobalProjectContext } from "@/lib/project-context";', 'import { getGlobalProjectContext } from "@/lib/project-context";\nimport { serializePrisma } from "@/lib/serialize";'); 
code = code.replace('const pageData = await getSiteReportsPage(filters);', 'const pageData = serializePrisma(await getSiteReportsPage(filters));'); 
code = code.replace('const projects = await getActiveProjects();', 'const projects = serializePrisma(await getActiveProjects());'); 
code = code.replace('const globalContext = await getGlobalProjectContext(session, urlProjectId);', 'const globalContext = serializePrisma(await getGlobalProjectContext(session, urlProjectId));'); 
code = code.replace('initialReports={JSON.parse(JSON.stringify(reports))}', 'initialReports={serializePrisma(reports)}'); 
fs.writeFileSync('src/app/(dashboard)/reports/page.tsx', code);
