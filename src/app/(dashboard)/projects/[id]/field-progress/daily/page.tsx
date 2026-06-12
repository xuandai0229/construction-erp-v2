import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Table, BarChart2 } from "lucide-react";
import { DailyEntryTable } from "@/components/field-progress/daily-entry-table";
import { DailyStatusCalendar } from "@/components/field-progress/daily-status-calendar";
import { addWorkDays, formatWorkDate, getWorkDateRange, parseWorkDate, todayWorkDate } from "@/lib/date/work-date";

export default async function FieldProgressDailyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
  });

  if (!project) notFound();

  // Load template and items
  const template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: id, deletedAt: null },
  }) || await prisma.fieldProgressTemplate.create({
    data: {
      projectId: id,
      name: "Bảng khối lượng hiện trường",
      createdById: session.id,
    }
  });

  const items = await prisma.fieldProgressItem.findMany({
    where: { templateId: template.id, deletedAt: null, itemType: "WORK" },
    orderBy: { sortOrder: "asc" },
    include: { parent: true },
  });

  const selectedDateStr = sp.date || todayWorkDate();
  const selectedDate = parseWorkDate(selectedDateStr);
  const selectedDateRange = getWorkDateRange(selectedDateStr);

  // Query entry status for calendar (7 days before and 7 days after)
  const startCalendarDate = addWorkDays(selectedDate, -7);
  const endCalendarDate = addWorkDays(selectedDate, 8);

  const calendarEntries = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: template.id,
      deletedAt: null,
      entryDate: {
        gte: startCalendarDate,
        lt: endCalendarDate
      }
    },
    select: {
      entryDate: true,
      status: true
    }
  });

  // Build status map for calendar
  const entriesStatusMap: Record<string, "APPROVED" | "SUBMITTED" | "DRAFT" | "EMPTY"> = {};
  calendarEntries.forEach(entry => {
    const dateStr = formatWorkDate(new Date(entry.entryDate));
    
    // Priority for operators: DRAFT means there is still editable saved work on that day.
    // If all editable entries were submitted, SUBMITTED becomes the visible status.
    const currentStatus = entriesStatusMap[dateStr];
    if (!currentStatus || 
        entry.status === "DRAFT" ||
        (entry.status === "SUBMITTED" && currentStatus !== "DRAFT") ||
        (entry.status === "APPROVED" && !["DRAFT", "SUBMITTED"].includes(currentStatus))) {
      entriesStatusMap[dateStr] = entry.status as "APPROVED" | "SUBMITTED" | "DRAFT";
    }
  });

  const allEntries = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: template.id,
      deletedAt: null,
      entryDate: { lt: selectedDateRange.end },
    },
  });

  const materials = await prisma.fieldMaterialRequest.findMany({
    where: { templateId: template.id, requestDate: selectedDateRange.start, deletedAt: null },
    include: { items: true },
  });

  const cumulativeBeforeMap: Record<string, number> = {};
  const todayEntriesMap: Record<string, any> = {};

  for (const entry of allEntries) {
    const entryDateStr = formatWorkDate(new Date(entry.entryDate));
    if (entryDateStr === selectedDateStr) {
      todayEntriesMap[entry.itemId] = entry;
    } else if (entry.status === "APPROVED") {
      cumulativeBeforeMap[entry.itemId] = (cumulativeBeforeMap[entry.itemId] || 0) + Number(entry.quantity);
    }
  }

  const workItemsData = items.map((item) => {
    const materialList = materials.filter((material) => material.itemId === item.id);

    return {
      id: item.id,
      code: item.code,
      name: item.workContent,
      parentName: item.parent?.categoryName,
      constructionCrew: item.constructionCrew,
      designQuantity: item.designQuantity ? Number(item.designQuantity) : null,
      unit: item.unit,
      cumulativeBefore: cumulativeBeforeMap[item.id] || 0,
      todayEntry: todayEntriesMap[item.id] || null,
      materials: materialList,
    };
  });

  const parentGroups = await prisma.fieldProgressItem.findMany({
    where: { templateId: template.id, deletedAt: null, itemType: "GROUP" },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 space-y-6 pb-20 min-w-0 overflow-x-hidden">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
            <Link
              href={`/projects/${id}/field-progress`}
              className="p-1.5 sm:p-2 -ml-1.5 sm:-ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            Nhập khối lượng theo ngày
          </h1>
          <p className="text-slate-600 mt-1.5 ml-8 sm:ml-11 text-sm sm:text-base hidden sm:block">
            Chọn ngày báo cáo và nhập khối lượng thực hiện cho từng công việc.
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-1.5 ml-8 sm:ml-11 line-clamp-1">
            Công trình: <span className="font-semibold text-slate-700">{project.code}</span> - {project.name}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row items-center gap-2 ml-8 sm:ml-11">
          <Link
            href={`/projects/${id}/field-progress`}
            className="flex-1 sm:flex-none h-10 px-2 sm:px-4 bg-white border border-slate-300 text-slate-700 rounded-lg text-[13px] sm:text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
          >
            <Table className="w-4 h-4 shrink-0" /> 
            <span className="sm:hidden">Bảng gốc</span>
            <span className="hidden sm:inline">Bảng khối lượng gốc</span>
          </Link>
          <Link
            href={`/projects/${id}/field-progress/summary`}
            className="flex-1 sm:flex-none h-10 px-2 sm:px-4 bg-white border border-slate-300 text-slate-700 rounded-lg text-[13px] sm:text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
          >
            <BarChart2 className="w-4 h-4 shrink-0" /> 
            <span className="sm:hidden">Tổng hợp</span>
            <span className="hidden sm:inline">Tổng hợp khối lượng</span>
          </Link>
        </div>
      </div>

      <DailyStatusCalendar 
        currentDate={selectedDateStr}
        entriesStatus={entriesStatusMap}
        projectId={id}
      />

      <DailyEntryTable
        projectId={id}
        templateId={template.id}
        dateStr={selectedDateStr}
        projectLabel={`${project.code} - ${project.name}`}
        initialItems={JSON.parse(JSON.stringify(workItemsData))}
        parentGroups={JSON.parse(JSON.stringify(parentGroups))}
      />
    </div>
  );
}
