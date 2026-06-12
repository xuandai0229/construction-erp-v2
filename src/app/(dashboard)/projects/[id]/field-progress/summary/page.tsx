import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Filter, Table, Calendar, Info } from "lucide-react";
import { buildDateColumns, formatQuantity, groupEntriesByItemAndDate } from "@/lib/field-progress";
import { buildFieldProgressRollupTree } from "@/lib/field-progress/rollup";
import { sharedTableStyles } from "@/components/field-progress/table-styles";
import { addWorkDays, formatWorkDate, getWorkDateRange, parseWorkDate, todayWorkDate } from "@/lib/date/work-date";

function formatWorkDateShort(date: Date): string {
  const dateStr = formatWorkDate(date);
  return `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`;
}

export default async function FieldProgressSummaryPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null }
  });

  if (!project) notFound();

  const template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: id, deletedAt: null },
    include: {
      items: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" }, include: { parent: true } }
    }
  });

  if (!template) {
    redirect(`/projects/${id}/field-progress`);
  }

  // Parse filters
  const todayStr = todayWorkDate();
  const lastWeekStr = formatWorkDate(addWorkDays(parseWorkDate(todayStr), -7));

  const fromDate = typeof sp.from === 'string' ? sp.from : lastWeekStr;
  const toDate = typeof sp.to === 'string' ? sp.to : todayStr;
  const fromDateRange = getWorkDateRange(fromDate);
  const toDateRange = getWorkDateRange(toDate);
  const mode = (typeof sp.mode === 'string' ? sp.mode : 'HAS_DATA_ONLY') as 'ALL_DAYS' | 'HAS_DATA_ONLY';
  const statusFilter = typeof sp.status === 'string' ? sp.status : 'APPROVED_ONLY';

  const statusCondition: any = statusFilter === 'APPROVED_ONLY' ? ['APPROVED'] : ['APPROVED', 'DRAFT', 'SUBMITTED', 'REVISION_REQUESTED'];
  
  // Load entries in range
  const entriesInRange = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: template.id,
      deletedAt: null,
      status: { in: statusCondition },
      entryDate: {
        gte: fromDateRange.start,
        lt: toDateRange.end
      }
    },
    orderBy: { entryDate: 'asc' }
  });

  // Calculate cumulative data (before 'fromDate') for APPROVED entries
  const cumulativeBeforeData = await prisma.fieldProgressEntry.groupBy({
    by: ['itemId'],
    where: {
      templateId: template.id,
      deletedAt: null,
      status: 'APPROVED',
      entryDate: { lt: fromDateRange.start }
    },
    _sum: {
      quantity: true
    }
  });
  
  const cumulativeBeforeMap: Record<string, number> = {};
  cumulativeBeforeData.forEach(d => {
    cumulativeBeforeMap[d.itemId] = Number(d._sum.quantity || 0);
  });

  const availableDates = new Set<string>();
  entriesInRange.forEach(e => availableDates.add(formatWorkDate(new Date(e.entryDate))));
  
  const dynamicDates = buildDateColumns(fromDate, toDate, mode, availableDates);
  const groupedEntries = groupEntriesByItemAndDate(entriesInRange);
  const hasPeriodEntries = entriesInRange.length > 0;
  const includesUnapproved = statusFilter !== "APPROVED_ONLY";

  // Roll up WBS logic using the shared helper
  const { displayItems } = buildFieldProgressRollupTree({
    items: template.items,
    groupedEntries,
    cumulativeBeforeMap,
    dynamicDates,
  });

  const formattedFromDate = formatWorkDateShort(parseWorkDate(fromDate));

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 space-y-6 pb-20">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Link 
              href={`/projects/${id}/field-progress`} 
              className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            Tổng hợp khối lượng thi công
          </h1>
          <p className="text-slate-600 mt-1.5 ml-11 text-sm sm:text-base">
            Theo dõi lũy kế, phát sinh trong kỳ và tiến độ hoàn thành theo từng công việc.
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-11">
            Công trình: <span className="font-semibold text-slate-700">{project.code}</span> - {project.name}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:ml-11">
          <Link 
            href={`/projects/${id}/field-progress`}
            className="px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition-all"
          >
            <Table className="w-4 h-4" /> Bảng khối lượng gốc
          </Link>
          <Link 
            href={`/projects/${id}/field-progress/daily`}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Calendar className="w-4 h-4" /> Nhập khối lượng theo ngày
          </Link>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <form className="flex flex-wrap items-end gap-3 sm:gap-4" method="GET">
          <div className="flex-1 min-w-[140px] max-w-[180px]">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Từ ngày</label>
            <input 
              type="date" 
              name="from" 
              defaultValue={fromDate} 
              className="w-full h-10 px-3 border border-slate-300 bg-white text-slate-900 rounded-lg text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none" 
            />
          </div>
          <div className="flex-1 min-w-[140px] max-w-[180px]">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Đến ngày</label>
            <input 
              type="date" 
              name="to" 
              defaultValue={toDate} 
              className="w-full h-10 px-3 border border-slate-300 bg-white text-slate-900 rounded-lg text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none" 
            />
          </div>
          <div className="flex-1 min-w-[180px] max-w-[240px]">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Hiển thị ngày</label>
            <select 
              name="mode" 
              defaultValue={mode} 
              className="w-full h-10 px-3 border border-slate-300 bg-white text-slate-900 rounded-lg text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            >
              <option value="HAS_DATA_ONLY">Chỉ ngày có phát sinh</option>
              <option value="ALL_DAYS">Tất cả ngày trong kỳ</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px] max-w-[260px]">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Phạm vi số liệu</label>
            <select 
              name="status" 
              defaultValue={statusFilter} 
              className="w-full h-10 px-3 border border-slate-300 bg-white text-slate-900 rounded-lg text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            >
              <option value="APPROVED_ONLY">Chỉ số đã duyệt</option>
              <option value="ALL">Bao gồm tất cả số đã nhập</option>
            </select>
          </div>
          <button 
            type="submit" 
            className="h-10 px-5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap"
          >
            <Filter className="w-4 h-4" /> Lọc
          </button>
        </form>
      </div>

      {!hasPeriodEntries && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Không có khối lượng phát sinh trong khoảng ngày này</h2>
          <p className="mt-2 text-sm text-slate-500">
            Thay đổi khoảng lọc hoặc chọn chế độ bao gồm lưu tạm/chờ giám sát nếu cần kiểm tra dữ liệu chưa xác nhận.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm text-left whitespace-nowrap min-w-[1200px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 sticky top-0 z-10">
              <tr>
                <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.stt} sticky left-0 z-20 shadow-[1px_0_0_0_#e2e8f0] text-center`} rowSpan={2}>STT</th>
                <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.content} sticky left-[56px] z-20 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`} rowSpan={2}>Hạng mục / Công việc</th>
                <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.crew} text-center`} rowSpan={2}>Mũi thi công</th>
                <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.unit} text-center`} rowSpan={2}>Đơn vị</th>
                <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.designQty} text-center`} rowSpan={2}>Tổng KL thiết kế</th>
                <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.cumulative} text-center`} rowSpan={2}>
                  <div className="flex h-full min-h-[56px] flex-col items-center justify-center gap-1 text-center">
                    <div className="flex items-center justify-center gap-1 cursor-help" title="Tổng khối lượng đã lưu trước ngày bắt đầu kỳ lọc. Nếu chưa có dữ liệu trước kỳ thì hiển thị 0.">
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                      <span>Lũy kế trước kỳ</span>
                    </div>
                    <span className="text-[11px] font-medium normal-case text-slate-400">
                      Trước {formattedFromDate}
                    </span>
                  </div>
                </th>
                <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.periodQty} text-center text-blue-700 bg-blue-50/80`} rowSpan={2}>Phát sinh trong kỳ</th>
                <th className={`${sharedTableStyles.headerTh} text-center bg-blue-50/80 text-blue-700`} colSpan={2}>Lũy kế đến nay</th>
                {dynamicDates.length > 0 && (
                  <th className={`${sharedTableStyles.headerTh} text-center`} colSpan={dynamicDates.length}>
                    Phát sinh theo ngày
                  </th>
                )}
              </tr>
              <tr>
                <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.cumulative} border-t text-center bg-blue-50/80 text-blue-700`}>Lũy kế</th>
                <th className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.percent} border-t text-center bg-blue-50/80 text-blue-700`}>%</th>
                {dynamicDates.map(d => (
                  <th key={formatWorkDate(d)} className={`${sharedTableStyles.headerTh} ${sharedTableStyles.cols.dayQty} border-t text-center`}>
                    {formatWorkDateShort(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayItems.map((item: any, idx: number) => {
                const isGroup = item.itemType === "GROUP";
                const designQty = item.designQty;
                const cumulativeBefore = item.cumulativeBefore;
                const periodTotal = item.periodTotal;
                const cumulative = item.cumulative;
                
                let percent = null;
                let isOver = false;
                const projectedTotal = cumulativeBefore + periodTotal;
                if (designQty > 0) {
                  percent = ((cumulative / designQty) * 100).toFixed(2);
                  if (Number(percent) > 100 || (includesUnapproved && projectedTotal > designQty)) isOver = true;
                }

                const trClass = isGroup 
                   ? sharedTableStyles.groupRow 
                   : (isOver ? 'bg-red-50/50 hover:bg-red-50/80' : sharedTableStyles.workRow);

                return (
                  <tr key={item.id} className={trClass}>
                    <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.stt} sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0] ${isGroup ? 'bg-slate-50' : isOver ? 'bg-red-50/50' : 'bg-white'}`}>{idx + 1}</td>
                    <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.content} sticky left-[56px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isGroup ? 'bg-slate-50' : isOver ? 'bg-red-50/50' : 'bg-white'}`} style={{ paddingLeft: `${item.displayLevel * 24 + 12}px` }}>
                      {isGroup ? (
                        <div className="font-bold text-slate-900">{item.categoryName}</div>
                      ) : (
                        <>
                          <div className="text-[10px] text-slate-400 mb-0.5 truncate uppercase tracking-wider">{item.parent?.categoryName || "-"}</div>
                          <div className="font-semibold text-slate-800 truncate" title={item.workContent || ""}>{item.workContent}</div>
                        </>
                      )}
                    </td>
                    <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.crew} truncate`} title={item.constructionCrew || "Chưa có"}>
                      {item.constructionCrew ? <span className="text-slate-800 font-medium">{item.constructionCrew}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.unit}`}>
                      {isGroup ? <span className="text-slate-400">—</span> : item.unit ? <span className="text-slate-800 font-medium">{item.unit}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.designQty} font-semibold ${isGroup ? 'text-slate-800' : 'text-slate-700'}`}>
                      {designQty > 0 ? formatQuantity(designQty) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.cumulative} ${isGroup ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                      {cumulativeBefore > 0 ? formatQuantity(cumulativeBefore) : "0"}
                    </td>
                    <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.periodQty} font-bold text-blue-700 bg-blue-50/30`}>
                      {periodTotal > 0 ? formatQuantity(periodTotal) : "-"}
                    </td>
                    <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.cumulative} font-bold text-blue-800 bg-blue-50/30`}>
                      {formatQuantity(cumulative)}
                    </td>
                    <td className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.percent} bg-blue-50/30 relative`}>
                      {designQty === 0 ? (
                        <span className="text-[10px] text-amber-600 font-medium">Chưa TK</span>
                      ) : (
                        <div className={`font-bold flex items-center justify-end gap-1 ${isOver ? 'text-red-600' : 'text-slate-700'}`}>
                          {isOver && <span className="bg-red-100 text-red-700 text-[10px] px-1 rounded border border-red-200">Vượt</span>}
                          {percent}%
                        </div>
                      )}
                    </td>
                    {dynamicDates.map(d => {
                      const dateStr = formatWorkDate(d);
                      const dayTotal = item.dayTotals[dateStr] || 0;
                      return (
                        <td key={dateStr} className={`${sharedTableStyles.cellTd} ${sharedTableStyles.cols.dayQty} ${dayTotal > 0 ? 'text-blue-700 font-bold bg-blue-50/40' : 'text-slate-300'}`}>
                          {dayTotal > 0 ? formatQuantity(dayTotal) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {displayItems.length === 0 && (
                <tr>
                  <td colSpan={20} className="px-3 py-12 text-center text-slate-500 bg-slate-50">Chưa có hạng mục công việc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
          {displayItems.map((item: any) => {
            const isGroup = item.itemType === "GROUP";
            const designQty = item.designQty;
            const cumulative = item.cumulative;
            
            let percent = null;
            let isOver = false;
            if (designQty > 0) {
              percent = ((cumulative / designQty) * 100).toFixed(2);
              if (Number(percent) > 100) isOver = true;
            }

            if (isGroup) {
              return (
                <div key={item.id} className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 leading-tight mb-2 pl-2 border-l-4 border-blue-500">{item.categoryName}</h3>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Tổng TK</div>
                      <div className="font-semibold text-slate-700">{designQty > 0 ? formatQuantity(designQty) : "-"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Lũy kế</div>
                      <div className="font-bold text-blue-700">{formatQuantity(cumulative)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 uppercase">% TH</div>
                      <div className="font-bold text-slate-800">{designQty > 0 ? `${percent}%` : "-"}</div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.id} className="p-4 bg-white ml-2 border-l border-slate-100">
                <div className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wider">{item.parent?.categoryName || "-"}</div>
                <h3 className="font-bold text-slate-800 leading-tight mb-2">{item.workContent}</h3>
                
                <div className="grid grid-cols-3 gap-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="text-center border-r border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase">Tổng TK</div>
                    <div className="font-semibold text-slate-700">{designQty > 0 ? formatQuantity(designQty) : "-"} {item.unit}</div>
                  </div>
                  <div className="text-center border-r border-slate-200 bg-blue-50/50">
                    <div className="text-[10px] text-slate-500 uppercase">Lũy kế</div>
                    <div className="font-bold text-blue-700">{formatQuantity(cumulative)}</div>
                  </div>
                  <div className="text-center bg-blue-50/50 relative">
                    <div className="text-[10px] text-slate-500 uppercase">% TH</div>
                    <div className={`font-bold ${isOver ? 'text-red-600' : 'text-slate-800'}`}>
                      {designQty > 0 ? `${percent}%` : "-"}
                    </div>
                    {isOver && <div className="absolute -top-1 -right-1 bg-red-100 text-red-700 text-[8px] font-bold px-1 rounded border border-red-200">VƯỢT</div>}
                  </div>
                </div>

                <div className="overflow-x-auto pb-2 flex gap-2 snap-x">
                  {dynamicDates.map(d => {
                    const dateStr = formatWorkDate(d);
                    const dayTotal = item.dayTotals[dateStr] || 0;
                    
                    if (dayTotal === 0 && mode === 'HAS_DATA_ONLY') return null;

                    return (
                      <div key={dateStr} className={`snap-start shrink-0 min-w-[70px] rounded p-1.5 border ${dayTotal > 0 ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="text-[9px] text-center text-slate-500">{formatWorkDateShort(d)}</div>
                        <div className={`text-sm text-center ${dayTotal > 0 ? 'font-bold text-green-700' : 'text-slate-400'}`}>
                          {dayTotal > 0 ? formatQuantity(dayTotal) : "-"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {displayItems.length === 0 && (
            <div className="p-8 text-center text-slate-500">Chưa có hạng mục công việc.</div>
          )}
        </div>

      </div>
    </div>
  );
}
