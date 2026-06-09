import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Table } from "lucide-react";
import { DailyEntryTable } from "@/components/field-progress/daily-entry-table";

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
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
            <Link
              href={`/projects/${id}/field-progress`}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            Nhập khối lượng theo ngày
          </h1>
          <p className="mt-1 ml-10 text-slate-500">
            Công trình: {project.code} - {project.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${id}/field-progress`}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Table className="w-4 h-4" /> Bảng khối lượng gốc
          </Link>
        </div>
      </div>

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
