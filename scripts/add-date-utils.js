const fs = require('fs');
let utils = fs.readFileSync('src/lib/utils.ts', 'utf8');

if (!utils.includes('formatDateTimeVN')) {
  utils += `
export function formatDateTimeVN(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    const formatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return formatter.format(d).replace(',', '');
  } catch (e) {
    return '—';
  }
}

export function formatWeekRangeVN(start: Date | string, end: Date | string): string {
  return \`\${formatDateVN(start)} - \${formatDateVN(end)}\`;
}

export function formatWeekLabelVN(weekNo: number | string | null, start: Date | string, end: Date | string): string {
  if (!weekNo) return formatWeekRangeVN(start, end);
  return \`Tuần \${weekNo} · \${formatDateVN(start)} - \${formatDateVN(end)}\`;
}

export function formatReportCode(code: string, date: Date | string, type: string): string {
  if (code && !code.startsWith('QA_REPORT')) {
    return code; // If it's a real code, use it
  }
  // Otherwise format beautifully based on type
  if (type === 'WEEKLY') {
    return \`Báo cáo tuần - \${formatDateVN(date)}\`;
  }
  return \`Báo cáo ngày \${formatDateVN(date)}\`;
}

export function formatTimeVN(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    const formatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit'
    });
    return formatter.format(d);
  } catch (e) {
    return '—';
  }
}
`;
  fs.writeFileSync('src/lib/utils.ts', utils);
}
