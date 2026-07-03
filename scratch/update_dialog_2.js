const fs = require('fs');
let code = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

code = code.replace('import { getProjectWorkItems, getWeeklyReportPreview } from "@/app/(dashboard)/reports/actions";', 'import { getProjectWorkItems, getWeeklyReportSummary } from "@/app/(dashboard)/reports/actions";\nimport { parseWeeklyGeneralNote, getDefaultWeeklyGeneralNote } from "@/lib/reports/weekly-report-utils";');

code = code.replace('const preview = await getWeeklyReportPreview(form.projectId, new Date(form.weekStartDate), new Date(form.weekEndDate));', 'const preview = await getWeeklyReportSummary(form.projectId, new Date(form.weekStartDate), new Date(form.weekEndDate));');

code = code.replace('if (form.type === \'WEEKLY\' && weeklyPreview?.approvedCount === 0) {', 'if (form.type === \'WEEKLY\' && weeklyPreview?.stats?.approvedReports === 0) {');

code = code.replace('weeklyPreview.approvedCount', 'weeklyPreview.stats?.approvedReports');
code = code.replace('weeklyPreview.pendingCount', 'weeklyPreview.stats?.submittedReports');
code = code.replace('weeklyPreview.rejectedCount', 'weeklyPreview.stats?.rejectedReports');
code = code.replace('weeklyPreview.missingDays', 'weeklyPreview.stats?.emptyDays');

const oldTable = `{weeklyPreview.aggregatedItems.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="text-left px-3 py-2 text-slate-600 font-semibold">Hạng mục / Công việc</th>
                              <th className="text-center px-3 py-2 text-slate-600 font-semibold w-24">Đơn vị</th>
                              <th className="text-right px-3 py-2 text-slate-600 font-semibold w-24">K.Lượng</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {weeklyPreview.aggregatedItems.map((item: { workName: string, unit?: string | null, totalQuantity: number }, idx: number) => (
                              <tr key={idx}>
                                <td className="px-3 py-2">{item.workName}</td>
                                <td className="px-3 py-2 text-center">{item.unit || '-'}</td>
                                <td className="px-3 py-2 text-right font-medium text-slate-900">{item.totalQuantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-amber-50 text-amber-700 p-4 rounded-lg border border-amber-200 text-sm flex gap-3 items-center">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p>Không có khối lượng công việc nào được tổng hợp từ các báo cáo ngày đã duyệt trong tuần này.</p>
                      </div>
                    )}`;

const newTable = `{weeklyPreview.groups && weeklyPreview.groups.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="text-left px-3 py-2 text-slate-600 font-semibold">Công việc / Hạng mục</th>
                              <th className="text-center px-3 py-2 text-slate-600 font-semibold w-24">Đơn vị</th>
                              <th className="text-right px-3 py-2 text-slate-600 font-semibold w-24">K.Lượng</th>
                              <th className="text-center px-3 py-2 text-slate-600 font-semibold w-24">Tình trạng</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {weeklyPreview.groups.map((group: any, gIdx: number) => (
                              <React.Fragment key={gIdx}>
                                <tr className="bg-slate-100">
                                  <td colSpan={4} className="px-3 py-2 font-semibold text-slate-800">
                                    {group.categoryName}
                                  </td>
                                </tr>
                                {group.items.map((item: any, iIdx: number) => (
                                  <tr key={iIdx}>
                                    <td className="px-3 py-2 pl-6">{item.workContent}</td>
                                    <td className="px-3 py-2 text-center">{item.unit || '-'}</td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-900">{item.quantity}</td>
                                    <td className="px-3 py-2 text-center">
                                      {item.hasIssue ? (
                                        <span className="text-red-600 font-medium text-xs bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3" /> Vấn đề</span>
                                      ) : (
                                        <span className="text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Bình thường</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-amber-50 text-amber-700 p-4 rounded-lg border border-amber-200 text-sm flex gap-3 items-center">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p>{weeklyPreview.emptyReason === "NO_REPORTS_IN_RANGE" ? "Không có báo cáo ngày nào được lập trong tuần này." : weeklyPreview.emptyReason === "NO_APPROVED_REPORTS" ? "Không có báo cáo ngày nào ĐƯỢC DUYỆT trong tuần này. Vui lòng duyệt báo cáo ngày trước khi tổng hợp tuần." : "Không có khối lượng công việc nào được tổng hợp từ các báo cáo ngày đã duyệt trong tuần này."}</p>
                      </div>
                    )}`;

code = code.replace(oldTable, newTable);
fs.writeFileSync('src/components/reports/create-report-dialog.tsx', code);
