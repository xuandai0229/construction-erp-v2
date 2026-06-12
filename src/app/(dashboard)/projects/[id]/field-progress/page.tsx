import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getOrCreateTemplate } from "./actions";
import { MasterTable } from "@/components/field-progress/master-table";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Calendar, BarChart2, Package, TrendingUp, CheckCircle2, BarChart3, Info } from "lucide-react";
import { buildTreeItems, flattenTreeForTable, calculateParentRollup, formatQuantity } from "@/lib/field-progress";

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
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Link 
              href={`/projects/${id}`} 
              className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            Bảng khối lượng gốc
          </h1>
          <p className="text-slate-600 mt-1.5 ml-11 text-sm sm:text-base">
            Thiết lập hạng mục, công việc, mũi thi công và khối lượng thiết kế của công trình.
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 ml-11">
            Công trình: <span className="font-semibold text-slate-700">{project.code}</span> - {project.name}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:ml-11">
          <Link 
            href={`/projects/${id}/field-progress/daily`}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Calendar className="w-4 h-4" /> Nhập khối lượng theo ngày
          </Link>
          <Link 
            href={`/projects/${id}/field-progress/summary`}
            className="px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition-all"
          >
            <BarChart2 className="w-4 h-4" /> Xem tổng hợp
          </Link>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div className="inline-flex flex-wrap items-center gap-0 rounded-xl border border-slate-200 bg-white shadow-sm py-1.5 px-1.5">
        <div className="flex items-center gap-2 px-3 py-1">
          <Package className="h-4 w-4 text-blue-500" />
          <span className="text-base font-bold text-slate-900">{groupItems.length}</span>
          <span className="text-sm font-medium text-slate-500">Hạng mục chính</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-2 px-3 py-1">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          <span className="text-base font-bold text-slate-900">{workItems.length}</span>
          <span className="text-sm font-medium text-slate-500">Công việc</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-2 px-3 py-1">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <span className="text-base font-bold text-slate-900">{formatQuantity(totalDesignQty)}</span>
          <span className="text-sm font-medium text-slate-500">Tổng KL thiết kế</span>
        </div>
      </div>

      {/* Info notice about cumulative calculation */}
      <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 w-fit">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span><strong className="font-semibold text-slate-700">Lưu ý:</strong> Cột Lũy kế chỉ cộng các khối lượng đã được duyệt (APPROVED). Dữ liệu nháp/chờ chưa được tính.</span>
      </div>

      <MasterTable 
        projectId={id} 
        templateId={template.id} 
        initialItems={JSON.parse(JSON.stringify(itemsWithRollup))} 
      />
    </div>
  );
}
