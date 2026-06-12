export const sharedTableStyles = {
  // Shared column width values
  colWidths: {
    stt: "w-[56px] min-w-[56px] max-w-[56px]",
    content: "min-w-[300px] max-w-[420px]",
    crew: "min-w-[160px] w-[170px] max-w-[180px]",
    unit: "min-w-[80px] w-[90px] max-w-[100px]",
    designQty: "min-w-[130px] w-[140px] max-w-[150px]",
    dayQty: "min-w-[90px] w-[100px] max-w-[110px]", // for daily columns
    periodQty: "min-w-[140px] w-[150px] max-w-[160px]", // for 'Phát sinh trong kỳ'
    cumulative: "min-w-[130px] w-[140px] max-w-[150px]",
    remaining: "min-w-[130px] w-[140px] max-w-[150px]",
    percent: "min-w-[80px] w-[90px] max-w-[100px]",
    status: "w-[110px]",
    action: "w-[90px]",
    notes: "min-w-[140px]"
  },
  
  // Shared column classes
  cols: {
    stt: "w-[56px] min-w-[56px] max-w-[56px] text-center",
    content: "min-w-[300px] max-w-[420px] text-left",
    crew: "min-w-[160px] w-[170px] max-w-[180px] text-center",
    unit: "min-w-[80px] w-[90px] max-w-[100px] text-center",
    designQty: "min-w-[130px] w-[140px] max-w-[150px] text-right",
    dayQty: "min-w-[90px] w-[100px] max-w-[110px] text-right",
    periodQty: "min-w-[140px] w-[150px] max-w-[160px] text-right",
    cumulative: "min-w-[130px] w-[140px] max-w-[150px] text-right",
    remaining: "min-w-[130px] w-[140px] max-w-[150px] text-right",
    percent: "min-w-[80px] w-[90px] max-w-[100px] text-right",
    status: "w-[110px] text-center",
    action: "w-[90px] text-center",
    notes: "min-w-[140px] text-left"
  },

  // Common header styling
  headerTh: "align-middle px-3 py-3 text-[13px] font-semibold text-slate-600 uppercase tracking-wide border-r border-slate-200 bg-slate-50",
  
  // Common cell styling
  cellTd: "align-middle h-14 px-3 py-3 border-r border-slate-100 text-sm font-medium bg-white text-slate-700",
  
  // Group row styling - uses ! to override cellTd's bg-white 
  groupRow: "bg-slate-50 border-slate-200 [&>td]:bg-slate-50",
  
  // Work row styling
  workRow: "bg-white hover:bg-slate-50/50 transition-colors"
};
