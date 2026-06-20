"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { canAccessProject, canManageProjects } from "@/lib/rbac";
import { buildDocumentDisplayName } from "@/lib/document-file-utils";
import { revalidatePath } from "next/cache";
import { 
  canRenameFolder, 
  canDeleteFolder, 
  canDeleteDocument, 
  canRenameDocument,
  canEditDocumentMetadata,
  canChangeDocumentStatus
} from "@/lib/documents/permissions";
import { DocumentStatus } from "@prisma/client";

export async function createFolder(projectId: string, name: string, parentId?: string) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (!(await canAccessProject(session, projectId))) return { error: "Bạn không có quyền truy cập công trình này" };

  if (parentId) {
    const parent = await prisma.documentFolder.findFirst({
      where: { id: parentId, projectId, deletedAt: null },
    });
    if (!parent) return { error: "Thư mục cha không hợp lệ" };
  }

  try {
    const folder = await prisma.documentFolder.create({
      data: {
        projectId,
        name,
        parentId: parentId || null
      }
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "CREATE_FOLDER",
      entityType: "DocumentFolder",
      entityId: folder.id,
      afterData: folder as unknown as Record<string, unknown>
    });

    revalidatePath(`/documents/${projectId}`);
    return { success: true, folder };
  } catch {
    return { error: "Lỗi hệ thống khi tạo thư mục" };
  }
}

export async function renameFolder(projectId: string, folderId: string, newName: string) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (!(await canAccessProject(session, projectId))) return { error: "Bạn không có quyền truy cập công trình này" };

  try {
    const existing = await prisma.documentFolder.findFirst({
      where: { id: folderId, projectId, deletedAt: null },
    });
    if (!existing) return { error: "Thư mục không tồn tại" };

    const sessionUser = { id: session.id, role: session.role as any };
    if (!canRenameFolder(sessionUser, { id: existing.id, name: existing.name })) {
      return { error: "Không có quyền đổi tên thư mục" };
    }

    const folder = await prisma.documentFolder.update({
      where: { id: folderId },
      data: { name: newName }
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "UPDATE_FOLDER",
      entityType: "DocumentFolder",
      entityId: folder.id,
      beforeData: existing as unknown as Record<string, unknown>,
      afterData: folder as unknown as Record<string, unknown>
    });

    revalidatePath(`/documents/${projectId}`);
    return { success: true };
  } catch {
    return { error: "Lỗi hệ thống khi đổi tên" };
  }
}

export async function deleteFolder(projectId: string, folderId: string) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (!(await canAccessProject(session, projectId))) return { error: "Không có quyền xóa" };

  try {
    const existing = await prisma.documentFolder.findFirst({ 
      where: { id: folderId, projectId, deletedAt: null },
      include: {
        _count: {
          select: { documents: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } }
        }
      }
    });
    
    if (!existing) return { error: "Thư mục không tồn tại" };
    
    const sessionUser = { id: session.id, role: session.role as any };
    if (!canDeleteFolder(sessionUser, { id: existing.id, name: existing.name })) {
      return { error: "Không có quyền xóa thư mục" };
    }

    if (existing._count.documents > 0 || existing._count.children > 0) {
      return { error: "Không thể xóa thư mục đang chứa tệp hoặc thư mục con." };
    }

    const folder = await prisma.documentFolder.update({
      where: { id: folderId },
      data: { deletedAt: new Date() }
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "SOFT_DELETE_FOLDER",
      entityType: "DocumentFolder",
      entityId: folder.id,
      beforeData: existing as unknown as Record<string, unknown>,
      afterData: folder as unknown as Record<string, unknown>
    });

    revalidatePath(`/documents/${projectId}`);
    return { success: true };
  } catch {
    return { error: "Lỗi hệ thống khi xóa thư mục" };
  }
}

export async function deleteDocument(projectId: string, documentId: string) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (!(await canAccessProject(session, projectId))) return { error: "Không có quyền xóa tệp" };

  try {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, projectId, deletedAt: null },
      include: { folder: true }
    });
    if (!existing) return { error: "Tệp không tồn tại" };

    const sessionUser = { id: session.id, role: session.role as any };
    const docContext = { id: existing.id, status: existing.status, uploadedById: existing.uploadedById };
    const folderContext = { id: existing.folder.id, name: existing.folder.name };
    if (!canDeleteDocument(sessionUser, docContext, folderContext)) {
      return { error: "Bạn không có quyền xóa tệp tin này" };
    }

    const doc = await prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() }
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "SOFT_DELETE_DOCUMENT",
      entityType: "Document",
      entityId: doc.id,
      beforeData: existing as unknown as Record<string, unknown>,
      afterData: doc as unknown as Record<string, unknown>
    });

    revalidatePath(`/documents/${projectId}`);
    return { success: true };
  } catch {
    return { error: "Lỗi hệ thống khi xóa tệp" };
  }
}

