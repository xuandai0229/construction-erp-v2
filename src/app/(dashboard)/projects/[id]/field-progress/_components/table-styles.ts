export const sharedTableStyles = {
  // Shared column width values
  colWidths: {
    stt: "w-[56px]",
    content: "min-w-[280px]",
    crew: "w-[130px]",
    unit: "w-[80px]",
    designQty: "w-[130px]",
    dayQty: "w-[120px]",
    cumulative: "w-[130px]",
    remaining: "w-[130px]",
    percent: "w-[90px]",
    status: "w-[110px]",
    action: "w-[90px]",
    notes: "min-w-[140px]"
  },
  
  // Shared column classes
  cols: {
    stt: "w-[56px] text-center",
    content: "min-w-[280px] text-left",
    crew: "w-[130px] text-center",
    unit: "w-[80px] text-center",
    designQty: "w-[130px] text-right",
    dayQty: "w-[120px] text-right",
    cumulative: "w-[130px] text-right",
    remaining: "w-[130px] text-right",
    percent: "w-[90px] text-right",
    status: "w-[110px] text-center",
    action: "w-[90px] text-center",
    notes: "min-w-[140px] text-left"
  },

  // Common header styling
  headerTh: "px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-slate-200 bg-slate-50",
  
  // Common cell styling
  cellTd: "h-14 px-3 py-3 border-r border-slate-100 text-sm font-medium",
  
  // Group row styling
  groupRow: "bg-slate-50 border-slate-200",
  
  // Work row styling
  workRow: "bg-white hover:bg-slate-50/50 transition-colors"
};
