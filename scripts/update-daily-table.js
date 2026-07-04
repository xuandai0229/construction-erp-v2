const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/daily-entry-table.tsx', 'utf8');

// 1. Add userRole to props
content = content.replace(
  /parentGroups \= \[\],\n\}: \{/g,
  `parentGroups = [],\n  userRole,\n}: {`
);

content = content.replace(
  /parentGroups\?: any\[\];\n\}\)/g,
  `parentGroups?: any[];\n  userRole?: string;\n})`
);

// 2. Add badge and disable input logic in renderQuantityInput
// Let's find renderQuantityInput signature
const renderQtyRegex = /const renderQuantityInput = \(item: DailyItem, index: number, compact = false\) => \{\s+const math = getItemMath\(item\);\s+const idSuffix = compact \? "-mobile" : "-desktop";/;

const newRenderQty = `const renderQuantityInput = (item: DailyItem, index: number, compact = false) => {
    const math = getItemMath(item);
    const idSuffix = compact ? "-mobile" : "-desktop";
    const isReportSourced = item.note && item.note.includes("[SOURCE:SITE_REPORT:");
    const isReadOnly = isReportSourced && userRole !== 'ADMIN' && userRole !== 'DIRECTOR';`;

content = content.replace(renderQtyRegex, newRenderQty);

// Change disabled={loading} to disabled={loading || isReadOnly}
const disabledRegex = /disabled=\{loading\}/g;
content = content.replace(disabledRegex, `disabled={loading || isReadOnly}`);

// Change placeholder="0" to placeholder={isReadOnly ? "Từ báo cáo" : "0"}
const placeholderRegex = /placeholder="0"/g;
content = content.replace(placeholderRegex, `placeholder={isReadOnly ? "Từ báo cáo" : "0"}`);

// Add badge next to name in renderMobileRow
const mobileRowRegex = /<h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">\{item\.name\}<\/h3>/;
content = content.replace(mobileRowRegex, `<h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
              {item.name}
              {item.note && item.note.includes("[SOURCE:SITE_REPORT:") && (
                <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 align-middle">
                  Từ BCHT
                </span>
              )}
            </h3>`);

fs.writeFileSync('src/components/field-progress/daily-entry-table.tsx', content);
