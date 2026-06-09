import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Table } from "lucide-react";
import { DailyEntryTable } from "@/components/field-progress/daily-entry-table";

export default async function FieldProgressDailyPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
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

  const selectedDateStr = sp.date || new Date().toISOString().split('T')[0];
  const selectedDate = new Date(selectedDateStr);

  // Load all entries UP TO selectedDate (to calculate cumulative before)
  const allEntries = await prisma.fieldProgressEntry.findMany({
    where: { 
      templateId: template.id, 
      deletedAt: null,
      entryDate: { lte: selectedDate }
    }
  });

  // Load material requests for the selected date
  const materials = await prisma.fieldMaterialRequest.findMany({
    where: { templateId: template.id, requestDate: selectedDate, deletedAt: null },
    include: { items: true }
  });

  // Calculate cumulative BEFORE selected date (Only APPROVED entries are counted officially, but we can include DRAFT for user's own view if needed)
  // According to rule: "Lũy kế trước tự tính từ APPROVED trước ngày này."
  
  const cumulativeBeforeMap: Record<string, number> = {};
  const todayEntriesMap: Record<string, any> = {};

  for (const entry of allEntries) {
    const dStr = new Date(entry.entryDate).toISOString().split('T')[0];
    if (dStr === selectedDateStr) {
      todayEntriesMap[entry.itemId] = entry;
    } else {
      // It's before the selected date
      if (entry.status === "APPROVED") {
        if (!cumulativeBeforeMap[entry.itemId]) cumulativeBeforeMap[entry.itemId] = 0;
        cumulativeBeforeMap[entry.itemId] += Number(entry.quantity);
      }
    }
  }

  // Format data for the client component
  const workItemsData = template.items.map(item => {
    const cumBefore = cumulativeBeforeMap[item.id] || 0;
    const todayData = todayEntriesMap[item.id] || null;
    const materialList = materials.filter(m => m.itemId === item.id);
    
    return {
      id: item.id,
      code: item.code,
      name: item.workContent,
      parentName: item.parent?.categoryName,
      constructionCrew: item.constructionCrew,
      designQuantity: item.designQuantity ? Number(item.designQuantity) : null,
      unit: item.unit,
      cumulativeBefore: cumBefore,
      todayEntry: todayData,
      materials: materialList
    };
  });

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Link href={`/projects/${id}/field-progress`} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            Nhập khối lượng theo ngày
          </h1>
          <p className="text-slate-500 mt-1 ml-10">Công trình: {project.code} - {project.name}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link 
            href={`/projects/${id}/field-progress`}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
          >
            <Table className="w-4 h-4" /> Bảng khối lượng
          </Link>
        </div>
      </div>

      <DailyEntryTable 
        projectId={id} 
        templateId={template.id} 
        dateStr={selectedDateStr}
        initialItems={JSON.parse(JSON.stringify(workItemsData))}
      />
    </div>
  );
}