export async function renameDocument(projectId: string, documentId: string, requestedName: string) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (!(await canAccessProject(session, projectId))) {
    return { error: "Bạn không có quyền truy cập công trình này" };
  }

  try {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, projectId, deletedAt: null },
      include: { folder: true }
    });
    if (!existing) return { error: "Tệp không tồn tại" };

    const sessionUser = { id: session.id, role: session.role as any };
    const docContext = { id: existing.id, status: existing.status, uploadedById: existing.uploadedById };
    const folderContext = { id: existing.folder.id, name: existing.folder.name };
    if (!canRenameDocument(sessionUser, docContext, folderContext)) {
      return { error: "Bạn không có quyền đổi tên tệp tin này" };
    }

    const originalName = buildDocumentDisplayName(
      requestedName,
      existing.extension,
    );

    const document = await prisma.document.update({
      where: { id: documentId },
      data: { originalName },
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "RENAME_DOCUMENT",
      entityType: "Document",
      entityId: document.id,
      beforeData: existing as unknown as Record<string, unknown>,
      afterData: document as unknown as Record<string, unknown>,
    });

    revalidatePath(`/documents/${projectId}`);
    return { success: true, document };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Lỗi hệ thống khi đổi tên tệp",
    };
  }
}

export async function updateDocumentMetadata(
  projectId: string,
  documentId: string,
  updates: { displayName?: string; note?: string }
) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (!(await canAccessProject(session, projectId))) return { error: "Không có quyền truy cập" };

  try {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, projectId, deletedAt: null },
      include: { folder: true }
    });
    if (!existing) return { error: "Tệp không tồn tại" };

    const sessionUser = { id: session.id, role: session.role as any };
    const docContext = { id: existing.id, status: existing.status, uploadedById: existing.uploadedById };
    const folderContext = { id: existing.folder.id, name: existing.folder.name };
    
    if (!canEditDocumentMetadata(sessionUser, docContext, folderContext)) {
      return { error: "Không có quyền sửa thông tin hồ sơ" };
    }

    const newMetadata = existing.metadata ? { ...(existing.metadata as object) } : {};
    if (updates.note !== undefined) {
      (newMetadata as any).note = updates.note;
    }

    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        displayName: updates.displayName?.trim() || existing.displayName,
        metadata: newMetadata,
      }
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "UPDATE_DOCUMENT_METADATA",
      entityType: "Document",
      entityId: document.id,
      beforeData: existing as unknown as Record<string, unknown>,
      afterData: document as unknown as Record<string, unknown>
    });

    revalidatePath(`/documents/${projectId}`);
    return { success: true };
  } catch (err) {
    return { error: "Lỗi hệ thống khi cập nhật thông tin" };
  }
}

export async function changeDocumentStatus(
  projectId: string,
  documentId: string,
  newStatus: DocumentStatus,
  rejectedReason?: string
) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (!(await canAccessProject(session, projectId))) return { error: "Không có quyền truy cập" };

  try {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, projectId, deletedAt: null },
    });
    if (!existing) return { error: "Tệp không tồn tại" };

    const sessionUser = { id: session.id, role: session.role as any };
    const docContext = { id: existing.id, status: existing.status, uploadedById: existing.uploadedById };
    
    if (!canChangeDocumentStatus(sessionUser, docContext)) {
      return { error: "Bạn không có quyền chuyển trạng thái hồ sơ này" };
    }

    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: newStatus,
        reviewedById: newStatus === "APPROVED" || newStatus === "REJECTED" ? session.id : existing.reviewedById,
        reviewedAt: newStatus === "APPROVED" || newStatus === "REJECTED" ? new Date() : existing.reviewedAt,
        rejectedReason: newStatus === "REJECTED" ? rejectedReason : null,
      }
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "CHANGE_DOCUMENT_STATUS",
      entityType: "Document",
      entityId: document.id,
      beforeData: existing as unknown as Record<string, unknown>,
      afterData: document as unknown as Record<string, unknown>
    });

    revalidatePath(`/documents/${projectId}`);
    return { success: true };
  } catch (err) {
    return { error: "Lỗi hệ thống khi chuyển trạng thái" };
  }
}
