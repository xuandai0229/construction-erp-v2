const fs = require('fs');

let file = fs.readFileSync('src/components/reports/reports-mobile-cards.tsx', 'utf8');

// Add utils import
file = file.replace(
  'import { PhotoPreviewStack } from "./photo-preview-stack";',
  'import { PhotoPreviewStack } from "./photo-preview-stack";\nimport { formatDateVN, formatReportCode } from "@/lib/utils";'
);

// Format report code
file = file.replace(
  "{report.code.replace('BC-D-', 'D-').replace('BC-W-', 'W-')}",
  "{formatReportCode(report.code, report.date, report.type)}"
);

// Format report date
file = file.replace(
  "{report.type === 'WEEKLY' ? `${report.weekStartDate} - ${report.weekEndDate}` : report.date}",
  "{report.type === 'WEEKLY' ? `${formatDateVN(report.weekStartDate)} - ${formatDateVN(report.weekEndDate)}` : formatDateVN(report.date)}"
);

fs.writeFileSync('src/components/reports/reports-mobile-cards.tsx', file);
