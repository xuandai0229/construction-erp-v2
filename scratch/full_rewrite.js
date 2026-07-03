const fs = require('fs');
let code = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

// 1. Imports
code = code.replace('import { getProjectWorkItems, getWeeklyReportPreview } from "@/app/(dashboard)/reports/actions";', 
  'import { getProjectWorkItems, getWeeklyReportSummary } from "@/app/(dashboard)/reports/actions";\nimport { parseWeeklyGeneralNote, getDefaultWeeklyGeneralNote } from "@/lib/reports/weekly-report-utils";');

// 2. Initial state
code = code.replace(/summary: initialReport\.summary \|\| "",/g, 'summary: initialReport.summary || "",\n        weeklyNote: initialReport.weeklyNote || getDefaultWeeklyGeneralNote(),');
code = code.replace(/summary: "",/g, 'summary: "",\n      weeklyNote: getDefaultWeeklyGeneralNote(),');

// 3. Handlers
const newHandlersCode = `
  const handleWeeklyAssessmentChange = (field: string, value: string) => {
    setForm(prev => {
      const note = prev.weeklyNote || getDefaultWeeklyGeneralNote();
      return {
        ...prev,
        weeklyNote: {
          ...note,
          weeklyAssessment: {
            ...(note.weeklyAssessment || {}),
            [field]: value
          }
        }
      };
    });
  };

  const handlePlanGroupChange = (categoryIndex: number, field: string, value: any) => {
    setForm(prev => {
      const note = prev.weeklyNote || getDefaultWeeklyGeneralNote();
      const groups = [...(note.nextWeekPlanGroups || [])];
      if (!groups[categoryIndex]) return prev;
      groups[categoryIndex] = { ...groups[categoryIndex], [field]: value };
      return { ...prev, weeklyNote: { ...note, nextWeekPlanGroups: groups } };
    });
  };

  const handlePlanItemChange = (categoryIndex: number, itemIndex: number, field: string, value: any) => {
    setForm(prev => {
      const note = prev.weeklyNote || getDefaultWeeklyGeneralNote();
      const groups = [...(note.nextWeekPlanGroups || [])];
      if (!groups[categoryIndex]) return prev;
      const items = [...groups[categoryIndex].items];
      items[itemIndex] = { ...items[itemIndex], [field]: value };
      groups[categoryIndex] = { ...groups[categoryIndex], items };
      return { ...prev, weeklyNote: { ...note, nextWeekPlanGroups: groups } };
    });
  };

  const addPlanGroup = () => {
    setForm(prev => {
      const note = prev.weeklyNote || getDefaultWeeklyGeneralNote();
      const groups = [...(note.nextWeekPlanGroups || []), { categoryId: "new", categoryName: "Hạng mục mới", items: [] }];
      return { ...prev, weeklyNote: { ...note, nextWeekPlanGroups: groups } };
    });
  };

  const removePlanGroup = (categoryIndex: number) => {
    setForm(prev => {
      const note = prev.weeklyNote || getDefaultWeeklyGeneralNote();
      const groups = (note.nextWeekPlanGroups || []).filter((_, i) => i !== categoryIndex);
      return { ...prev, weeklyNote: { ...note, nextWeekPlanGroups: groups } };
    });
  };

  const addPlanItem = (categoryIndex: number) => {
    setForm(prev => {
      const note = prev.weeklyNote || getDefaultWeeklyGeneralNote();
      const groups = [...(note.nextWeekPlanGroups || [])];
      if (!groups[categoryIndex]) return prev;
      groups[categoryIndex] = {
        ...groups[categoryIndex],
        items: [...groups[categoryIndex].items, { workContent: "", unit: "Lần", plannedQuantity: 0, priority: "MEDIUM" }]
      };
      return { ...prev, weeklyNote: { ...note, nextWeekPlanGroups: groups } };
    });
  };

  const removePlanItem = (categoryIndex: number, itemIndex: number) => {
    setForm(prev => {
      const note = prev.weeklyNote || getDefaultWeeklyGeneralNote();
      const groups = [...(note.nextWeekPlanGroups || [])];
      if (!groups[categoryIndex]) return prev;
      const items = groups[categoryIndex].items.filter((_, i) => i !== itemIndex);
      groups[categoryIndex] = { ...groups[categoryIndex], items };
      return { ...prev, weeklyNote: { ...note, nextWeekPlanGroups: groups } };
    });
  };

  const handlePlanRangeChange = (field: string, value: string) => {
    setForm(prev => {
      const note = prev.weeklyNote || getDefaultWeeklyGeneralNote();
      return {
        ...prev,
        weeklyNote: {
          ...note,
          nextWeekPlanRange: {
            ...(note.nextWeekPlanRange || {}),
            [field]: value
          }
        }
      };
    });
  };
`;
code = code.replace(/const removeLine = \(index: number\) => \{[\s\S]*?\};\n/m, (match) => match + "\n" + newHandlersCode);

