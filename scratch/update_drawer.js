const fs = require('fs');
let code = fs.readFileSync('src/components/reports/report-detail-drawer.tsx', 'utf8');

const startStr = "{report.type === 'WEEKLY' && (report.nextWeekPlans && report.nextWeekPlans.length > 0) && (";
const start = code.indexOf(startStr);

if (start !== -1) {
  // Find the end of this block which ends with `</div>\n            </div>\n          )}`
  const endStr = "</div>\n            </div>\n          )}";
  const end = code.indexOf(endStr, start);
  
  if (end !== -1) {
    const newSection = `          {report.type === 'WEEKLY' && report.weeklyNote?.nextWeekPlanGroups && report.weeklyNote.nextWeekPlanGroups.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <TrendingUp className="w-[18px] h-[18px] text-blue-600" />
                  Kế hoạch thực hiện tuần sau
                  {report.weeklyNote.nextWeekPlanRange?.fromDate && report.weeklyNote.nextWeekPlanRange?.toDate && (
                    <span className="text-xs font-normal text-slate-500">
                      ({report.weeklyNote.nextWeekPlanRange.fromDate} - {report.weeklyNote.nextWeekPlanRange.toDate})
                    </span>
                  )}
                </h4>
                
                <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Công việc</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600 w-24">K.Lượng</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600 w-20">ĐVT</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Phụ trách</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">Mức độ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {report.weeklyNote.nextWeekPlanGroups.map((group: any, gIdx: number) => (
                        <React.Fragment key={gIdx}>
                          <tr className="bg-slate-100/50">
                            <td colSpan={5} className="px-3 py-2 font-semibold text-slate-700">{group.categoryName}</td>
                          </tr>
                          {group.items.map((item: any, iIdx: number) => (
                            <tr key={iIdx}>
                              <td className="px-3 py-2 pl-6 font-medium text-slate-800">{item.workContent}</td>
                              <td className="px-3 py-2 text-right font-medium text-slate-900">{item.plannedQuantity || "-"}</td>
                              <td className="px-3 py-2 text-center">{item.unit || "-"}</td>
                              <td className="px-3 py-2 text-slate-600">{item.ownerName || "-"}</td>
                              <td className="px-3 py-2 text-center">
                                {item.priority === "HIGH" ? <span className="text-red-600 font-medium text-[10px] bg-red-50 px-1.5 py-0.5 rounded border border-red-200">Cao</span> : 
                                 item.priority === "LOW" ? <span className="text-slate-600 font-medium text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">Thấp</span> : 
                                 <span className="text-blue-600 font-medium text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Vừa</span>}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}`;
    code = code.substring(0, start) + newSection + code.substring(end + endStr.length);
    fs.writeFileSync('src/components/reports/report-detail-drawer.tsx', code);
  } else { console.log('End not found'); }
} else { console.log('Start not found'); }
