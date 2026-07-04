const fs = require('fs');

let dialog = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

// We need to replace the workLines map with a responsive table.
const newWorkLinesUI = `
                      <div className="space-y-4">
                        {errors.workLines && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[13px] font-medium flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{errors.workLines}</span>
                          </div>
                        )}
                        
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[12px] uppercase text-slate-500 font-bold sticky top-0 z-10">
                              <tr>
                                <th className="w-12 px-3 py-3 text-center">STT</th>
                                <th className="px-4 py-3">Công việc</th>
                                <th className="w-20 px-2 py-3 text-center">ĐVT</th>
                                <th className="w-24 px-3 py-3 text-right">TK/Duyệt</th>
                                <th className="w-24 px-3 py-3 text-right">Còn lại</th>
                                <th className="w-32 px-4 py-3 text-right text-blue-700">KL hôm nay</th>
                                <th className="w-48 px-3 py-3">Ghi chú</th>
                                <th className="w-48 px-3 py-3">Đề xuất</th>
                                <th className="w-12 px-3 py-3 text-center">Xóa</th>
                              </tr>
                            </thead>
                            <tbody className="text-[13px] align-top">
                              {form.workLines.map((line, idx) => {
                                const design = Number(line.designQuantity || 0);
                                const before = Number(line.approvedCumulative || 0);
                                const today = Number(line.quantityToday || 0);
                                const remaining = Number(line.remainingQuantity || 0);
                                const isOver = today > remaining;
                                const isDone = remaining <= 0 && today === 0;
                                const inputClass = "w-full h-9 px-2.5 text-[13px] text-slate-900 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400";
                                
                                return (
                                  <tr key={idx} className={\`border-b border-slate-100 hover:bg-slate-50 transition-colors \${isOver ? 'bg-red-50/30' : ''}\`}>
                                    <td className="px-3 py-4 text-center font-medium text-slate-400">{idx + 1}</td>
                                    <td className="px-4 py-4">
                                      {line.categoryName && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 line-clamp-1">{line.categoryName}</div>}
                                      <div className="font-bold text-slate-800 line-clamp-2">
                                        {line.code ? <span className="text-blue-600 mr-1.5 font-mono text-[12px]">[{line.code}]</span> : null}
                                        {line.workContent}
                                      </div>
                                      {isDone && !isOver && <div className="text-[11px] text-emerald-600 font-bold mt-1">Đã hoàn thành</div>}
                                    </td>
                                    <td className="px-2 py-4 text-center font-medium text-slate-600">{line.unit}</td>
                                    <td className="px-3 py-4 text-right">
                                      <div className="font-medium text-slate-600">{design}</div>
                                      <div className="text-[11px] text-emerald-600 font-medium">{before}</div>
                                    </td>
                                    <td className="px-3 py-4 text-right font-black text-slate-900">{remaining}</td>
                                    <td className="px-4 py-3">
                                      <div className="relative">
                                        <input
                                          type="number"
                                          value={line.quantityToday || ''}
                                          onChange={e => updateWorkLine(idx, "quantityToday", Number(e.target.value))}
                                          placeholder="0.0"
                                          className={\`\${inputClass} pr-1 font-bold text-right \${isOver ? 'border-red-400 bg-red-50 text-red-700' : ''}\`}
                                        />
                                      </div>
                                      {isOver && <div className="text-[10px] text-red-600 font-bold mt-1 leading-tight text-right">Vượt {remaining}!</div>}
                                    </td>
                                    <td className="px-3 py-3">
                                      <input
                                        type="text"
                                        value={line.note || ''}
                                        onChange={e => updateWorkLine(idx, "note", e.target.value)}
                                        placeholder="Vị trí..."
                                        className={inputClass}
                                      />
                                    </td>
                                    <td className="px-3 py-3">
                                      <input
                                        type="text"
                                        value={line.proposalNote || ''}
                                        onChange={e => updateWorkLine(idx, "proposalNote", e.target.value)}
                                        placeholder="Xử lý..."
                                        className={inputClass}
                                      />
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                      <button 
                                        type="button" 
                                        onClick={() => removeWorkLine(idx)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mx-auto block"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-4">
                          {form.workLines.map((line, idx) => (
                            <SelectedWorkCard
                              key={idx}
                              line={line}
                              index={idx}
                              updateWorkLine={updateWorkLine}
                              removeWorkLine={removeWorkLine}
                            />
                          ))}
                        </div>
`;

dialog = dialog.replace(
  /<div className="space-y-4">[\s\S]*?<\/div>\n                    \)/,
  newWorkLinesUI + '\n                      </div>\n                    )'
);

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', dialog);
