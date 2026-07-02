export const dynamic = "force-dynamic";
export const revalidate = 0;
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

  const rawDeletedFolders = await prisma.documentFolder.findMany({
    where: { projectId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: {
      _count: {
        select: { documents: true, children: true }
      }
    }
  });

  const rawDocuments = await prisma.document.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { name: true } }
    }
  });

  const rawDeletedDocuments = await prisma.document.findMany({
    where: { projectId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: {
      uploadedBy: { select: { name: true } }
    }
  });

  const folders = rawFolders.map((f) => ({
    id: f.id,
    projectId: f.projectId,
    parentId: f.parentId,
    name: f.name,
    _count: f._count,
  }));

  const documents = rawDocuments.map((d) => ({
    id: d.id,
    projectId: d.projectId,
    folderId: d.folderId,
    originalName: d.originalName,
    displayName: d.displayName,
    documentType: d.documentType,
    status: d.status,
    metadata: d.metadata,
    fileHash: d.fileHash,
    storedName: d.storedName,
    mimeType: d.mimeType,
    extension: d.extension,
    size: d.size,
    version: d.version,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    uploadedById: d.uploadedById,
    uploadedBy: d.uploadedBy,
    rejectedReason: d.rejectedReason,
  }));

  const deletedFolders = rawDeletedFolders.map((f) => ({
    id: f.id,
    projectId: f.projectId,
    parentId: f.parentId,
    name: f.name,
    _count: f._count,
    deletedAt: f.deletedAt?.toISOString(),
  }));

  const deletedDocuments = rawDeletedDocuments.map((d) => ({
    id: d.id,
    projectId: d.projectId,
    folderId: d.folderId,
    originalName: d.originalName,
    displayName: d.displayName,
    documentType: d.documentType,
    status: d.status,
    metadata: d.metadata,
    fileHash: d.fileHash,
    storedName: d.storedName,
    mimeType: d.mimeType,
    extension: d.extension,
    size: d.size,
    version: d.version,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    deletedAt: d.deletedAt?.toISOString(),
    uploadedById: d.uploadedById,
    uploadedBy: d.uploadedBy,
    rejectedReason: d.rejectedReason,
  }));

  const rawSettings: any = await getEnforcedSystemSettings();
  const systemSettings = {
    ...rawSettings,
    contractValueThreshold: rawSettings.contractValueThreshold ? Number(rawSettings.contractValueThreshold) : 0,
    createdAt: rawSettings.createdAt ? rawSettings.createdAt.toISOString() : undefined,
    updatedAt: rawSettings.updatedAt ? rawSettings.updatedAt.toISOString() : undefined,
  };

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
          projectName={project.name}
          folders={folders} 
          documents={documents}
          deletedFolders={deletedFolders}
          deletedDocuments={deletedDocuments}
          sessionUser={{ id: session.id, role: session.role as any }}
          systemSettings={systemSettings}
        />
      </Suspense>
    </div>
  );
}
