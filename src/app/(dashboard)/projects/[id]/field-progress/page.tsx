import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getOrCreateTemplate } from "./actions";
import { MasterTable } from "@/components/field-progress/master-table";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Calendar, BarChart2, Package, TrendingUp, CheckCircle2, BarChart3 } from "lucide-react";
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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 space-y-6 pb-20">
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

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Package className="h-8 w-8 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{groupItems.length}</div>
          <div className="text-xs font-medium text-slate-600 mt-1 uppercase tracking-wide">Tổng hạng mục chính</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{workItems.length}</div>
          <div className="text-xs font-medium text-slate-600 mt-1 uppercase tracking-wide">Tổng công việc</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatQuantity(totalDesignQty)}</div>
          <div className="text-xs font-medium text-slate-600 mt-1 uppercase tracking-wide">Tổng KL thiết kế</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{overallProgress}%</div>
          <div className="text-xs font-medium text-slate-600 mt-1 uppercase tracking-wide">% hoàn thành chính thức</div>
        </div>
      </div>

      {/* Info notice about cumulative calculation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-blue-900 mb-1">
              Lưu ý về lũy kế tại màn này
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              Cột <span className="font-semibold">Lũy kế</span> và <span className="font-semibold">% TH</span> chỉ tính các khối lượng <span className="font-bold text-blue-900">đã được giám sát xác nhận</span> (status = APPROVED). 
              Dữ liệu đang ở trạng thái "Lưu tạm" (DRAFT) hoặc "Chờ giám sát" (SUBMITTED) chưa được cộng vào lũy kế chính thức.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-amber-900">Khối lượng chờ xác nhận</h2>
            <p className="mt-1 text-sm leading-relaxed text-amber-800">
              Dữ liệu DRAFT và SUBMITTED đã lưu trong bảng FieldProgressEntry nhưng chưa cộng vào cột Lũy kế chính thức. Khi có luồng duyệt chuyển sang APPROVED, khối lượng mới được tính vào lũy kế.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm sm:min-w-[360px]">
            <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lưu tạm</div>
              <div className="mt-1 font-bold text-amber-800">{formatQuantity(draftQty)}</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-white px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chờ giám sát</div>
              <div className="mt-1 font-bold text-blue-700">{formatQuantity(submittedQty)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng chờ</div>
              <div className="mt-1 font-bold text-slate-900">{formatQuantity(pendingQty)}</div>
            </div>
          </div>
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
