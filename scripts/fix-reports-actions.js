const fs = require('fs');

let file = fs.readFileSync('src/app/(dashboard)/reports/actions.ts', 'utf8');

// Fix createSiteReport to not throw on draft missing workLines
file = file.replace(
  `  if (type === "DAILY" && workLines.length === 0) {
    throw new Error("Daily report requires at least one work line");
  }`,
  `  if (!isDraft && type === "DAILY" && workLines.length === 0) {
    throw new Error("Báo cáo ngày cần ít nhất 1 công việc khối lượng.");
  }`
);

// Fix buildDailyReportLines
file = file.replace(
  `  if (input.workLines.length === 0) {
    throw new Error("Báo cáo ngày cần ít nhất một dòng công việc");
  }`,
  `  if (input.workLines.length === 0) {
    return [];
  }`
);

fs.writeFileSync('src/app/(dashboard)/reports/actions.ts', file);
