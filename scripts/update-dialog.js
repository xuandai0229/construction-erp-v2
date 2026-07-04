const fs = require('fs');
let content = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');
content = content.replace(
  /    if \(form\.type === 'DAILY' && validWorkLines\.length === 0\) \{\r?\n      newErrors\.workLines = "Vui lòng nhập ít nhất 1 dòng công việc";\r?\n    \}/g,
  `    if (form.type === 'DAILY') {
      if (validWorkLines.length === 0) {
        newErrors.workLines = "Vui lòng chọn ít nhất 1 dòng công việc từ khối lượng gốc và nhập khối lượng > 0";
      } else {
        const overLimits = validWorkLines.filter(l => Number(l.quantityToday || 0) > Number(l.remainingQuantity || 0));
        if (overLimits.length > 0) {
          newErrors.workLines = \`Khối lượng hôm nay vượt thiết kế (còn lại): \${overLimits.map(l => l.workContent).join(', ')}\`;
        }
      }
    }`
);
fs.writeFileSync('src/components/reports/create-report-dialog.tsx', content);
