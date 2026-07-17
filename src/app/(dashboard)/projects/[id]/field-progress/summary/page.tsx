import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Filter, Table, Calendar, Package } from "lucide-react";
import { buildDateColumns, formatQuantity, groupEntriesByItemAndDate } from "@/lib/field-progress";
import { buildFieldProgressRollupTree } from "@/lib/field-progress/rollup";
import { addWorkDays, formatWorkDate, getWorkDateRange, parseWorkDate, todayWorkDate } from "@/lib/date/work-date";
import { SummaryMobileView } from "@/components/field-progress/summary-mobile-view";
import { SummaryDesktopView } from "@/components/field-progress/summary-desktop-view";
import { requireProjectAccessOrRedirect } from "@/lib/rbac";
import { ProjectModuleTabs } from "@/components/project/project-module-tabs";

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
  
  const session = await requireProjectAccessOrRedirect(id);

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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 space-y-6 pb-20 min-w-0 overflow-x-hidden">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
            <Link 
              href={`/projects/${id}/field-progress`} 
              className="p-1.5 sm:p-2 -ml-1.5 sm:-ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Quay lại trang khối lượng thi công"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            Tổng hợp khối lượng
          </h1>
          <p className="text-slate-600 mt-1.5 ml-8 sm:ml-11 text-sm sm:text-base hidden sm:block">
            Theo dõi khối lượng thiết kế, khối lượng đã thực hiện, lũy kế và tỷ lệ hoàn thành.
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-1.5 ml-8 sm:ml-11 line-clamp-1">
            Công trình: <span className="font-semibold text-slate-700">{project.code}</span> - {project.name}
          </p>
        </div>
        
        {/* Action Buttons */}
        <ProjectModuleTabs projectId={id} />
      </div>

      <div className="bg-white border border-slate-200 rounded-[14px] p-2.5 shadow-sm">
        <form className="flex items-end gap-3 overflow-x-auto pb-1 md:overflow-visible md:pb-0" method="GET">
          <div className="flex min-w-max flex-1 gap-3">
            <div className="min-w-[150px] flex-1">
              <label htmlFor="filter-from" className="block text-[11px] font-bold text-slate-700 mb-1">Từ ngày</label>
              <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" 
                id="filter-from"
                type="date" 
                name="from" 
                defaultValue={fromDate} 
                className="w-full h-9 px-2 border border-slate-300 bg-white text-slate-900 rounded-[8px] text-[13px] font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none" 
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <label htmlFor="filter-to" className="block text-[11px] font-bold text-slate-700 mb-1">Đến ngày</label>
              <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" 
                id="filter-to"
                type="date" 
                name="to" 
                defaultValue={toDate} 
                className="w-full h-9 px-2 border border-slate-300 bg-white text-slate-900 rounded-[8px] text-[13px] font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none" 
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <label htmlFor="filter-mode" className="block text-[11px] font-bold text-slate-700 mb-1">Hiển thị</label>
              <select 
                id="filter-mode"
                name="mode" 
                defaultValue={mode} 
                className="w-full h-9 px-2 border border-slate-300 bg-white text-slate-900 rounded-[8px] text-[13px] font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              >
                <option value="HAS_DATA_ONLY">Chỉ có số liệu</option>
                <option value="ALL_DAYS">Tất cả</option>
              </select>
            </div>
            <div className="min-w-[150px] flex-1">
              <label htmlFor="filter-status" className="block text-[11px] font-bold text-slate-700 mb-1">Phạm vi</label>
              <select 
                id="filter-status"
                name="status" 
                defaultValue={statusFilter} 
                className="w-full h-9 px-2 border border-slate-300 bg-white text-slate-900 rounded-[8px] text-[13px] font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              >
                <option value="APPROVED_ONLY">Chỉ số duyệt</option>
                <option value="ALL">Tất cả</option>
              </select>
            </div>
          </div>
          <button 
            type="submit" 
            aria-label="Lọc dữ liệu tổng hợp"
            className="h-9 shrink-0 px-5 bg-blue-600 text-white rounded-[8px] text-[13px] font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
          >
            <Filter className="w-3.5 h-3.5" /> Lọc
          </button>
        </form>
      </div>

      {!hasPeriodEntries && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Không có khối lượng phát sinh trong khoảng ngày này</h2>
        </div>
      )}

      <SummaryDesktopView 
        displayItems={JSON.parse(JSON.stringify(displayItems))} 
        dynamicDates={dynamicDates} 
        mode={mode} 
        formattedFromDate={formattedFromDate} 
        includesUnapproved={includesUnapproved} 
      />

      <SummaryMobileView 
        displayItems={JSON.parse(JSON.stringify(displayItems))} 
        dynamicDates={dynamicDates} 
        mode={mode} 
        formattedFromDate={formattedFromDate} 
        includesUnapproved={includesUnapproved} 
      />
    </div>
  );
}
