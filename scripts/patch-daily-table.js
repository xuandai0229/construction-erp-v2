const fs = require('fs');
let content = fs.readFileSync('src/components/field-progress/daily-entry-table.tsx', 'utf-8');

const newHeader = `<thead className="border-b-2 border-slate-200 bg-slate-50">
            <tr>
              <th className={\`\${sharedTableStyles.headerTh} \${sharedTableStyles.dailyCols.stt} bg-slate-100 border-r-slate-200\`}>STT</th>
              <th className={\`\${sharedTableStyles.headerTh} \${sharedTableStyles.dailyCols.content} bg-slate-100 border-r-slate-200\`}>Công việc</th>
              <th className={\`\${sharedTableStyles.headerTh} \${sharedTableStyles.dailyCols.crew}\`}>Mũi</th>
              <th className={\`\${sharedTableStyles.headerTh} \${sharedTableStyles.dailyCols.unit}\`}>Đơn vị</th>
              <th className={\`\${sharedTableStyles.headerTh} \${sharedTableStyles.dailyCols.designQty}\`}>Tổng<br />khối lượng</th>
              <th className={\`\${sharedTableStyles.headerTh} \${sharedTableStyles.dailyCols.cumulative}\`}>Lũy kế<br />trước ngày</th>
              <th className={\`\${sharedTableStyles.headerTh} \${sharedTableStyles.dailyCols.dayQty} bg-blue-100 text-blue-800\`}>Khối lượng<br />ngày</th>
              <th className={\`\${sharedTableStyles.headerTh} \${sharedTableStyles.dailyCols.remaining}\`}>Sau<br />cập nhật</th>
              <th className={\`\${sharedTableStyles.headerTh} \${sharedTableStyles.dailyCols.percent}\`}>Hoàn<br />thành</th>
              <th className={\`\${sharedTableStyles.headerTh} \${sharedTableStyles.dailyCols.notes}\`}>Ghi chú<br />nhanh</th>
              <th className={\`\${sharedTableStyles.headerTh} \${sharedTableStyles.dailyCols.action} bg-slate-100 border-l border-slate-200\`}>Chi<br />tiết</th>
            </tr>
          </thead>`;

content = content.replace(/<thead className="border-b-2 border-slate-200 bg-slate-50">.*?<\/thead>/s, newHeader);

const oldNoteRegex = /<td className=\{\`\$\{sharedTableStyles\.cellTd\} \$\{sharedTableStyles\.dailyCols\.notes\} p-2\`\}>\s*<label htmlFor=\{\`daily-note-\$\{item\.id\}\`\} className="sr-only">Ghi chú nhanh cho \{item\.name\}<\/label>\s*<input[^>]*id=\{\`daily-note-\$\{item\.id\}\`\}[^>]*placeholder="Ghi chú nhanh\.\.\."\s*\/>\s*<\/td>/s;

const newNoteCode = `<td className={\`\${sharedTableStyles.cellTd} \${sharedTableStyles.dailyCols.notes} p-2\`}>
                    <label htmlFor={\`daily-note-\${item.id}\`} className="sr-only">Ghi chú nhanh cho {item.name}</label>
                    <div className="relative w-full">
                      <div className="whitespace-pre-wrap invisible px-2 py-1.5 text-[13px] border border-transparent w-full rounded min-h-[36px]" style={{ wordBreak: 'break-word' }}>
                        {(item.note || "") + " "}
                      </div>
                      <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                        id={\`daily-note-\${item.id}\`}
                        name={\`daily-note-\${item.id}\`}
                        value={item.note}
                        onChange={(e) => patchItem(item.id, "note", e.target.value)}
                        className="absolute inset-0 w-full h-full min-w-[120px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[13px] text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none overflow-hidden"
                        style={{ wordBreak: 'break-word' }}
                        placeholder="Ghi chú nhanh..."
                      />
                    </div>
                  </td>`;

content = content.replace(oldNoteRegex, newNoteCode);

fs.writeFileSync('src/components/field-progress/daily-entry-table.tsx', content);
console.log('done');
