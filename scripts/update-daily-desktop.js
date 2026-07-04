const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/daily-entry-table.tsx', 'utf8');

const targetRegex = /<div className="font-semibold text-slate-800 line-clamp-2 w-full leading-tight" title=\{item.name\}>\{item.name\}<\/div>/;

const replacement = `<div className="font-semibold text-slate-800 line-clamp-2 w-full leading-tight" title={item.name}>
                      {item.name}
                      {item.note && item.note.includes("[SOURCE:SITE_REPORT:") && (
                        <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 align-middle">
                          Từ BCHT
                        </span>
                      )}
                    </div>`;

content = content.replace(targetRegex, replacement);

fs.writeFileSync('src/components/field-progress/daily-entry-table.tsx', content);
