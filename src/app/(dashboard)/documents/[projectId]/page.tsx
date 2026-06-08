import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { DocumentManager } from "@/components/documents/document-manager";

export default async function ProjectDocumentsPage({
  params
}: {
  params: Promise<{ projectId: string }>
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null }
  });

  if (!project) notFound();

  // Role check
  if (session.role !== "ADMIN" && session.role !== "DIRECTOR") {
    const isMember = await prisma.projectMember.findFirst({
      where: { projectId, userId: session.id }
    });
    if (!isMember) redirect("/documents");
  }

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
