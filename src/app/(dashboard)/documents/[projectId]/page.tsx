import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DocumentManager } from "@/components/documents/document-manager";
import { requireProjectAccessOrRedirect } from "@/lib/rbac";

export default async function ProjectDocumentsPage({
  params
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params;
  await requireProjectAccessOrRedirect(projectId);

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
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Tài liệu: {project.name}</h1>
        <p className="text-sm text-slate-500">Mã: {project.code}</p>
      </div>
      <DocumentManager 
        projectId={projectId} 
        folders={rawFolders} 
        documents={documents}
        canEdit={true}
      />
    </div>
  );
}
