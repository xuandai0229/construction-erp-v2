const fs = require('fs');
let c = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

c = c.replace('const [weeklyPreview, setWeeklyPreview] = useState<any>(null);', 
`type WeeklyReportPreviewClient = {
  range: { fromDate: string; toDate: string; };
  dayStatuses: any[];
  stats: { approvedReports: number; submittedReports: number; draftReports: number; rejectedReports: number; emptyDays: number; workLineCount: number; attachmentCount: number; };
  groups: { categoryId?: string; categoryName: string; items: { workItemId?: string; workContent: string; unit?: string; quantity: number; dates: string[]; sourceReports: any[]; sourceStatus: string; resultStatus?: string; issueNote?: string; attachmentCount: number; }[]; }[];
  emptyReason: string | null;
  errorMessage?: string;
};
  const [weeklyPreview, setWeeklyPreview] = useState<WeeklyReportPreviewClient | null>(null);`);

const setPrevStart = c.indexOf("const preview = await getWeeklyReportSummary(form.projectId, new Date(form.weekStartDate), new Date(form.weekEndDate));");
if (setPrevStart !== -1) {
  const setPrevEnd = c.indexOf("setWeeklyPreview(preview);", setPrevStart);
  if (setPrevEnd !== -1) {
    c = c.substring(0, setPrevStart) + `const preview = await getWeeklyReportSummary(form.projectId, new Date(form.weekStartDate), new Date(form.weekEndDate));
      setWeeklyPreview({
        range: preview.range || { fromDate: "", toDate: "" },
        dayStatuses: Array.isArray(preview.dayStatuses) ? preview.dayStatuses : [],
        stats: preview.stats || { approvedReports: 0, submittedReports: 0, draftReports: 0, rejectedReports: 0, emptyDays: 0, workLineCount: 0, attachmentCount: 0 },
        groups: Array.isArray(preview.groups) ? preview.groups : [],
        emptyReason: preview.emptyReason || null
      });` + c.substring(setPrevEnd + 26);
  }
}

c = c.replace(/catch \(e: unknown\) \{\n\s+toast\.error\("Lỗi khi tổng hợp báo cáo tuần"\);\n\s+console\.error\(e\);\n\s+\}/, `catch (e: any) {
      toast.error("Lỗi khi tổng hợp báo cáo tuần");
      console.error(e);
      setWeeklyPreview({
        range: { fromDate: "", toDate: "" },
        dayStatuses: [],
        stats: { approvedReports: 0, submittedReports: 0, draftReports: 0, rejectedReports: 0, emptyDays: 0, workLineCount: 0, attachmentCount: 0 },
        groups: [],
        emptyReason: "ERROR",
        errorMessage: e?.message || "Lỗi không xác định"
      });
    }`);

const oldUIStr = `{weeklyPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">BC Đã duyệt</p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{weeklyPreview.approvedCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Chưa duyệt</p>
                      <p className="text-xl font-bold text-amber-600 mt-1">{weeklyPreview.pendingCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Bị từ chối</p>
                      <p className="text-xl font-bold text-red-600 mt-1">{weeklyPreview.rejectedCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Ngày trống</p>
                      <p className="text-xl font-bold text-slate-700 mt-1">{weeklyPreview.missingDays}</p>
                    </div>
                  </div>

                  {weeklyPreview.aggregatedItems.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-3 py-2 text-slate-600 font-semibold">Hạng mục / Công việc</th>
                            <th className="text-center px-3 py-2 text-slate-600 font-semibold w-24">ĐVT</th>
                            <th className="text-right px-3 py-2 text-slate-600 font-semibold w-32">Khối lượng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
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
                    <p className="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-200 rounded-lg">Không có khối lượng công việc nào được tổng hợp (Yêu cầu báo cáo ngày phải được duyệt).</p>
                  )}
                </div>
              )}`;

const newUIStr = `{weeklyPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">BC Đã duyệt</p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{weeklyPreview.stats.approvedReports}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Đã gửi</p>
                      <p className="text-xl font-bold text-amber-600 mt-1">{weeklyPreview.stats.submittedReports}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Bị từ chối</p>
                      <p className="text-xl font-bold text-red-600 mt-1">{weeklyPreview.stats.rejectedReports}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Ngày trống</p>
                      <p className="text-xl font-bold text-slate-700 mt-1">{weeklyPreview.stats.emptyDays}</p>
                    </div>
                  </div>

                  {weeklyPreview.emptyReason === "ERROR" && (
                    <p className="text-center text-red-500 text-sm py-4 border border-red-200 bg-red-50 rounded-lg">Lỗi: {weeklyPreview.errorMessage}</p>
                  )}
                  {weeklyPreview.emptyReason === "NO_DAILY_REPORTS" && (
                    <p className="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-200 rounded-lg">Chưa có báo cáo ngày trong khoảng thời gian này.</p>
                  )}
                  {weeklyPreview.emptyReason === "NO_APPROVED_REPORTS" && (
                    <p className="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-200 rounded-lg">Có báo cáo ngày nhưng chưa có báo cáo nào được duyệt.</p>
                  )}
                  {weeklyPreview.emptyReason === "HAS_REPORTS_BUT_NO_WORK_LINES" && (
                    <p className="text-center text-amber-600 text-sm py-4 border border-amber-200 bg-amber-50 rounded-lg">Có báo cáo ngày nhưng chưa có dòng khối lượng/công việc để tổng hợp.</p>
                  )}

                  {weeklyPreview.groups && weeklyPreview.groups.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-3 py-2 text-slate-600 font-semibold">Hạng mục / Công việc</th>
                            <th className="text-center px-3 py-2 text-slate-600 font-semibold w-24">ĐVT</th>
                            <th className="text-right px-3 py-2 text-slate-600 font-semibold w-32">Khối lượng</th>
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
                                  <td className="px-3 py-2 text-center">{item.unit || '-'}</td>
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
              )}`;

if (c.includes(oldUIStr)) {
  c = c.replace(oldUIStr, newUIStr);
} else {
  console.log("Could not find old UI string exactly.");
}

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', c);
