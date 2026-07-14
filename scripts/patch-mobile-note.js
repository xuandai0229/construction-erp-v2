const fs = require('fs');

const path1 = 'src/components/field-progress/master-table.tsx';
let content1 = fs.readFileSync(path1, 'utf8');

const regex = /<input\s+autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"\s+id={`mobile-note-\$\{item\.id\}`}\s+name={`mobile-note-\$\{item\.id\}`}\s+value=\{item\.note \|\| ""\}\s+onChange=\{e => handleChange\(item\.id, 'note', e\.target\.value\)\}\s+placeholder="Ghi chú\.\.\."\s+className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-3 outline-none text-\[15px\] text-slate-700 transition-all"\s+\/>/;

const replacement = `<div className="relative w-full">
                        <div className="invisible px-4 py-3 text-[15px] whitespace-pre-wrap break-words min-h-[48px]" aria-hidden="true">
                          {(item.note || " ") + "\\n"}
                        </div>
                        <textarea  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                          id={\`mobile-note-\${item.id}\`}
                          name={\`mobile-note-\${item.id}\`}
                          value={item.note || ""}
                          onChange={e => handleChange(item.id, 'note', e.target.value)}
                          placeholder="Ghi chú..."
                          className="absolute inset-0 w-full h-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-3 outline-none text-[15px] text-slate-700 transition-all resize-none overflow-hidden"
                        />
                      </div>`;

content1 = content1.replace(regex, replacement);
fs.writeFileSync(path1, content1);
console.log('Patched master-table.tsx');
