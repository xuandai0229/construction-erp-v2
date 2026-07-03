const fs = require('fs');
let code = fs.readFileSync('src/components/reports/create-report-dialog.tsx', 'utf8');

// 1. Add to EMPTY_FORM
code = code.replace(
  '  workLines: [],\r\n',
  '  workLines: [],\r\n  nextWeekPlans: [],\r\n'
);
code = code.replace(
  '  workLines: [],\n',
  '  workLines: [],\n  nextWeekPlans: [],\n'
);

// 2. Add to edit form init
code = code.replace(
  '        workLines: initialReport.workLines && initialReport.workLines.length > 0 \r\n          ? initialReport.workLines \r\n          : [{ workContent: "", unit: "Lần", quantityToday: 0 }],',
  '        workLines: initialReport.workLines && initialReport.workLines.length > 0 \r\n          ? initialReport.workLines \r\n          : [{ workContent: "", unit: "Lần", quantityToday: 0 }],\r\n        nextWeekStartDate: initialReport.nextWeekStartDate,\r\n        nextWeekEndDate: initialReport.nextWeekEndDate,\r\n        nextWeekPlans: initialReport.nextWeekPlans || [],'
);
code = code.replace(
  '        workLines: initialReport.workLines && initialReport.workLines.length > 0 \n          ? initialReport.workLines \n          : [{ workContent: "", unit: "Lần", quantityToday: 0 }],',
  '        workLines: initialReport.workLines && initialReport.workLines.length > 0 \n          ? initialReport.workLines \n          : [{ workContent: "", unit: "Lần", quantityToday: 0 }],\n        nextWeekStartDate: initialReport.nextWeekStartDate,\n        nextWeekEndDate: initialReport.nextWeekEndDate,\n        nextWeekPlans: initialReport.nextWeekPlans || [],'
);

// 3. Add to create form init
code = code.replace(
  '      workLines: [{ workContent: "", unit: "Lần", quantityToday: 0 }],',
  '      workLines: [{ workContent: "", unit: "Lần", quantityToday: 0 }],\n      nextWeekPlans: [],'
);

// 4. Handlers for nextWeekPlans
code = code.replace(
  '  const addWorkLine = () => {',
  `  const updateNextWeekPlan = (index: number, field: keyof import('./types').NextWeekPlan, value: string | number) => {
    setForm(prev => {
      const newPlans = [...(prev.nextWeekPlans || [])];
      newPlans[index] = { ...newPlans[index], [field]: value };
      if (field === "wbsItemId" && value) {
        const item = workItems.find(i => i.id === value);
        if (item) {
          newPlans[index].workContent = item.name;
          newPlans[index].unit = item.unit;
        }
      }
      return { ...prev, nextWeekPlans: newPlans };
    });
  };

  const addNextWeekPlan = () => {
    setForm(prev => ({
      ...prev,
      nextWeekPlans: [...(prev.nextWeekPlans || []), { workContent: "", unit: "Lần", plannedQuantity: 0 }]
    }));
  };

  const removeNextWeekPlan = (index: number) => {
    setForm(prev => ({
      ...prev,
      nextWeekPlans: (prev.nextWeekPlans || []).filter((_, i) => i !== index)
    }));
  };

  const addWorkLine = () => {`
);

// 5. Auto-calculate next week dates
code = code.replace(
  "  const updateField = useCallback((field: keyof CreateReportFormData, value: unknown) => {",
  `  const updateField = useCallback((field: keyof CreateReportFormData, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value } as CreateReportFormData;
      if (field === 'weekEndDate' && value && typeof value === 'string') {
        const endDate = new Date(value);
        if (!isNaN(endDate.getTime())) {
          const nextStart = new Date(endDate);
          nextStart.setDate(nextStart.getDate() + 1);
          const nextEnd = new Date(nextStart);
          nextEnd.setDate(nextStart.getDate() + 6);
          next.nextWeekStartDate = nextStart.toISOString().split('T')[0];
          next.nextWeekEndDate = nextEnd.toISOString().split('T')[0];
        }
      }
      return next;
    });
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);
  
  // ignore this to replace original
  const updateFieldOriginal = useCallback((field: keyof CreateReportFormData, value: unknown) => {`
);

// 6. Section 2: Kế hoạch tuần
const UI_PLAN = `
          {/* Section 2.5: Next week plan */}
          {form.type === 'WEEKLY' && (
            <div className="space-y-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm mt-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
                  <TrendingUp className="w-[18px] h-[18px] text-blue-600" />
                  Kế hoạch thực hiện trong tuần tiếp theo
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Từ ngày</label>
                    <input type="date" value={form.nextWeekStartDate || ''} onChange={e => updateField('nextWeekStartDate', e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Đến ngày</label>
                    <input type="date" value={form.nextWeekEndDate || ''} onChange={e => updateField('nextWeekEndDate', e.target.value)} className={inputClass} />
                  </div>
              </div>

              <div className="space-y-4 pt-2">
                {(form.nextWeekPlans || []).map((line, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 relative">
                    <button 
                      type="button" 
                      onClick={() => removeNextWeekPlan(idx)}
                      className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Xóa dòng"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="pr-8 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Hạng mục / Công việc</label>
                      <div className="flex gap-2 flex-col sm:flex-row">
                        {workItems.length > 0 && (
                          <select
                            value={line.wbsItemId || ""}
                            onChange={(e) => updateNextWeekPlan(idx, "wbsItemId", e.target.value)}
                            className={\`\${inputClass} sm:w-1/3 appearance-none cursor-pointer\`}
                          >
                            <option value="">-- Chọn hạng mục --</option>
                            {workItems.map(wi => <option key={wi.id} value={wi.id}>{wi.name}</option>)}
                          </select>
                        )}
                        <input
                          type="text"
                          value={line.workContent}
                          onChange={(e) => updateNextWeekPlan(idx, "workContent", e.target.value)}
                          placeholder="Công việc dự kiến..."
                          className={\`\${inputClass} flex-1\`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Khối lượng</label>
                        <input
                          type="number"
                          value={line.plannedQuantity || ''}
                          onChange={e => updateNextWeekPlan(idx, "plannedQuantity", Number(e.target.value))}
                          placeholder="0.0"
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Đơn vị</label>
                        <input
                          type="text"
                          value={line.unit || ''}
                          onChange={e => updateNextWeekPlan(idx, "unit", e.target.value)}
                          placeholder="VD: m3, tấn"
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-xs font-semibold text-slate-700">Nhân lực / Máy móc</label>
                        <input
                          type="text"
                          value={line.resources || ''}
                          onChange={e => updateNextWeekPlan(idx, "resources", e.target.value)}
                          placeholder="Dự kiến..."
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addNextWeekPlan}
                  className="w-full border-dashed border-2 border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm dòng kế hoạch
                </Button>
              </div>
            </div>
          )}

          {/* Section 3: Media & Files */}`;
code = code.replace('{/* Section 3: Media & Files */}', UI_PLAN);

fs.writeFileSync('src/components/reports/create-report-dialog.tsx', code);
