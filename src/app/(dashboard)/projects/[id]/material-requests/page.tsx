import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Calendar, BarChart2, Package, Table } from "lucide-react";
import { MaterialRequestList } from "@/components/material-request/material-request-list";

export default async function MaterialRequestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null }
  });

  if (!project) notFound();

  // Load material requests
  const materialRequests = await prisma.materialRequest.findMany({
    where: { projectId: id, deletedAt: null },
    include: {
      items: true,
      requestedBy: {
        select: { name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Load Field Progress Items for mapping
  const template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: id, deletedAt: null },
  });

  let wbsItems: any[] = [];
  if (template) {
    wbsItems = await prisma.fieldProgressItem.findMany({
      where: { templateId: template.id, deletedAt: null },
      include: { parent: true }
    });
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 pb-20">
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
            Đề xuất vật tư
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1.5 ml-7 sm:ml-11 line-clamp-1">
            <span className="font-semibold text-slate-700">{project.code}</span> - {project.name}
          </p>
          <p className="text-slate-600 mt-1 ml-7 sm:ml-11 text-xs sm:text-sm">
            Tạo và theo dõi vật tư cần cấp cho công trình
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-row flex-wrap items-center gap-2 ml-7 sm:ml-11 mt-2">
          <Link 
            href={`/projects/${id}/field-progress`}
            className="h-9 sm:h-10 px-3 sm:px-4 bg-white border border-slate-300 text-slate-700 rounded-md text-xs sm:text-sm font-semibold hover:bg-slate-50 active:bg-slate-100 active:scale-95 flex items-center justify-center gap-1.5 transition-all duration-150 ease-out"
          >
            <Table className="w-4 h-4" /> 
            <span className="md:hidden">Bảng gốc</span>
            <span className="hidden md:inline">Bảng khối lượng gốc</span>
          </Link>
          <Link 
            href={`/projects/${id}/field-progress/daily`}
            className="h-9 sm:h-10 px-3 sm:px-4 bg-white border border-slate-300 text-slate-700 rounded-md text-xs sm:text-sm font-semibold hover:bg-slate-50 active:bg-slate-100 active:scale-95 flex items-center justify-center gap-1.5 transition-all duration-150 ease-out"
          >
            <Calendar className="w-4 h-4" /> 
            <span className="md:hidden">Theo ngày</span>
            <span className="hidden md:inline">Nhập khối lượng theo ngày</span>
          </Link>
          <Link 
            href={`/projects/${id}/field-progress/summary`}
            className="h-9 sm:h-10 px-3 sm:px-4 bg-white border border-slate-300 text-slate-700 rounded-md text-xs sm:text-sm font-semibold hover:bg-slate-50 active:bg-slate-100 active:scale-95 flex items-center justify-center gap-1.5 transition-all duration-150 ease-out"
          >
            <BarChart2 className="w-4 h-4" /> 
            <span className="md:hidden">Tổng hợp</span>
            <span className="hidden md:inline">Tổng hợp khối lượng</span>
          </Link>
          <div className="h-9 sm:h-10 px-3 sm:px-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5">
            <Package className="w-4 h-4" /> 
            <span className="md:hidden">Vật tư</span>
            <span className="hidden md:inline">Đề xuất vật tư</span>
          </div>
        </div>
      </div>

      <MaterialRequestList 
        projectId={id}
        initialRequests={JSON.parse(JSON.stringify(materialRequests))}
        wbsItems={JSON.parse(JSON.stringify(wbsItems))}
      />
    </div>
  );
}
