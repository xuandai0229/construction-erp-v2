import fs from 'fs';

let content = fs.readFileSync('src/app/(dashboard)/documents/actions.ts', 'utf-8');

// Replace deleteFolder
content = content.replace(
  /export async function deleteFolder[\s\S]*?export async function deleteDocument/m,
  `export async function deleteFolder(projectId: string, folderId: string) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (!(await canAccessProject(session, projectId))) return { error: "Không có quyền xóa" };

  try {
    const existing = await prisma.documentFolder.findFirst({ 
      where: { id: folderId, projectId, deletedAt: null }
    });
    
    if (!existing) return { error: "Thư mục không tồn tại" };
    
    const sessionUser = { id: session.id, role: session.role as any };
    if (!canDeleteFolder(sessionUser, { id: existing.id, name: existing.name })) {
      return { error: "Không có quyền xóa thư mục" };
    }

    const allFolders = await prisma.documentFolder.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true, parentId: true }
    });

    const folderIdsToDelete = new Set<string>([folderId]);
    let added = true;
    while(added) {
      added = false;
      for (const f of allFolders) {
        if (f.parentId && folderIdsToDelete.has(f.parentId) && !folderIdsToDelete.has(f.id)) {
          folderIdsToDelete.add(f.id);
          added = true;
        }
      }
    }

    const targetFolderIds = Array.from(folderIdsToDelete);

    await prisma.documentFolder.updateMany({
      where: { id: { in: targetFolderIds } },
      data: { deletedAt: new Date() }
    });

    await prisma.document.updateMany({
      where: { folderId: { in: targetFolderIds }, deletedAt: null },
      data: { deletedAt: new Date() }
    });

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "SOFT_DELETE_FOLDER_RECURSIVE",
      entityType: "DocumentFolder",
      entityId: folderId,
      beforeData: existing as unknown as Record<string, unknown>,
      afterData: { deletedAt: new Date(), targetFolderIds } as unknown as Record<string, unknown>
    });

    return { success: true };
  } catch (error: any) {
    return { error: "Lỗi hệ thống khi xóa thư mục: " + error.message };
  }
}

export async function deleteDocument`
);

// Replace restoreFolder
content = content.replace(
  /export async function restoreFolder[\s\S]*?export async function restoreDocument/m,
  `export async function restoreFolder(projectId: string, folderId: string) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (!(await canAccessProject(session, projectId))) return { error: "Không có quyền khôi phục" };

  try {
    const existing = await prisma.documentFolder.findFirst({
      where: { id: folderId, projectId, deletedAt: { not: null } }
    });
    if (!existing) return { error: "Thư mục không nằm trong thùng rác" };

    if (existing.parentId) {
      const parentFolder = await prisma.documentFolder.findUnique({ where: { id: existing.parentId }});
      if (parentFolder?.deletedAt) {
        return { error: "Cần khôi phục thư mục cha trước." };
      }
    }

    const allDeletedFolders = await prisma.documentFolder.findMany({
      where: { projectId, deletedAt: { not: null } },
      select: { id: true, parentId: true }
    });

    const folderIdsToRestore = new Set<string>([folderId]);
    let added = true;
    while(added) {
      added = false;
      for (const f of allDeletedFolders) {
        if (f.parentId && folderIdsToRestore.has(f.parentId) && !folderIdsToRestore.has(f.id)) {
          folderIdsToRestore.add(f.id);
          added = true;
        }
      }
    }

    const targetFolderIds = Array.from(folderIdsToRestore);

    await prisma.documentFolder.updateMany({
      where: { id: { in: targetFolderIds } },
      data: { deletedAt: null }
    });

    await prisma.document.updateMany({
      where: { folderId: { in: targetFolderIds }, deletedAt: { not: null } },
      data: { deletedAt: null }
    });

    await writeAuditLog({
      userId: session.id, projectId, action: "RESTORE_FOLDER",
      entityType: "DocumentFolder", entityId: folderId,
      beforeData: {}, afterData: { targetFolderIds }
    });

    return { success: true };
  } catch (error: any) {
    return { error: "Lỗi hệ thống khi khôi phục thư mục" };
  }
}

export async function restoreDocument`
);

