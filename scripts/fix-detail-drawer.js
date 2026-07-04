const fs = require('fs');

let file = fs.readFileSync('src/components/reports/report-detail-drawer.tsx', 'utf8');

if (!file.includes('formatDateVN')) {
  file = file.replace(
    'import { getStatusLabel, getStatusVariant } from "./types";',
    'import { getStatusLabel, getStatusVariant } from "./types";\nimport { formatDateVN, formatTimeVN, formatReportCode } from "@/lib/utils";'
  );
}

// Replace code
file = file.replace(
  "{report.code.replace('BC-D-', 'D-').replace('BC-W-', 'W-')}",
  "{formatReportCode(report.code, report.date, report.type)}"
);

// Replace date
file = file.replace(
  "{report.type === 'WEEKLY' ? `${report.weekStartDate} - ${report.weekEndDate}` : `${report.date} ${report.time}`}",
  "{report.type === 'WEEKLY' ? `${formatDateVN(report.weekStartDate)} - ${formatDateVN(report.weekEndDate)}` : `${formatDateVN(report.date)} ${formatTimeVN(\\`1970-01-01T\${report.time || \"00:00\"}\\`)}`}"
);

fs.writeFileSync('src/components/reports/report-detail-drawer.tsx', file);