// 4. API Calls
code = code.replace("if (form.type === 'WEEKLY' && weeklyPreview?.approvedCount === 0) {", "if (form.type === 'WEEKLY' && weeklyPreview?.stats?.approvedReports === 0) {");
code = code.replace("const preview = await getWeeklyReportPreview(form.projectId, new Date(form.weekStartDate), new Date(form.weekEndDate));", "const preview = await getWeeklyReportSummary(form.projectId, new Date(form.weekStartDate), new Date(form.weekEndDate));");

// 5. Replace the whole Weekly Report render block (Section 2.5 and Weekly Summary)
const startReplace = code.indexOf('Tổng hợp báo cáo tuần');
const endReplace = code.indexOf('</form>');

if(startReplace !== -1 && endReplace !== -1) {
  const startWeeklyPreview = code.indexOf('{weeklyPreview && (', startReplace - 200);
  const startFormActions = code.indexOf('{/* Form Actions */}', startWeeklyPreview);
  
  if (startWeeklyPreview !== -1 && startFormActions !== -1) {
    const newUI = `{weeklyPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">BC Đã duyệt</p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{weeklyPreview.stats?.approvedReports}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Chưa duyệt</p>
                      <p className="text-xl font-bold text-amber-600 mt-1">{weeklyPreview.stats?.submittedReports}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Bị từ chối</p>
                      <p className="text-xl font-bold text-red-600 mt-1">{weeklyPreview.stats?.rejectedReports}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Ngày trống</p>
                      <p className="text-xl font-bold text-slate-700 mt-1">{weeklyPreview.stats?.emptyDays}</p>
                    </div>
                  </div>

                  {weeklyPreview.groups && weeklyPreview.groups.length > 0 ? (
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
                                  <td className="px-3 py-2 text-center">{item.unit || "-"}</td>
                                  <td className="px-3 py-2 text-right font-medium text-slate-900">{item.quantity}</td>
                                  <td className="px-3 py-2 text-center">
                                    {item.hasIssue ? (
                                      <span className="text-red-600 font-medium text-[10px] bg-red-50 px-1.5 py-0.5 rounded border border-red-200">Có lỗi</span>
                                    ) : (
                                      <span className="text-emerald-600 font-medium text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Bình thường</span>
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
                      <p>{weeklyPreview.emptyReason === "NO_REPORTS_IN_RANGE" ? "Không có báo cáo ngày nào được lập trong tuần này." : weeklyPreview.emptyReason === "NO_APPROVED_REPORTS" ? "Không có báo cáo ngày nào ĐƯỢC DUYỆT trong tuần này." : "Không có khối lượng nào được tổng hợp."}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-6 pt-4 border-t border-slate-200 mt-6">
                <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-800 mb-4">
                  Đánh giá chung
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">Tiến độ</label>
                    <select 
                      value={form.weeklyNote?.weeklyAssessment?.progressStatus || "ON_TRACK"}
                      onChange={(e) => handleWeeklyAssessmentChange("progressStatus", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                    >
                      <option value="ON_TRACK">Đúng tiến độ</option>
                      <option value="AHEAD">Vượt tiến độ</option>
                      <option value="DELAYED">Trễ tiến độ</option>
                      <option value="WATCHING">Cần theo dõi</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">Chất lượng</label>
                    <select 
                      value={form.weeklyNote?.weeklyAssessment?.qualityStatus || "PASSED"}
                      onChange={(e) => handleWeeklyAssessmentChange("qualityStatus", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                    >
                      <option value="PASSED">Đạt yêu cầu</option>
                      <option value="NEED_RECHECK">Cần kiểm tra lại</option>
                      <option value="FAILED">Không đạt</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">An toàn</label>
                    <select 
                      value={form.weeklyNote?.weeklyAssessment?.safetyStatus || "SAFE"}
                      onChange={(e) => handleWeeklyAssessmentChange("safetyStatus", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                    >
                      <option value="SAFE">An toàn</option>
                      <option value="RISK">Có rủi ro</option>
                      <option value="INCIDENT">Sự cố</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Đánh giá chi tiết (Nêu rõ các vấn đề nổi bật, vướng mắc, giải pháp) <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    value={form.summary || ""}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                    placeholder="Nhập nội dung đánh giá chi tiết..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2.5: Next week plan */}
          {form.type === "WEEKLY" && (
            <div className="space-y-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm mt-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
                  <TrendingUp className="w-[18px] h-[18px] text-blue-600" />
                  Kế hoạch thực hiện trong tuần tiếp theo
                </h4>
              </div>

              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Từ ngày</label>
                    <input 
                      type="date"
                      value={form.weeklyNote?.nextWeekPlanRange?.fromDate || ""}
                      onChange={(e) => handlePlanRangeChange("fromDate", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Đến ngày</label>
                    <input 
                      type="date"
                      value={form.weeklyNote?.nextWeekPlanRange?.toDate || ""}
                      onChange={(e) => handlePlanRangeChange("toDate", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-slate-800">Danh sách công việc dự kiến theo hạng mục</h4>
                    <button 
                      type="button"
                      onClick={addPlanGroup}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm Hạng mục
                    </button>
                  </div>

                  <div className="space-y-6">
                    {(form.weeklyNote?.nextWeekPlanGroups || []).length === 0 ? (
                      <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 bg-slate-50/50">
                        Chưa có kế hoạch công việc nào. Bấm "Thêm hạng mục" để bắt đầu lập kế hoạch.
                      </div>
                    ) : (
                      (form.weeklyNote?.nextWeekPlanGroups || []).map((group, gIdx) => (
                        <div key={gIdx} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={group.categoryName || ""}
                                onChange={(e) => handlePlanGroupChange(gIdx, "categoryName", e.target.value)}
                                className="w-full font-semibold text-slate-800 bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 px-0 py-1"
                                placeholder="Tên hạng mục..."
                              />
                            </div>
                            <button 
                              type="button"
                              onClick={() => addPlanItem(gIdx)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded hover:bg-slate-50 transition-colors shadow-sm"
                            >
                              <Plus className="w-3 h-3" /> Thêm CV
                            </button>
                            <button 
                              type="button"
                              onClick={() => removePlanGroup(gIdx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Xóa hạng mục này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="p-4 space-y-4">
                            {group.items.length === 0 ? (
                              <div className="text-center p-4 text-sm text-slate-500 italic">Chưa có công việc trong hạng mục này</div>
                            ) : (
                              group.items.map((item, iIdx) => (
                                <div key={iIdx} className="relative p-4 bg-slate-50 border border-slate-100 rounded-lg group hover:border-blue-200 transition-colors">
                                  <button 
                                    type="button"
                                    onClick={() => removePlanItem(gIdx, iIdx)}
                                    className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  <div className="grid grid-cols-12 gap-x-4 gap-y-3 pr-6">
                                    <div className="col-span-12">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">Nội dung công việc <span className="text-red-500">*</span></label>
                                      <input 
                                        type="text"
                                        value={item.workContent || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "workContent", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="VD: Gia công cốt thép..."
                                      />
                                    </div>
                                    
                                    <div className="col-span-4 md:col-span-2">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">K.Lượng</label>
                                      <input 
                                        type="number"
                                        min="0" step="any"
                                        value={item.plannedQuantity || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "plannedQuantity", Number(e.target.value))}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-right"
                                      />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">Đơn vị</label>
                                      <input 
                                        type="text"
                                        value={item.unit || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "unit", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-center"
                                      />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">Mức độ</label>
                                      <select 
                                        value={item.priority || "MEDIUM"}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "priority", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-center"
                                      >
                                        <option value="HIGH">Cao</option>
                                        <option value="MEDIUM">Vừa</option>
                                        <option value="LOW">Thấp</option>
                                      </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">Người phụ trách</label>
                                      <input 
                                        type="text"
                                        value={item.ownerName || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "ownerName", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm"
                                        placeholder="Tên người..."
                                      />
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">Vật tư / Thiết bị</label>
                                      <input 
                                        type="text"
                                        value={item.materials || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "materials", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm"
                                        placeholder="Sắt, thép, xi măng..."
                                      />
                                    </div>
                                    <div className="col-span-12">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">Tiêu chí đạt / Rủi ro</label>
                                      <input 
                                        type="text"
                                        value={item.acceptanceCriteria || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "acceptanceCriteria", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm"
                                        placeholder="Ví dụ: Đạt cường độ mác 250, rủi ro mưa..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          `;
    code = code.substring(0, startWeeklyPreview) + newUI + code.substring(startFormActions);
    fs.writeFileSync('src/components/reports/create-report-dialog.tsx', code);
  }
}
