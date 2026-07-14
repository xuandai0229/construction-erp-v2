const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/master-table.tsx', 'utf-8');
content = content.replace(/>Khối lượng thiết kế<\/th>/g, '>Khối lượng<br />thiết kế</th>');
content = content.replace(/Khối lượng đã duyệt/g, 'Khối lượng<br />đã duyệt');

// Replace the input with a textarea
content = content.replace(
  /<input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"[\s\r\n]*id={`master-note-\$\{item\.id\}`}.*?placeholder="Ghi chú\.\.\."[\s\r\n]*\/>/s,
  `<div className="relative w-full">
  <div className="whitespace-pre-wrap invisible px-2 py-1 text-[13px] border border-transparent w-full rounded min-h-[32px]" style={{ wordBreak: 'break-word' }}>
    {(item.note || "") + " "}
  </div>
  <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" 
    id={\`master-note-\${item.id}\`}
    name={\`master-note-\${item.id}\`}
    value={item.note || ""} 
    onChange={e => handleChange(item.id, 'note', e.target.value)}
    title={item.note || ""}
    className="absolute inset-0 w-full h-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-slate-600 text-[13px] transition-all outline-none resize-none overflow-hidden"
    style={{ wordBreak: 'break-word' }}
    placeholder="Ghi chú..."
  />
</div>`
);

fs.writeFileSync('src/components/field-progress/master-table.tsx', content);
console.log('done');
