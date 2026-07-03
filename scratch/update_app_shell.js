const fs = require('fs'); 
let code = fs.readFileSync('src/components/layout/app-shell.tsx', 'utf8'); 
code = code.replace('import { getGlobalProjectContext } from \'@/lib/project-context\';', 'import { getGlobalProjectContext } from \'@/lib/project-context\';\nimport { serializePrisma } from \'@/lib/serialize\';'); 
code = code.replace('const globalContext = await getGlobalProjectContext(session);', 'const globalContext = serializePrisma(await getGlobalProjectContext(session));'); 
fs.writeFileSync('src/components/layout/app-shell.tsx', code);
