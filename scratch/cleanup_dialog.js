const fs = require("fs"); let code = fs.readFileSync("src/components/reports/create-report-dialog.tsx", "utf8");

// Remove everything from the first "Section 2.5" onwards and replace it with a single new Plan UI
const startIdx = code.indexOf("{/* Section 2.5: Next week plan */}");
const endFormIdx = code.indexOf("</form>");

if (startIdx !== -1 && endFormIdx !== -1) {
  const newPlanUI = `          {/* Section 2.5: Next week plan */}
          {form.type === "WEEKLY" && (
            <div className="space-y-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm mt-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
                  <TrendingUp className="w-[18px] h-[18px] text-blue-600" />
                  K? ho?ch th?c hi?n trong tu?n ti?p theo
                </h4>
              </div>

              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">T? ngày</label>
                    <input 
                      type="date"
                      value={form.weeklyNote?.nextWeekPlanRange?.fromDate || ""}
                      onChange={(e) => handlePlanRangeChange("fromDate", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ð?n ngày</label>
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
                    <h4 className="font-semibold text-slate-800">Danh sách công vi?c d? ki?n theo h?ng m?c</h4>
                    <button 
                      type="button"
                      onClick={addPlanGroup}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm H?ng m?c
                    </button>
                  </div>

                  <div className="space-y-6">
                    {(form.weeklyNote?.nextWeekPlanGroups || []).length === 0 ? (
                      <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 bg-slate-50/50">
                        Chua có k? ho?ch công vi?c nào. B?m "Thêm h?ng m?c" d? b?t d?u l?p k? ho?ch.
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
                                placeholder="Tên h?ng m?c..."
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
                              title="Xóa h?ng m?c này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="p-4 space-y-4">
                            {group.items.length === 0 ? (
                              <div className="text-center p-4 text-sm text-slate-500 italic">Chua có công vi?c trong h?ng m?c này</div>
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
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">N?i dung công vi?c <span className="text-red-500">*</span></label>
                                      <input 
                                        type="text"
                                        value={item.workContent || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "workContent", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="VD: Gia công c?t thép..."
                                      />
                                    </div>
                                    
                                    <div className="col-span-4 md:col-span-2">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">K.Lu?ng</label>
                                      <input 
                                        type="number"
                                        min="0" step="any"
                                        value={item.plannedQuantity || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "plannedQuantity", Number(e.target.value))}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-right"
                                      />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">Ðon v?</label>
                                      <input 
                                        type="text"
                                        value={item.unit || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "unit", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-center"
                                      />
                                    </div>
                                    <div className="col-span-4 md:col-span-2">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">M?c d?</label>
                                      <select 
                                        value={item.priority || "MEDIUM"}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "priority", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-center"
                                      >
                                        <option value="HIGH">Cao</option>
                                        <option value="MEDIUM">V?a</option>
                                        <option value="LOW">Th?p</option>
                                      </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">Ngu?i ph? trách</label>
                                      <input 
                                        type="text"
                                        value={item.ownerName || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "ownerName", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm"
                                        placeholder="Tên ngu?i..."
                                      />
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">V?t tu / Thi?t b?</label>
                                      <input 
                                        type="text"
                                        value={item.materials || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "materials", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm"
                                        placeholder="S?t, thép, xi mang..."
                                      />
                                    </div>
                                    <div className="col-span-12">
                                      <label className="block text-[11px] font-medium text-slate-500 uppercase mb-1">Tiêu chí d?t / R?i ro</label>
                                      <input 
                                        type="text"
                                        value={item.acceptanceCriteria || ""}
                                        onChange={(e) => handlePlanItemChange(gIdx, iIdx, "acceptanceCriteria", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm"
                                        placeholder="Ví d?: Ð?t cu?ng d? mác 250, r?i ro mua..."
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
          
          {/* Form Actions */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 -mx-4 -mb-4 mt-8 flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              H?y
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSubmitDraft} 
              disabled={isSubmitting}
              className="bg-slate-50 hover:bg-slate-100"
            >
              Luu nháp
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ðang x? lý...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Hoàn t?t g?i
                </>
              )}
            </Button>
          </div>
`;
  code = code.substring(0, startIdx) + newPlanUI + code.substring(endFormIdx);
  fs.writeFileSync("src/components/reports/create-report-dialog.tsx", code);
}

