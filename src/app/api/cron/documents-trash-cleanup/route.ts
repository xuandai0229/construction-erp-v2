import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { subDays } from "date-fns";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  // Simple auth check via header or query params for cron tasks
  const authHeader = request.headers.get("authorization");
  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    process.env.NODE_ENV === "production"
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const cutoffDate = subDays(new Date(), 7);

    // Xóa vĩnh viễn tài liệu quá hạn
    const expiredDocuments = await prisma.document.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
    });

    const expiredDocIds = expiredDocuments.map((doc) => doc.id);

    if (expiredDocIds.length > 0) {
      await prisma.document.deleteMany({
        where: { id: { in: expiredDocIds } },
      });
      
      // Cleanup files from storage could be done here if local, 
      // but if we are using an object storage, we'd delete them there.
      for (const doc of expiredDocuments) {
        if (doc.storagePath) {
          const absolutePath = path.join(process.cwd(), doc.storagePath);
          try {
             if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
             }
          } catch (e) {
             console.error("Failed to delete file from disk: ", absolutePath);
          }
        }
      }

      await writeAuditLog({
        userId: "system",
        projectId: "system",
        action: "CRON_CLEANUP_DOCUMENTS",
        entityType: "Document",
        entityId: "batch",
        beforeData: { count: expiredDocIds.length, ids: expiredDocIds },
        afterData: {},
      });
    }

    // Xóa vĩnh viễn thư mục quá hạn
    const expiredFolders = await prisma.documentFolder.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
    });

    // Need to sort by depth descending to delete bottom-up to avoid foreign key issues
    const allDeletedFolders = await prisma.documentFolder.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, parentId: true }
    });

    const folderDepths = new Map<string, number>();
    const getDepth = (id: string): number => {
      if (folderDepths.has(id)) return folderDepths.get(id)!;
      const f = allDeletedFolders.find(x => x.id === id);
      if (!f || !f.parentId) return 0;
      const d = 1 + getDepth(f.parentId);
      folderDepths.set(id, d);
      return d;
    };

    const expiredFolderIds = expiredFolders.map((f) => f.id);
    expiredFolderIds.forEach(id => getDepth(id));
    expiredFolderIds.sort((a, b) => (folderDepths.get(b) || 0) - (folderDepths.get(a) || 0));

    if (expiredFolderIds.length > 0) {
      for (const id of expiredFolderIds) {
        await prisma.documentFolder.delete({ where: { id } });
      }

      await writeAuditLog({
        userId: "system",
        projectId: "system",
        action: "CRON_CLEANUP_FOLDERS",
        entityType: "DocumentFolder",
        entityId: "batch",
        beforeData: { count: expiredFolderIds.length, ids: expiredFolderIds },
        afterData: {},
      });
    }

    return NextResponse.json({
      success: true,
      message: "Cleanup completed successfully",
      documentsDeleted: expiredDocIds.length,
      foldersDeleted: expiredFolderIds.length,
    });
  } catch (error: any) {
    console.error("Cron cleanup error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi hệ thống khi dọn dẹp" },
      { status: 500 }
    );
  }
}
