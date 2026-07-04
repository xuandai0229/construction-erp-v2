const fs = require('fs');
let file = fs.readFileSync('src/components/reports/report-detail-drawer.tsx', 'utf8');

if (!file.includes('import { formatDateVN')) {
  file = file.replace(
    'import { getStatusLabel, getStatusVariant } from "./types";',
    'import { getStatusLabel, getStatusVariant } from "./types";\nimport { formatDateVN, formatTimeVN, formatReportCode } from "@/lib/utils";'
  );
  fs.writeFileSync('src/components/reports/report-detail-drawer.tsx', file);
}
