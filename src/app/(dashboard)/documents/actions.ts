"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { canAccessProject, canManageProjects } from "@/lib/rbac";
import { buildDocumentDisplayName } from "@/lib/document-file-utils";
import { revalidatePath } from "next/cache";

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
  if (!(await canAccessProject(session, projectId)) || !canManageProjects(session)) return { error: "Không có quyền xóa" };

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
  if (!(await canAccessProject(session, projectId)) || !canManageProjects(session)) return { error: "Không có quyền xóa tệp" };

  try {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, projectId, deletedAt: null },
    });
    if (!existing) return { error: "Tệp không tồn tại" };

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
    });
    if (!existing) return { error: "Tệp không tồn tại" };

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
