import { notFound } from "next/navigation";
import { getOrCreateTemplate } from "./actions";
import { MasterTable } from "@/components/field-progress/master-table";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Calendar, BarChart2, Package, TrendingUp, CheckCircle2, BarChart3, Info } from "lucide-react";
import { buildTreeItems, flattenTreeForTable, calculateParentRollup, formatQuantity } from "@/lib/field-progress";
import { requireProjectAccessOrRedirect } from "@/lib/rbac";
import { ProjectModuleTabs } from "@/components/project/project-module-tabs";

export default async function FieldProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireProjectAccessOrRedirect(id);

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null }
  });

  if (!project) notFound();

  // Load template and items
  const template = await getOrCreateTemplate(id);
  
  // Load cumulative data (APPROVED only for official count)
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

  // Calculate overview stats
  const workItems = itemsWithRollup.filter(item => item.itemType === 'WORK');
  const groupItems = itemsWithRollup.filter(item => item.itemType === 'GROUP');
  
  let totalDesignQty = 0;
  let totalApprovedQty = 0;
  let draftQty = 0;
  let submittedQty = 0;
  
  workItems.forEach(item => {
    if (item.designQuantity) {
      totalDesignQty += Number(item.designQuantity);
    }
    if (item.rollupCumulative) {
      totalApprovedQty += Number(item.rollupCumulative);
    }
  });

  entries.forEach((entry) => {
    if (entry.status === "DRAFT") draftQty += Number(entry.quantity || 0);
    if (entry.status === "SUBMITTED") submittedQty += Number(entry.quantity || 0);
  });

  const overallProgress = totalDesignQty > 0 ? ((totalApprovedQty / totalDesignQty) * 100).toFixed(2) : "0";
  const pendingQty = draftQty + submittedQty;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
            <Link 
              href={`/projects/${id}`} 
              className="p-1 sm:p-2 -ml-1 sm:-ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200 active:scale-95 rounded-lg transition-all duration-150 ease-out"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            Hạng mục & Công việc
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1.5 ml-7 sm:ml-11">
            <span className="font-semibold text-slate-700">{project.code}</span> - {project.name}
          </p>
          <p className="text-sm text-slate-600 mt-1 ml-7 sm:ml-11">
            Quản lý danh mục hạng mục, công việc, đơn vị và khối lượng thiết kế của công trình.
          </p>
        </div>
        
        {/* Action Buttons */}
        <ProjectModuleTabs projectId={id} />
      </div>

      {/* Overview Stats Bar */}
      <div className="flex sm:inline-flex flex-wrap items-center gap-0 rounded-lg border border-slate-200 bg-white shadow-sm py-1 px-1">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <Package className="h-4 w-4 text-blue-500 hidden xs:block" />
          <span className="text-sm font-bold text-slate-900">{groupItems.length}</span>
          <span className="text-xs font-medium text-slate-500">Hạng mục</span>
        </div>

        <div className="h-3 w-px bg-slate-200" />

        <div className="flex items-center gap-1.5 px-2 py-1">
          <BarChart3 className="h-4 w-4 text-blue-500 hidden xs:block" />
          <span className="text-sm font-bold text-slate-900">{workItems.length}</span>
          <span className="text-xs font-medium text-slate-500">Công việc</span>
        </div>

        <div className="h-3 w-px bg-slate-200" />

        <div className="flex items-center gap-1.5 px-2 py-1">
          <TrendingUp className="h-4 w-4 text-blue-500 hidden xs:block" />
          <span className="text-sm font-bold text-slate-900">{formatQuantity(totalDesignQty)}</span>
          <span className="text-xs font-medium text-slate-500">Tổng khối lượng thiết kế</span>
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
