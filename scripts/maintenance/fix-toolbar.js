const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

const toolbarBlockRegex = /                      <div className="relative flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0" ref=\{filterRef\}>\n                        <button\n                          type="button"\n                          onClick=\{\(\) => setShowFilters\(!showFilters\)\}\n                          className=\{`shrink-0 rounded-md border px-3 py-1\.5 text-sm font-medium flex items-center gap-1\.5 transition-colors \$\{activeFilterCount > 0 \|\| showFilters\n                              \? "border-blue-300 bg-blue-50 text-blue-700"\n                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"\n                            \}`\}\n                        >\n                          Bộ lọc \{activeFilterCount > 0 && `\(\{activeFilterCount\}\)`\}\n                        <\/button>/;

const newToolbarBlock = `                      <div className="relative flex shrink-0 items-center gap-2" ref={filterRef}>
                        <button
                          type="button"
                          onClick={() => setShowFilters(!showFilters)}
                          className={\`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors \${activeFilterCount > 0 || showFilters
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }\`}
                        >
                          <Filter className="h-4 w-4" />
                          Bộ lọc {activeFilterCount > 0 && \`(\${activeFilterCount})\`}
                        </button>`;

content = content.replace(toolbarBlockRegex, newToolbarBlock);

// Replace the popover z-index and width to be safer on mobile
const popoverRegex = /<div className="absolute right-0 top-full z-20 mt-1 w-\[320px\] sm:w-\[480px\] lg:w-\[600px\] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">/g;
const newPopover = `<div className="absolute right-0 top-full z-50 mt-1 w-[320px] sm:w-[480px] lg:w-[600px] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl ring-1 ring-slate-900/5 origin-top-right">`;
content = content.replace(popoverRegex, newPopover);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
