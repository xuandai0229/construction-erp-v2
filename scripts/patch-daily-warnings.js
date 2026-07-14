const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/daily-entry-table.tsx', 'utf-8');

// Imports
content = content.replace(/Package,\s*/, '');
content = content.replace(/Send,\s*/, '');
content = content.replace(/SlidersHorizontal,\s*/, '');

// Crews
content = content.replace(/const crews = useMemo\(\(\) => \{\s*return Array.from\(new Set\(items.map\(\(item\) => item.constructionCrew\)\.filter\(Boolean\)\)\)\.sort\(\) as string\[\];\s*\}, \[items\]\);\n?/g, '');

// _ in find and flatMap
content = content.replace(/groupedItems\.find\(\(\[_,/g, 'groupedItems.find(([/*_*/,');
content = content.replace(/groupedItems\.flatMap\(\(\[_,/g, 'groupedItems.flatMap(([/*_*/,');

fs.writeFileSync('src/components/field-progress/daily-entry-table.tsx', content);
console.log('done');
