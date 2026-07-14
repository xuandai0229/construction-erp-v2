export const sharedTableStyles = {
  // Shared column width values
  colWidths: {
    stt: "w-[48px] min-w-[48px] max-w-[48px]",
    content: "min-w-[280px] w-auto max-w-[400px]",
    crew: "min-w-[120px] w-[140px] max-w-[160px]",
    unit: "w-[72px] min-w-[72px] max-w-[80px]",
    designQty: "min-w-[100px] w-[120px] max-w-[130px]",
    dayQty: "w-[100px] min-w-[100px]", 
    periodQty: "w-[100px] min-w-[100px]",
    cumulative: "min-w-[100px] w-[110px] max-w-[130px]",
    remaining: "min-w-[100px] w-[110px] max-w-[130px]",
    percent: "min-w-[100px] w-[110px] max-w-[130px]",
    status: "w-[90px]",
    action: "w-[64px] min-w-[64px] max-w-[80px]",
    notes: "min-w-[200px] max-w-[300px]"
  },
  
  // Shared column classes
  cols: {
    stt: "w-[48px] min-w-[48px] max-w-[48px] text-center",
    content: "min-w-[280px] w-auto max-w-[400px] text-left",
    crew: "min-w-[120px] w-[140px] max-w-[160px] text-center",
    unit: "w-[72px] min-w-[72px] max-w-[80px] text-center",
    designQty: "min-w-[100px] w-[120px] max-w-[130px] text-right font-mono",
    dayQty: "w-[100px] min-w-[100px] text-right font-mono",
    periodQty: "w-[100px] min-w-[100px] text-right font-mono",
    cumulative: "min-w-[100px] w-[110px] max-w-[130px] text-right font-mono",
    remaining: "min-w-[100px] w-[110px] max-w-[130px] text-right font-mono",
    percent: "min-w-[100px] w-[110px] max-w-[130px] text-right font-mono",
    status: "w-[90px] text-center",
    action: "w-[64px] min-w-[64px] max-w-[80px] text-center",
    notes: "min-w-[200px] max-w-[300px] text-left"
  },

  dailyCols: {
    stt: "w-[48px] min-w-[48px] max-w-[48px] text-center",
    content: "min-w-[260px] w-auto max-w-[340px] text-left",
    crew: "min-w-[100px] w-[120px] max-w-[140px] text-center truncate",
    unit: "w-[64px] min-w-[64px] max-w-[72px] text-center",
    designQty: "w-[100px] min-w-[100px] max-w-[110px] text-right font-mono",
    cumulative: "w-[100px] min-w-[100px] max-w-[110px] text-right font-mono",
    dayQty: "w-[120px] min-w-[120px] max-w-[130px] text-center font-mono",
    remaining: "w-[100px] min-w-[100px] max-w-[110px] text-right font-mono",
    percent: "min-w-[80px] w-[90px] max-w-[100px] text-right font-mono",
    notes: "min-w-[200px] w-[240px] max-w-[300px] text-left",
    action: "w-[56px] min-w-[56px] max-w-[64px] text-center",
  },

  // Common header styling
  headerTh: "align-middle px-3 py-2.5 text-[12px] font-semibold text-slate-500 bg-slate-50 whitespace-normal leading-snug border-b border-slate-200",
  
  // Common cell styling
  cellTd: "align-middle min-h-[48px] px-2 py-2 border-b border-slate-100 text-[13px] font-medium bg-white text-slate-700 leading-snug group-hover/row:bg-slate-50/50",
  
  // Group row styling
  groupRow: "bg-slate-50/70 border-slate-200 [&>td]:bg-slate-50/70 [&>td]:border-b-slate-200 [&>td]:border-t-slate-200 [&>td]:border-t",
  
  // Work row styling
  workRow: "bg-white group/row transition-colors"
};