// Replace restoreDocument
content = content.replace(
  /export async function restoreDocument[\s\S]*?export async function permanentDeleteFolder/m,
  `export async function restoreDocument(projectId: string, documentId: string) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (!(await canAccessProject(session, projectId))) return { error: "Không có quyền khôi phục" };

  try {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, projectId, deletedAt: { not: null } }
    });
    if (!doc) return { error: "Tài liệu không nằm trong thùng rác" };

    const folder = await prisma.documentFolder.findUnique({ where: { id: doc.folderId } });
    if (folder?.deletedAt) {
      return { error: "Cần khôi phục thư mục chứa tài liệu trước" };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: null }
    });

    await writeAuditLog({
      userId: session.id, projectId, action: "RESTORE_DOCUMENT",
      entityType: "Document", entityId: documentId,
      beforeData: {}, afterData: { deletedAt: null }
    });

    return { success: true };
  } catch (error: any) {
    return { error: "Lỗi hệ thống khi khôi phục tài liệu" };
  }
}

export async function permanentDeleteFolder`
);


// Replace permanentDeleteFolder
content = content.replace(
  /export async function permanentDeleteFolder[\s\S]*?export async function permanentDeleteDocument/m,
  `export async function permanentDeleteFolder(projectId: string, folderId: string) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (session.role !== "ADMIN" && session.role !== "DIRECTOR") {
    return { error: "Chỉ Admin hoặc Director mới được xóa vĩnh viễn" };
  }

  try {
    const existing = await prisma.documentFolder.findFirst({
      where: { id: folderId, projectId, deletedAt: { not: null } }
    });
    if (!existing) return { error: "Thư mục không hợp lệ" };

    const allDeletedFolders = await prisma.documentFolder.findMany({
      where: { projectId, deletedAt: { not: null } },
      select: { id: true, parentId: true }
    });

    const folderIdsToDelete = new Set<string>([folderId]);
    let added = true;
    while(added) {
      added = false;
      for (const f of allDeletedFolders) {
        if (f.parentId && folderIdsToDelete.has(f.parentId) && !folderIdsToDelete.has(f.id)) {
          folderIdsToDelete.add(f.id);
          added = true;
        }
      }
    }

    const targetFolderIds = Array.from(folderIdsToDelete);

    // Delete documents first
    await prisma.document.deleteMany({
      where: { folderId: { in: targetFolderIds } }
    });

    // Delete folders (bottom up to avoid foreign key constraints if they exist)
    // Actually, Prisma deleteMany with 'in' might handle it or fail if foreign keys are enforced without cascade.
    // Let's delete one by one from bottom up to be safe.
    // Find depth of each folder
    const folderDepths = new Map<string, number>();
    const getDepth = (id: string): number => {
      if (folderDepths.has(id)) return folderDepths.get(id)!;
      const f = allDeletedFolders.find(x => x.id === id);
      if (!f || !f.parentId) return 0;
      const d = 1 + getDepth(f.parentId);
      folderDepths.set(id, d);
      return d;
    };
    targetFolderIds.forEach(id => getDepth(id));
    targetFolderIds.sort((a, b) => (folderDepths.get(b) || 0) - (folderDepths.get(a) || 0));

    for (const id of targetFolderIds) {
      await prisma.documentFolder.delete({ where: { id } });
    }

    await writeAuditLog({
      userId: session.id, projectId, action: "PERMANENT_DELETE_FOLDER",
      entityType: "DocumentFolder", entityId: folderId,
      beforeData: { targetFolderIds }, afterData: {}
    });

    return { success: true };
  } catch (error: any) {
    return { error: "Lỗi hệ thống khi xóa vĩnh viễn thư mục" };
  }
}

export async function permanentDeleteDocument`
);

// Replace permanentDeleteDocument
content = content.replace(
  /export async function permanentDeleteDocument[\s\S]*?$/m,
  `export async function permanentDeleteDocument(projectId: string, documentId: string) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };
  if (session.role !== "ADMIN" && session.role !== "DIRECTOR") {
    return { error: "Chỉ Admin hoặc Director mới được xóa vĩnh viễn" };
  }

  try {
    const existing = await prisma.document.findFirst({
      where: { id: documentId, projectId, deletedAt: { not: null } }
    });
    if (!existing) return { error: "Tài liệu không hợp lệ" };

    await prisma.document.delete({ where: { id: documentId } });

    await writeAuditLog({
      userId: session.id, projectId, action: "PERMANENT_DELETE_DOCUMENT",
      entityType: "Document", entityId: documentId,
      beforeData: existing as unknown as Record<string, unknown>, afterData: {}
    });

    return { success: true };
  } catch (error: any) {
    return { error: "Lỗi hệ thống khi xóa vĩnh viễn tài liệu" };
  }
}
`
);

fs.writeFileSync('src/app/(dashboard)/documents/actions.ts', content);
