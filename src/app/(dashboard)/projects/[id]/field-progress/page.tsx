import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getOrCreateTemplate } from "./actions";
import { MasterTable } from "@/components/field-progress/master-table";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Calendar, FileText, BarChart2 } from "lucide-react";
import { buildTreeItems, flattenTreeForTable, calculateParentRollup } from "@/lib/field-progress";

export default async function FieldProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null }
  });

  if (!project) notFound();

  // Load template and items
  const template = await getOrCreateTemplate(id);
  
  // Load cumulative data 
  const entries = await prisma.fieldProgressEntry.findMany({
    where: { templateId: template.id, deletedAt: null },
    select: { itemId: true, quantity: true, status: true, entryDate: true }
  });

  const entriesMap: Record<string, any[]> = {};
  for (const entry of entries) {
    if (!entriesMap[entry.itemId]) entriesMap[entry.itemId] = [];
    entriesMap[entry.itemId].push(entry);
  }

  // Build tree and calculate rollup
  const tree = buildTreeItems(template.items);
  const flatTree = flattenTreeForTable(tree);
  const itemsWithRollup = calculateParentRollup(flatTree, entriesMap);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Link href={`/projects/${id}`} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            Bảng khối lượng gốc
          </h1>
          <p className="text-slate-500 mt-1 ml-10">Công trình: {project.code} - {project.name}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link 
            href={`/projects/${id}/field-progress/daily`}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" /> Nhập khối lượng theo ngày
          </Link>
          <Link 
            href={`/projects/${id}/field-progress/summary`}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
          >
            <BarChart2 className="w-4 h-4" /> Xem tổng hợp
          </Link>
        </div>
      </div>

      <MasterTable 
        projectId={id} 
        templateId={template.id} 
        initialItems={JSON.parse(JSON.stringify(itemsWithRollup))} 
      />
    </div>
  );
}
