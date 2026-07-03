const fs = require("fs");
let c = fs.readFileSync("src/components/reports/create-report-dialog.tsx", "utf8");

const startIdx = c.indexOf("{weeklyPreview && (");
const endIdx = c.indexOf("<div className=\\"space-y-1.5 pt-1\\">", startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const newUI = `{weeklyPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">BC Ðã duy?t</p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{weeklyPreview.stats.approvedReports}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Ðã g?i</p>
                      <p className="text-xl font-bold text-amber-600 mt-1">{weeklyPreview.stats.submittedReports}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">B? t? ch?i</p>
                      <p className="text-xl font-bold text-red-600 mt-1">{weeklyPreview.stats.rejectedReports}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Ngày tr?ng</p>
                      <p className="text-xl font-bold text-slate-700 mt-1">{weeklyPreview.stats.emptyDays}</p>
                    </div>
                  </div>

                  {weeklyPreview.emptyReason === "ERROR" && (
                    <p className="text-center text-red-500 text-sm py-4 border border-red-200 bg-red-50 rounded-lg">L?i: {weeklyPreview.errorMessage}</p>
                  )}
                  {weeklyPreview.emptyReason === "NO_DAILY_REPORTS" && (
                    <p className="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-200 rounded-lg">Chua có báo cáo ngày trong kho?ng th?i gian này.</p>
                  )}
                  {weeklyPreview.emptyReason === "HAS_REPORTS_BUT_NO_WORK_LINES" && (
                    <p className="text-center text-amber-600 text-sm py-4 border border-amber-200 bg-amber-50 rounded-lg">Có báo cáo ngày nhung chua có dòng kh?i lu?ng/công vi?c d? t?ng h?p.</p>
                  )}

                  {weeklyPreview.groups && weeklyPreview.groups.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-3 py-2 text-slate-600 font-semibold">H?ng m?c / Công vi?c</th>
                            <th className="text-center px-3 py-2 text-slate-600 font-semibold w-24">ÐVT</th>
                            <th className="text-right px-3 py-2 text-slate-600 font-semibold w-32">Kh?i lu?ng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {weeklyPreview.groups.map((group, gIdx) => (
                            <React.Fragment key={gIdx}>
                              <tr className="bg-slate-100/50">
                                <td colSpan={3} className="px-3 py-2 font-semibold text-slate-700">{group.categoryName}</td>
                              </tr>
                              {group.items && group.items.map((item, iIdx) => (
                                <tr key={iIdx}>
                                  <td className="px-3 py-2 pl-6">{item.workContent}</td>
                                  <td className="px-3 py-2 text-center">{item.unit || "-"}</td>
                                  <td className="px-3 py-2 text-right font-medium text-slate-900">{item.quantity}</td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              `;
  c = c.substring(0, startIdx) + newUI + c.substring(endIdx);
  fs.writeFileSync("src/components/reports/create-report-dialog.tsx", c);
  console.log("Successfully replaced UI");
} else {
  console.log("Could not find boundaries.");
}

