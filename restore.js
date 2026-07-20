const fs = require('fs');

let mat = fs.readFileSync('src/app/actions/material-request.ts', 'utf8');
mat = mat.replace(/sourceType: "MATERIAL_REQUEST",\s*sourceId: request.id,/g, 'entityType: "MATERIAL_REQUEST",\n        entityId: request.id,\n        sourceType: "MATERIAL_REQUEST",\n        sourceId: request.id,');
mat = mat.replace(/sourceType: "MATERIAL_REQUEST",\s*sourceId: id,/g, 'entityType: "MATERIAL_REQUEST",\n          entityId: id,\n          sourceType: "MATERIAL_REQUEST",\n          sourceId: id,');
fs.writeFileSync('src/app/actions/material-request.ts', mat);

let app = fs.readFileSync('src/app/(dashboard)/approvals/actions.ts', 'utf8');
app = app.replace(/sourceType: sourceType,\s*sourceId: sourceId,/g, 'entityType: sourceType || type,\n      entityId: sourceId || code,\n      sourceType: sourceType,\n      sourceId: sourceId,');
fs.writeFileSync('src/app/(dashboard)/approvals/actions.ts', app);
