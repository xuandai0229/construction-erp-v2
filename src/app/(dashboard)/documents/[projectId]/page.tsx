export const dynamic = "force-dynamic";
export const revalidate = 0;
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DocumentWorkspace } from "@/components/documents/document-workspace";
import { requireProjectAccessOrRedirect } from "@/lib/rbac";
import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { getEnforcedSystemSettings } from "@/lib/settings/system-settings";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";

const FOLDER_PAGE_SIZE = 100;
const FILE_PAGE_SIZE = 200;
type RawDocumentWithUploader = Prisma.DocumentGetPayload<{
  include: { uploadedBy: { select: { name: true } } };
}>;

export default async function ProjectDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ folder?: string }>;
}) {
  const { projectId } = await params;
  const urlParams = await searchParams;
  const isTrashView = urlParams.trash === "true";
  const rawFolderId = isTrashView ? urlParams.trashFolder : urlParams.folder;
  const selectedFolderId =
    typeof rawFolderId === "string" && rawFolderId.trim()
      ? rawFolderId
      : null;
  const session = await requireProjectAccessOrRedirect(projectId);

  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null }
  });

  if (!project) notFound();

  const ancestorFolderIds: string[] = [];
  let cursorFolderId = selectedFolderId;
  while (cursorFolderId) {
    const folder = await prisma.documentFolder.findFirst({
      where: { id: cursorFolderId, projectId, deletedAt: isTrashView ? { not: null } : null },
      select: { id: true, parentId: true },
    });
    if (!folder) break;
    ancestorFolderIds.push(folder.id);
    cursorFolderId = folder.parentId;
  }
  const effectiveSelectedFolderId =
    selectedFolderId && ancestorFolderIds.includes(selectedFolderId)
      ? selectedFolderId
      : null;

  // Load first page of folders + total count for "has more"
  const folderWhere: Prisma.DocumentFolderWhereInput = {
    projectId,
    deletedAt: null,
    OR: [
      { parentId: null },
      ...(ancestorFolderIds.length > 0
        ? [{ id: { in: ancestorFolderIds } }]
        : []),
      ...(effectiveSelectedFolderId
        ? [{ parentId: effectiveSelectedFolderId }]
        : []),
    ],
  };
  const [rawFolders, totalFolderCount] = await Promise.all([
    prisma.documentFolder.findMany({
      where: folderWhere,
      orderBy: { name: "asc" },
      take: FOLDER_PAGE_SIZE,
      include: {
        _count: {
          select: { documents: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } }
        }
      }
    }),
    prisma.documentFolder.count({ where: folderWhere }),
  ]);

  // Deleted folders: first page + count
  const deletedFolderWhere: Prisma.DocumentFolderWhereInput = {
    projectId,
    deletedAt: { not: null },
    OR: [
      { parentId: null },
      ...(ancestorFolderIds.length > 0
        ? [{ id: { in: ancestorFolderIds } }]
        : []),
      ...(effectiveSelectedFolderId
        ? [{ parentId: effectiveSelectedFolderId }]
        : []),
    ],
  };
  const [rawDeletedFolders, totalDeletedFolderCount] = await Promise.all([
    prisma.documentFolder.findMany({
      where: deletedFolderWhere,
      orderBy: { deletedAt: "desc" },
      take: FOLDER_PAGE_SIZE,
      include: {
        _count: {
          select: { documents: true, children: true }
        }
      }
    }),
    prisma.documentFolder.count({ where: deletedFolderWhere }),
  ]);

  // Load first page of documents + total count
  const docWhere: Prisma.DocumentWhereInput | null = effectiveSelectedFolderId
    ? { projectId, folderId: effectiveSelectedFolderId, deletedAt: null }
    : null;
  const [rawDocuments, totalDocCount] = docWhere
    ? await Promise.all([
        prisma.document.findMany({
          where: docWhere,
          orderBy: { createdAt: "desc" },
          take: FILE_PAGE_SIZE,
          include: { uploadedBy: { select: { name: true } } },
        }) as Promise<RawDocumentWithUploader[]>,
        prisma.document.count({ where: docWhere }),
      ])
    : [[] as RawDocumentWithUploader[], 0];

  // Deleted documents: first page + count
  const deletedDocWhere: Prisma.DocumentWhereInput | null = effectiveSelectedFolderId
    ? { projectId, folderId: effectiveSelectedFolderId, deletedAt: { not: null } }
    : null;
  const [rawDeletedDocuments, totalDeletedDocCount] = deletedDocWhere
    ? await Promise.all([
        prisma.document.findMany({
          where: deletedDocWhere,
          orderBy: { deletedAt: "desc" },
          take: FILE_PAGE_SIZE,
          include: { uploadedBy: { select: { name: true } } },
        }) as Promise<RawDocumentWithUploader[]>,
        prisma.document.count({ where: deletedDocWhere }),
      ])
    : [[] as RawDocumentWithUploader[], 0];

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
          pagination={{
            folderPageSize: FOLDER_PAGE_SIZE,
            filePageSize: FILE_PAGE_SIZE,
            totalFolders: totalFolderCount,
            totalFiles: totalDocCount,
            totalDeletedFolders: totalDeletedFolderCount,
            totalDeletedFiles: totalDeletedDocCount,
          }}
        />
      </Suspense>
    </div>
  );
}
