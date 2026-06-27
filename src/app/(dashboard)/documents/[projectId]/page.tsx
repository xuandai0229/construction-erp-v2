import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DocumentWorkspace } from "@/components/documents/document-workspace";
import { canManageProjects, requireProjectAccessOrRedirect } from "@/lib/rbac";
import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { getEnforcedSystemSettings } from "@/lib/settings/system-settings";
import { Suspense } from "react";

export default async function ProjectDocumentsPage({
  params
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params;
  const session = await requireProjectAccessOrRedirect(projectId);

  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null }
  });

  if (!project) notFound();

  const rawFolders = await prisma.documentFolder.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { documents: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } }
      }
    }
  });

  const documents = await prisma.document.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: {
        select: { name: true }
      }
    }
  });

  return (
    <div className="app-page flex min-h-[calc(100dvh-7rem)] flex-col lg:h-[calc(100dvh-7rem)]">
      <div className="mb-4">
        <nav className="flex items-center text-sm font-medium text-slate-500 mb-2">
          <Link href="/documents" className="flex items-center hover:text-blue-600 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Tài liệu
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900">{project.name}</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-heading flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-blue-500" />
              Tài liệu: {project.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Mã: {project.code}</p>
          </div>
        </div>
      </div>
      <Suspense fallback={null}>
        <DocumentWorkspace
          projectId={projectId} 
          folders={rawFolders} 
          documents={documents}
          sessionUser={{ id: session.id, role: session.role as any }}
          systemSettings={await getEnforcedSystemSettings()}
        />
      </Suspense>
    </div>
  );
}
