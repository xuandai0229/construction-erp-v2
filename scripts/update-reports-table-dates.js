const fs = require('fs');

let file = fs.readFileSync('src/components/reports/reports-table.tsx', 'utf8');

// Add utils import
file = file.replace(
  'import { getVietnamIsoWeekInfo } from "@/lib/reports/report-timezone";',
  'import { getVietnamIsoWeekInfo } from "@/lib/reports/report-timezone";\nimport { formatDateVN, formatTimeVN, formatReportCode } from "@/lib/utils";'
);

// Format group header
file = file.replace(
  'Tuần {group.weekNumber} · {group.startDate} - {group.endDate}',
  'Tuần {group.weekNumber} · {formatDateVN(group.startDate)} - {formatDateVN(group.endDate)}'
);

// Format report code
file = file.replace(
  "{report.code.replace('BC-D-', 'D-').replace('BC-W-', 'W-')}",
  "{formatReportCode(report.code, report.date, report.type)}"
);

// Format report date and time
file = file.replace(
  '{report.date}',
  '{formatDateVN(report.date)}'
);
file = file.replace(
  '<span className="text-[11px] text-slate-400 mt-0.5">{report.time}</span>',
  '<span className="text-[11px] text-slate-400 mt-0.5">{formatTimeVN(`1970-01-01T${report.time || "00:00"}`)}</span>'
);

// Update tooltip for week range if it exists
file = file.replace(
  '{report.weekStartDate} - {report.weekEndDate}',
  '{formatDateVN(report.weekStartDate)} - {formatDateVN(report.weekEndDate)}'
);

// Improve creator role
file = file.replace(
  '<span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{report.creatorRole}</span>',
  `<span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
    {report.creatorRole === 'CHIEF_COMMANDER' ? 'Chỉ huy trưởng' : 
     report.creatorRole === 'PROJECT_MANAGER' ? 'Quản lý dự án' :
     report.creatorRole === 'ENGINEER' ? 'Kỹ sư' :
     report.creatorRole === 'ACCOUNTANT' ? 'Kế toán' :
     report.creatorRole === 'ADMIN' ? 'Giám đốc' : report.creatorRole}
  </span>`
);

fs.writeFileSync('src/components/reports/reports-table.tsx', file);
