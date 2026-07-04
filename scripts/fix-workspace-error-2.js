const fs = require('fs');
let file = fs.readFileSync('src/components/reports/reports-workspace.tsx', 'utf8');
file = file.replace(/toast\.error\("Đã xảy ra lỗi khi tạo báo cáo"\);/, 'toast.error((error as Error).message || "Đã xảy ra lỗi không mong muốn khi tạo báo cáo");');
fs.writeFileSync('src/components/reports/reports-workspace.tsx', file);
