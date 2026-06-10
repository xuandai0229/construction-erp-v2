import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Table, BarChart2 } from "lucide-react";
import { DailyEntryTable } from "@/components/field-progress/daily-entry-table";
import { DailyStatusCalendar } from "@/components/field-progress/daily-status-calendar";

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

  const selectedDateStr = sp.date || new Date().toISOString().split("T")[0];
  const selectedDate = new Date(selectedDateStr);

  // Query entry status for calendar (7 days before and 7 days after)
  const startCalendarDate = new Date(selectedDate);
  startCalendarDate.setDate(startCalendarDate.getDate() - 7);
  const endCalendarDate = new Date(selectedDate);
  endCalendarDate.setDate(endCalendarDate.getDate() + 7);

  const calendarEntries = await prisma.fieldProgressEntry.findMany({
    where: {
      templateId: template.id,
      deletedAt: null,
      entryDate: {
        gte: startCalendarDate,
        lte: endCalendarDate
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
    const dateStr = new Date(entry.entryDate).toISOString().split("T")[0];
    
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
      entryDate: { lte: selectedDate },
    },
  });

  const materials = await prisma.fieldMaterialRequest.findMany({
    where: { templateId: template.id, requestDate: selectedDate, deletedAt: null },
    include: { items: true },
  });

  const cumulativeBeforeMap: Record<string, number> = {};
  const todayEntriesMap: Record<string, any> = {};

  for (const entry of allEntries) {
    const entryDateStr = new Date(entry.entryDate).toISOString().split("T")[0];
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
            Nhập khối lượng theo ngày
          </h1>
          <p className="text-slate-600 mt-1.5 ml-11 text-sm sm:text-base">
            Chọn ngày báo cáo, nhập khối lượng phát sinh cho từng công việc và gửi giám sát kiểm tra.
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
            href={`/projects/${id}/field-progress/summary`}
            className="px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition-all"
          >
            <BarChart2 className="w-4 h-4" /> Xem tổng hợp
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
