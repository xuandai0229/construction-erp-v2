import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Filter, Table, Calendar } from "lucide-react";
import { buildDateColumns, formatQuantity, groupEntriesByItemAndDate } from "@/lib/field-progress";
import { format } from "date-fns";

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
      items: { where: { deletedAt: null, itemType: "WORK" }, orderBy: { sortOrder: "asc" }, include: { parent: true } }
    }
  });

  if (!template) {
    redirect(`/projects/${id}/field-progress`);
  }

  // Parse filters
  const todayStr = new Date().toISOString().split('T')[0];
  const lastWeekStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const fromDate = typeof sp.from === 'string' ? sp.from : lastWeekStr;
  const toDate = typeof sp.to === 'string' ? sp.to : todayStr;
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
        gte: new Date(fromDate),
        lte: new Date(toDate)
      }
    },
    orderBy: { entryDate: 'asc' }
  });

  // Calculate cumulative data (up to 'toDate') for APPROVED entries
  const cumulativeData = await prisma.fieldProgressEntry.groupBy({
    by: ['itemId'],
    where: {
      templateId: template.id,
      deletedAt: null,
      status: 'APPROVED',
      entryDate: { lte: new Date(toDate) }
    },
    _sum: {
      quantity: true
    }
  });
  
  const cumulativeMap: Record<string, number> = {};
  cumulativeData.forEach(d => {
    cumulativeMap[d.itemId] = Number(d._sum.quantity || 0);
  });

  // Calculate cumulative data (before 'fromDate') for APPROVED entries
  const cumulativeBeforeData = await prisma.fieldProgressEntry.groupBy({
    by: ['itemId'],
    where: {
      templateId: template.id,
      deletedAt: null,
      status: 'APPROVED',
      entryDate: { lt: new Date(fromDate) }
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
  entriesInRange.forEach(e => availableDates.add(new Date(e.entryDate).toISOString().split('T')[0]));
  
  const dynamicDates = buildDateColumns(fromDate, toDate, mode, availableDates);
  const groupedEntries = groupEntriesByItemAndDate(entriesInRange);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Link href={`/projects/${id}/field-progress`} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            Tổng hợp khối lượng thi công
          </h1>
          <p className="text-slate-500 mt-1 ml-10">Công trình: {project.code} - {project.name}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link 
            href={`/projects/${id}/field-progress`}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
          >
            <Table className="w-4 h-4" /> Bảng khối lượng gốc
          </Link>
          <Link 
            href={`/projects/${id}/field-progress/daily`}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" /> Nhập khối lượng theo ngày
          </Link>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <form className="flex flex-wrap items-end gap-4" method="GET">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Từ ngày</label>
            <input type="date" name="from" defaultValue={fromDate} className="px-3 py-2 border border-slate-300 bg-white rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Đến ngày</label>
            <input type="date" name="to" defaultValue={toDate} className="px-3 py-2 border border-slate-300 bg-white rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Chế độ hiển thị ngày</label>
            <select name="mode" defaultValue={mode} className="px-3 py-2 border border-slate-300 bg-white rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="HAS_DATA_ONLY">Chỉ ngày có dữ liệu</option>
              <option value="ALL_DAYS">Tất cả các ngày</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Trạng thái dữ liệu</label>
            <select name="status" defaultValue={statusFilter} className="px-3 py-2 border border-slate-300 bg-white rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="APPROVED_ONLY">Chỉ tính khối lượng đã xác nhận</option>
              <option value="ALL">Bao gồm dữ liệu lưu tạm / chờ kiểm tra</option>
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Lọc
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm text-left whitespace-nowrap min-w-max">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 border-r bg-slate-50 sticky left-0 z-20" rowSpan={2}>STT</th>
                <th className="px-3 py-3 border-r bg-slate-50 sticky left-[40px] z-20" rowSpan={2}>Hạng mục / Công việc</th>
                <th className="px-3 py-3 border-r" rowSpan={2}>Mũi thi công</th>
                <th className="px-3 py-3 border-r text-center" rowSpan={2}>Đơn vị</th>
                <th className="px-3 py-3 border-r text-right" rowSpan={2}>Tổng KL thiết kế</th>
                <th className="px-3 py-3 border-r text-right" rowSpan={2}>Lũy kế kỳ trước</th>
                <th className="px-3 py-3 border-r text-right text-indigo-900 bg-indigo-50/80" rowSpan={2}>Phát sinh trong kỳ</th>
                <th className="px-3 py-3 border-r text-center bg-blue-50/80 text-blue-900" colSpan={2}>Lũy kế đến nay</th>
                {dynamicDates.length > 0 && (
                  <th className="px-3 py-2 border-r text-center bg-green-50/80 text-green-900" colSpan={dynamicDates.length}>
                    Phát sinh theo ngày
                  </th>
                )}
              </tr>
              <tr>
                <th className="px-3 py-2 border-r border-t text-right bg-blue-50/80 font-semibold text-blue-900">Lũy kế</th>
                <th className="px-3 py-2 border-r border-t text-right bg-blue-50/80 font-semibold text-blue-900">%</th>
                {dynamicDates.map(d => (
                  <th key={d.toISOString()} className="px-2 py-2 border-r border-t text-center bg-green-50/80 font-semibold text-green-900 min-w-[80px]">
                    {format(d, 'dd/MM')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {template.items.map((item, idx) => {
                const cumulative = cumulativeMap[item.id] || 0;
                const cumulativeBefore = cumulativeBeforeMap[item.id] || 0;
                const designQty = item.designQuantity ? Number(item.designQuantity) : null;
                
                let periodTotal = 0;
                Object.values(groupedEntries[item.id] || {}).forEach(arr => {
                  periodTotal += arr.reduce((sum, e) => sum + Number(e.quantity), 0);
                });

                let percent = null;
                let isOver = false;
                if (designQty && designQty > 0) {
                  percent = ((cumulative / designQty) * 100).toFixed(2);
                  if (Number(percent) > 100) isOver = true;
                }

                return (
                  <tr key={item.id} className={`transition-colors ${isOver ? 'bg-red-50/50 hover:bg-red-50/80' : 'hover:bg-slate-50'}`}>
                    <td className={`px-3 py-3 border-r sticky left-0 z-10 text-center text-slate-500 font-medium ${isOver ? 'bg-red-50/50' : 'bg-white'}`}>{idx + 1}</td>
                    <td className={`px-3 py-3 border-r sticky left-[40px] z-10 max-w-[250px] ${isOver ? 'bg-red-50/50' : 'bg-white'}`}>
                      <div className="text-[10px] text-slate-400 mb-0.5 truncate uppercase tracking-wider">{item.parent?.categoryName || "-"}</div>
                      <div className="font-semibold text-slate-800 truncate" title={item.workContent || ""}>{item.workContent}</div>
                    </td>
                    <td className="px-3 py-3 border-r text-slate-600 truncate max-w-[120px]" title={item.constructionCrew || ""}>{item.constructionCrew || "-"}</td>
                    <td className="px-3 py-3 border-r text-center text-slate-500 font-medium">{item.unit || "-"}</td>
                    <td className="px-3 py-3 border-r text-right text-slate-700 font-semibold">
                      {designQty ? formatQuantity(designQty) : "-"}
                    </td>
                    
                    <td className="px-3 py-3 border-r text-right text-slate-600">
                      {formatQuantity(cumulativeBefore)}
                    </td>
                    
                    <td className="px-3 py-3 border-r text-right text-indigo-700 font-bold bg-indigo-50/30">
                      {periodTotal > 0 ? formatQuantity(periodTotal) : "-"}
                    </td>

                    <td className="px-3 py-3 border-r text-right text-blue-800 font-bold bg-blue-50/30">
                      {formatQuantity(cumulative)}
                    </td>
                    <td className="px-3 py-3 border-r text-right bg-blue-50/30 relative">
                      {!designQty ? (
                        <span className="text-[10px] text-amber-600 font-medium">Chưa TK</span>
                      ) : (
                        <div className={`font-bold flex items-center justify-end gap-1 ${isOver ? 'text-red-600' : 'text-slate-700'}`}>
                          {isOver && <span className="bg-red-100 text-red-700 text-[10px] px-1 rounded border border-red-200">VƯỢT</span>}
                          {percent}%
                        </div>
                      )}
                    </td>
                    
                    {dynamicDates.map(d => {
                      const dateStr = d.toISOString().split('T')[0];
                      const dayEntries = groupedEntries[item.id]?.[dateStr] || [];
                      const dayTotal = dayEntries.reduce((sum, e) => sum + Number(e.quantity), 0);
                      
                      return (
                        <td key={dateStr} className={`px-2 py-3 border-r text-right ${dayTotal > 0 ? 'text-green-700 font-bold bg-green-50/50' : 'text-slate-300'}`}>
                          {dayTotal > 0 ? formatQuantity(dayTotal) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {template.items.length === 0 && (
                <tr>
                  <td colSpan={20} className="px-3 py-12 text-center text-slate-500 bg-slate-50">Chưa có hạng mục công việc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
          {template.items.map((item) => {
            const cumulative = cumulativeMap[item.id] || 0;
            const designQty = item.designQuantity ? Number(item.designQuantity) : null;
            
            let percent = null;
            let isOver = false;
            if (designQty && designQty > 0) {
              percent = ((cumulative / designQty) * 100).toFixed(2);
              if (Number(percent) > 100) isOver = true;
            }

            return (
              <div key={item.id} className="p-4 bg-white">
                <div className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wider">{item.parent?.categoryName || "-"}</div>
                <h3 className="font-bold text-slate-800 leading-tight mb-2">{item.workContent}</h3>
                
                <div className="grid grid-cols-3 gap-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="text-center border-r border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase">Tổng TK</div>
                    <div className="font-semibold text-slate-700">{designQty ? formatQuantity(designQty) : "-"} {item.unit}</div>
                  </div>
                  <div className="text-center border-r border-slate-200 bg-blue-50/50">
                    <div className="text-[10px] text-slate-500 uppercase">Lũy kế</div>
                    <div className="font-bold text-blue-700">{formatQuantity(cumulative)}</div>
                  </div>
                  <div className="text-center bg-blue-50/50 relative">
                    <div className="text-[10px] text-slate-500 uppercase">% TH</div>
                    <div className={`font-bold ${isOver ? 'text-red-600' : 'text-slate-800'}`}>
                      {designQty ? `${percent}%` : "-"}
                    </div>
                    {isOver && <div className="absolute -top-1 -right-1 bg-red-100 text-red-700 text-[8px] font-bold px-1 rounded border border-red-200">VƯỢT</div>}
                  </div>
                </div>

                <div className="overflow-x-auto pb-2 flex gap-2 snap-x">
                  {dynamicDates.map(d => {
                    const dateStr = d.toISOString().split('T')[0];
                    const dayEntries = groupedEntries[item.id]?.[dateStr] || [];
                    const dayTotal = dayEntries.reduce((sum, e) => sum + Number(e.quantity), 0);
                    
                    if (dayTotal === 0 && mode === 'HAS_DATA_ONLY') return null;

                    return (
                      <div key={dateStr} className={`snap-start shrink-0 min-w-[70px] rounded p-1.5 border ${dayTotal > 0 ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="text-[9px] text-center text-slate-500">{format(d, 'dd/MM')}</div>
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
          {template.items.length === 0 && (
            <div className="p-8 text-center text-slate-500">Chưa có hạng mục công việc.</div>
          )}
        </div>

        {statusFilter !== 'APPROVED_ONLY' ? (
          <div className="bg-yellow-50 p-3 text-sm text-yellow-800 border-t border-yellow-200">
            <span className="font-semibold">Lưu ý:</span> Bảng đang bao gồm dữ liệu chưa xác nhận ở cột Phát sinh. "Lũy kế" luôn chỉ tính các bản đã xác nhận.
          </div>
        ) : (
          <div className="bg-blue-50 p-3 text-sm text-blue-800 border-t border-blue-200">
            <span className="font-semibold">Lưu ý:</span> Lũy kế và số phát sinh hiển thị trên bảng này chỉ tính khối lượng đã xác nhận.
          </div>
        )}
      </div>
    </div>
  );
}
