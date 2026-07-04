const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/daily-entry-table.tsx', 'utf8');

// Replace the simple Từ BCHT badge with a nice badge with title
content = content.replace(
  /<span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-\[10px\] font-medium text-blue-700 ring-1 ring-inset ring-blue-700\/10 align-middle">\s*Từ BCHT\s*<\/span>/g,
  '<span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 align-middle" title="Dữ liệu đồng bộ từ Báo cáo hiện trường. Chỉ tài khoản quản lý mới có thể điều chỉnh thủ công.">Từ báo cáo hiện trường</span>'
);

fs.writeFileSync('src/components/field-progress/daily-entry-table.tsx', content);
