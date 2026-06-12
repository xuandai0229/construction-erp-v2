export const sharedTableStyles = {
  // Shared column width values
  colWidths: {
    stt: "w-[64px] min-w-[64px] max-w-[64px]",
    content: "min-w-[380px] max-w-[460px]",
    crew: "min-w-[240px] w-[280px] max-w-[320px]",
    unit: "min-w-[110px] w-[120px] max-w-[130px]",
    designQty: "min-w-[170px] w-[180px] max-w-[190px]",
    dayQty: "min-w-[90px] w-[100px] max-w-[110px]", // for daily columns
    periodQty: "min-w-[140px] w-[150px] max-w-[160px]", // for 'Phát sinh trong kỳ'
    cumulative: "min-w-[150px] w-[160px] max-w-[170px]",
    remaining: "min-w-[130px] w-[140px] max-w-[150px]",
    percent: "min-w-[170px] w-[180px] max-w-[190px]",
    status: "w-[110px]",
    action: "w-[100px]",
    notes: "min-w-[240px] max-w-[320px]"
  },
  
  // Shared column classes
  cols: {
    stt: "w-[64px] min-w-[64px] max-w-[64px] text-center",
    content: "min-w-[380px] max-w-[460px] text-left",
    crew: "min-w-[240px] w-[280px] max-w-[320px] text-center",
    unit: "min-w-[110px] w-[120px] max-w-[130px] text-center",
    designQty: "min-w-[170px] w-[180px] max-w-[190px] text-right",
    dayQty: "min-w-[90px] w-[100px] max-w-[110px] text-right",
    periodQty: "min-w-[140px] w-[150px] max-w-[160px] text-right",
    cumulative: "min-w-[150px] w-[160px] max-w-[170px] text-right",
    remaining: "min-w-[130px] w-[140px] max-w-[150px] text-right",
    percent: "min-w-[170px] w-[180px] max-w-[190px] text-right",
    status: "w-[110px] text-center",
    action: "w-[100px] text-center",
    notes: "min-w-[240px] max-w-[320px] text-left"
  },

  dailyCols: {
    stt: "w-[64px] min-w-[64px] max-w-[64px] text-center",
    content: "min-w-[360px] w-[380px] max-w-[420px] text-left",
    crew: "min-w-[140px] w-[150px] max-w-[160px] text-center",
    unit: "w-[80px] min-w-[80px] max-w-[90px] text-center",
    designQty: "w-[140px] min-w-[140px] max-w-[140px] text-right",
    cumulative: "w-[140px] min-w-[140px] max-w-[140px] text-right",
    dayQty: "w-[150px] min-w-[150px] max-w-[150px] text-center",
    remaining: "w-[140px] min-w-[140px] max-w-[140px] text-right",
    percent: "min-w-[120px] w-[130px] max-w-[130px] text-right",
    notes: "min-w-[220px] w-[240px] max-w-[260px] text-left",
    action: "w-[72px] min-w-[72px] max-w-[84px] text-center",
  },

  // Common header styling
  headerTh: "align-middle px-3 py-3 text-[13px] font-semibold text-slate-600 uppercase tracking-wide border-r border-slate-200 bg-slate-50 whitespace-nowrap",
  
  // Common cell styling
  cellTd: "align-middle h-14 px-3 py-3 border-r border-slate-100 text-sm font-medium bg-white text-slate-700",
  
  // Group row styling - uses ! to override cellTd's bg-white 
  groupRow: "bg-slate-50 border-slate-200 [&>td]:bg-slate-50",
  
  // Work row styling
  workRow: "bg-white hover:bg-slate-50/50 transition-colors"
};
