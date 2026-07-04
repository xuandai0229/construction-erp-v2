import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Table, BarChart2, Package } from "lucide-react";
import { DailyEntryTable } from "@/components/field-progress/daily-entry-table";
import { DailyStatusCalendar } from "@/components/field-progress/daily-status-calendar";
import { addWorkDays, formatWorkDate, getWorkDateRange, parseWorkDate, todayWorkDate } from "@/lib/date/work-date";
import { requireProjectAccessOrRedirect } from "@/lib/rbac";
import { ProjectModuleTabs } from "@/components/project/project-module-tabs";

export default async function FieldProgressDailyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const session = await requireProjectAccessOrRedirect(id);

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
            Khối lượng theo ngày
          </h1>
          <p className="text-slate-600 mt-1.5 ml-8 sm:ml-11 text-sm sm:text-base hidden sm:block">
            Xem và điều chỉnh khối lượng thi công thực tế (dữ liệu được đồng bộ từ Báo cáo hiện trường).
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-1.5 ml-8 sm:ml-11 line-clamp-1">
            Công trình: <span className="font-semibold text-slate-700">{project.code}</span> - {project.name}
          </p>
        </div>

        {/* Action Buttons */}
        <ProjectModuleTabs projectId={id} />
      </div>

      <DailyStatusCalendar 
        currentDate={selectedDateStr}
        entriesStatus={entriesStatusMap}
        projectId={id}
      />

      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
        <div className="bg-blue-100 p-2 rounded-lg text-blue-700 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <h4 className="font-bold text-blue-900 text-sm">Nguồn dữ liệu ưu tiên từ Báo cáo hiện trường</h4>
          <p className="text-blue-700 text-sm mt-0.5">
            Các dòng khối lượng đã duyệt từ báo cáo hiện trường sẽ bị khóa để đảm bảo tính nhất quán. Chỉ người có quyền phê duyệt mới được điều chỉnh thủ công.
          </p>
        </div>
      </div>

      <DailyEntryTable
        projectId={id}
        templateId={template.id}
        dateStr={selectedDateStr}
        projectLabel={`${project.code} - ${project.name}`}
        initialItems={JSON.parse(JSON.stringify(workItemsData))}
        parentGroups={JSON.parse(JSON.stringify(parentGroups))}
        userRole={session.role}
      />
    </div>
  );
}
