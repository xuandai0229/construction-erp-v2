const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/master-table.tsx', 'utf-8');

// Line 5: Info
content = content.replace('FileText, Info, X', 'FileText, X');
// Line 7: updateItem
content = content.replace('updateItem, deleteItem', 'deleteItem');
// Line 301: isCustom
content = content.replace('const isCustom = currentUnit !== "" && !UNIT_OPTIONS.includes(currentUnit);\n', '');
// Line 497: isDirtyGroup
content = content.replace('const isDirtyGroup = !!dirtyItems[group.id];\n', '');

fs.writeFileSync('src/components/field-progress/master-table.tsx', content);
console.log('done');
