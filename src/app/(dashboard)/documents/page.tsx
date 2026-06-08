import prisma from "@/lib/prisma";
import Link from "next/link";
import { FolderOpen, Building2, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DocumentsOverviewPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const q = params.q || "";

  const whereCondition: any = {
    deletedAt: null,
  };

  if (q) {
    whereCondition.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }

  // Nếu không phải ADMIN/DIRECTOR thì chỉ lấy project mà user được assign
  if (session.role !== "ADMIN" && session.role !== "DIRECTOR") {
    whereCondition.members = {
      some: { userId: session.id }
    };
  }

  const projects = await prisma.project.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { documentFolders: { where: { deletedAt: null } } }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Tài liệu</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-4 bg-slate-50">
          <form className="flex gap-4 max-w-md" method="GET" action="/documents">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                name="q"
                defaultValue={q}
                placeholder="Tìm công trình..." 
                className="w-full pl-9 pr-4 py-2 text-sm text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-slate-300 bg-white hover:bg-slate-100 text-slate-900 h-10 px-4 py-2">
              Lọc
            </button>
            {q && (
              <Link href="/documents" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 text-slate-700 h-10 px-4 py-2">
                Xóa
              </Link>
            )}
          </form>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50">
            {projects.map(project => (
              <Link href={`/documents/${project.id}`} key={project.id} className="block group">
                <div className="rounded-lg border border-slate-200 bg-white p-5 hover:border-blue-400 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <FolderOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 line-clamp-1">{project.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{project.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <FolderOpen className="h-3.5 w-3.5" />
                      {project._count.documentFolders} thư mục
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8">
            <EmptyState 
              title="Không tìm thấy công trình" 
              description={q ? "Không có công trình nào khớp với từ khóa tìm kiếm." : "Bạn chưa được phân quyền vào dự án nào hoặc hệ thống chưa có dự án."} 
              icon={<Building2 className="h-12 w-12 text-slate-300" />}
            />
          </div>
        )}
      </div>
    </div>
  );
}
