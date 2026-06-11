import prisma from "../src/lib/prisma";

async function runCleanup() {
  console.log("🧹 STARTING FIELD PROGRESS DATA CLEANUP...");

  // 1. Cleanup Orphans (Entries where Item is soft-deleted)
  const orphans = await prisma.fieldProgressEntry.findMany({
    where: {
      deletedAt: null,
      item: { deletedAt: { not: null } }
    },
    include: { item: true }
  });

  console.log(`\n🔍 Found ${orphans.length} active entries belonging to soft-deleted items.`);
  
  if (orphans.length > 0) {
    let orphanDeletedCount = 0;
    for (const orphan of orphans) {
      await prisma.fieldProgressEntry.update({
        where: { id: orphan.id },
        data: { deletedAt: orphan.item.deletedAt || new Date() }
      });
      orphanDeletedCount++;
    }
    console.log(`✅ Soft-deleted ${orphanDeletedCount} orphan entries.`);
  }

  // 2. Cleanup Zero Quantity Entries
  const zeroEntries = await prisma.fieldProgressEntry.findMany({
    where: {
      deletedAt: null,
      quantity: 0
    }
  });

  console.log(`\n🔍 Found ${zeroEntries.length} active entries with quantity = 0.`);
  
  if (zeroEntries.length > 0) {
    const { count: zeroDeletedCount } = await prisma.fieldProgressEntry.updateMany({
      where: {
        id: { in: zeroEntries.map(e => e.id) }
      },
      data: { deletedAt: new Date() }
    });
    console.log(`✅ Soft-deleted ${zeroDeletedCount} zero-quantity entries.`);
  }

  // Verification
  const remainingOrphans = await prisma.fieldProgressEntry.count({
    where: {
      deletedAt: null,
      item: { deletedAt: { not: null } }
    }
  });

  const remainingZeroEntries = await prisma.fieldProgressEntry.count({
    where: {
      deletedAt: null,
      quantity: 0
    }
  });

  console.log("\n📊 CLEANUP SUMMARY:");
  console.log(`Remaining Orphans: ${remainingOrphans} (Expected 0)`);
  console.log(`Remaining Zero Quantity Entries: ${remainingZeroEntries} (Expected 0)`);
  
  console.log("\n🎉 CLEANUP COMPLETED SUCCESSFULLY!");
  await prisma.$disconnect();
}

runCleanup().catch(async (e) => {
  console.error("❌ Cleanup script crashed with error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
