/**
 * This script is a local utility to clean up permanently deleted documents and folders
 * that have been in the trash for more than 7 days.
 * 
 * Usage:
 * 1. Install ts-node if you haven't: npm install -g ts-node
 * 2. Run this script via: ts-node scripts/cleanup-documents-trash.ts
 * 
 * To automate this on Windows via Task Scheduler:
 * 1. Open Task Scheduler.
 * 2. Create a Basic Task.
 * 3. Set Trigger to Daily.
 * 4. Action: "Start a Program".
 * 5. Program/script: "ts-node" (or the full path to your global ts-node executable).
 * 6. Add arguments: "scripts/cleanup-documents-trash.ts".
 * 7. Start in: "D:\\construction-erp-v2" (or your exact project path).
 */

import { PrismaClient } from "@prisma/client";
import { subDays } from "date-fns";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function runCleanup() {
  console.log("Starting trash cleanup...");
  
  try {
    const cutoffDate = subDays(new Date(), 7);

    // 1. Cleanup Documents
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
      console.log(`Found ${expiredDocIds.length} expired documents. Deleting...`);
      await prisma.document.deleteMany({
        where: { id: { in: expiredDocIds } },
      });
      
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
      
      await prisma.auditLog.create({
        data: {
          userId: "system",
          projectId: "system",
          action: "CRON_CLEANUP_DOCUMENTS",
          entityType: "Document",
          entityId: "batch",
          beforeData: JSON.stringify({ count: expiredDocIds.length, ids: expiredDocIds }),
          afterData: "{}",
        }
      });
      console.log("Documents cleaned up successfully.");
    } else {
      console.log("No expired documents to clean up.");
    }

    // 2. Cleanup Folders
    const expiredFolders = await prisma.documentFolder.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
    });

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
      console.log(`Found ${expiredFolderIds.length} expired folders. Deleting...`);
      for (const id of expiredFolderIds) {
        await prisma.documentFolder.delete({ where: { id } });
      }

      await prisma.auditLog.create({
        data: {
          userId: "system",
          projectId: "system",
          action: "CRON_CLEANUP_FOLDERS",
          entityType: "DocumentFolder",
          entityId: "batch",
          beforeData: JSON.stringify({ count: expiredFolderIds.length, ids: expiredFolderIds }),
          afterData: "{}",
        }
      });
      console.log("Folders cleaned up successfully.");
    } else {
      console.log("No expired folders to clean up.");
    }
    
    console.log("Trash cleanup completed successfully.");
  } catch (error) {
    console.error("Error during trash cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCleanup();
