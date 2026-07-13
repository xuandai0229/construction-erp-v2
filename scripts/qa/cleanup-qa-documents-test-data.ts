import prisma from "../../src/lib/prisma";
import { storageProvider } from "../../src/lib/storage/index";

async function main() {
  // 1. Find & delete all QA_AUTO documents (physical + DB)
  const qaDocs = await prisma.document.findMany({
    where: {
      OR: [
        { originalName: { startsWith: "QA_AUTO_" } },
        { displayName: { startsWith: "QA_AUTO_" } }
      ]
    },
    include: { folder: { select: { name: true } } }
  });

  console.log(`\n=== QA_AUTO DOCUMENTS TO DELETE: ${qaDocs.length} ===`);
  for (const doc of qaDocs) {
    console.log(`  [${doc.id}] ${doc.originalName} | folder: ${doc.folder.name} | path: ${doc.storagePath}`);
  }

  if (qaDocs.length > 0) {
    for (const doc of qaDocs) {
      try {
        if (await storageProvider.exists(doc.storagePath)) {
          await storageProvider.deleteFile(doc.storagePath);
          console.log(`  ✅ Deleted physical: ${doc.storagePath}`);
        }
      } catch (err) {
        console.warn(`  ⚠️  Failed physical delete for ${doc.id}:`, err);
      }
    }
    const deleteResult = await prisma.document.deleteMany({
      where: { id: { in: qaDocs.map(d => d.id) } }
    });
    console.log(`  ✅ Hard-deleted ${deleteResult.count} QA_AUTO document records from DB.`);
  }

  // 2. Find & delete empty duplicate folders created by QA seed
  //    These are legacy legal-folder names (dot-separated) that duplicate the
  //    original underscore-separated names.
  const project = await prisma.project.findFirst({
    where: { deletedAt: null, OR: [{ code: { contains: "CT_01" } }, { name: { contains: "Công Trình test" } }] }
  }) || await prisma.project.findFirst({ where: { deletedAt: null } });

  if (!project) { console.log("No project found, skipping folder cleanup"); return; }

  const allRootFolders = await prisma.documentFolder.findMany({
    where: { projectId: project.id, parentId: null, deletedAt: null },
    include: { 
      documents: { select: { id: true, originalName: true } },
      children: { select: { id: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  // Group by normalized name (strip leading number + separator)
  const normalize = (name: string) => name.replace(/^\d+[._]\s*/, "").trim().toLowerCase();
  const byNormalized: Record<string, typeof allRootFolders> = {};
  for (const f of allRootFolders) {
    const key = normalize(f.name);
    if (!byNormalized[key]) byNormalized[key] = [];
    byNormalized[key].push(f);
  }

  console.log(`\n=== DUPLICATE FOLDER CLEANUP ===`);
  const foldersToDelete: string[] = [];

  for (const [normName, fList] of Object.entries(byNormalized)) {
    if (fList.length <= 1) continue;

    console.log(`\n  Duplicate group "${normName}":`);
    for (const f of fList) {
      const realDocs = f.documents.filter(d => !d.originalName.startsWith("QA_AUTO_")).length;
      const hasChildren = f.children.length > 0;
      console.log(`    [${f.id}] "${f.name}" created=${f.createdAt.toISOString()} docs=${f.documents.length} realDocs=${realDocs} children=${f.children.length}`);

      // Only delete if: no real docs, no children, and it's not the oldest (original) folder
      if (realDocs === 0 && !hasChildren && f !== fList[0]) {
        foldersToDelete.push(f.id);
        console.log(`      → WILL DELETE (empty QA-created duplicate)`);
      } else if (f === fList[0]) {
        console.log(`      → KEEP (original folder)`);
      } else {
        console.log(`      → KEEP (has ${realDocs} real documents or ${f.children.length} children — NEEDS MANUAL REVIEW)`);
      }
    }
  }

  if (foldersToDelete.length > 0) {
    // Delete any remaining docs in these folders first
    await prisma.document.deleteMany({
      where: { folderId: { in: foldersToDelete } }
    });
    const delResult = await prisma.documentFolder.deleteMany({
      where: { id: { in: foldersToDelete } }
    });
    console.log(`\n  ✅ Deleted ${delResult.count} duplicate folders.`);
  } else {
    console.log(`\n  No duplicate folders to delete.`);
  }

  // 3. Final state check
  const remaining = await prisma.documentFolder.findMany({
    where: { projectId: project.id, parentId: null, deletedAt: null },
    include: { _count: { select: { documents: true } } },
    orderBy: { name: "asc" }
  });
  console.log(`\n=== FINAL STATE: ${remaining.length} root folders ===`);
  for (const f of remaining) {
    console.log(`  "${f.name}" (${f.id}) — ${f._count.documents} docs`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
