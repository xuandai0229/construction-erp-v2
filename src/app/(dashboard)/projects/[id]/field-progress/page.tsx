import { notFound } from "next/navigation";
import { getOrCreateTemplate } from "./actions";
import { MasterTable } from "@/components/field-progress/master-table";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Calendar, BarChart2, Package, TrendingUp, CheckCircle2, BarChart3, Info } from "lucide-react";
import { buildTreeItems, flattenTreeForTable, calculateParentRollup, formatQuantity } from "@/lib/field-progress";
import { requireProjectAccessOrRedirect } from "@/lib/rbac";

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
            Bảng khối lượng gốc
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1.5 ml-7 sm:ml-11 line-clamp-1">
            <span className="font-semibold text-slate-700">{project.code}</span> - {project.name}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-row items-center gap-2 ml-7 sm:ml-11">
          <Link 
            href={`/projects/${id}/field-progress/daily`}
            className="flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-4 bg-blue-600 text-white rounded-md text-xs sm:text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 active:scale-95 flex items-center justify-center gap-1.5 shadow-sm transition-all duration-150 ease-out"
          >
            <Calendar className="w-4 h-4" /> 
            <span className="md:hidden">Nhập khối lượng</span>
            <span className="hidden md:inline">Nhập khối lượng theo ngày</span>
          </Link>
          <Link 
            href={`/projects/${id}/field-progress/summary`}
            className="flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-4 bg-white border border-slate-300 text-slate-700 rounded-md text-xs sm:text-sm font-semibold hover:bg-slate-50 active:bg-slate-100 active:scale-95 flex items-center justify-center gap-1.5 transition-all duration-150 ease-out"
          >
            <BarChart2 className="w-4 h-4" /> 
            <span className="md:hidden">Tổng hợp</span>
            <span className="hidden md:inline">Tổng hợp khối lượng</span>
          </Link>
          <Link 
            href={`/projects/${id}/material-requests`}
            className="flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-4 bg-white border border-slate-300 text-slate-700 rounded-md text-xs sm:text-sm font-semibold hover:bg-slate-50 active:bg-slate-100 active:scale-95 flex items-center justify-center gap-1.5 transition-all duration-150 ease-out"
          >
            <Package className="w-4 h-4" /> 
            <span className="md:hidden">Vật tư</span>
            <span className="hidden md:inline">Đề xuất vật tư</span>
          </Link>
        </div>
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
