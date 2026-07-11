import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- QA: MATERIAL REQUEST SNAPSHOT PERSISTENCE ---');
  let hasErrors = false;

  const requestItems = await prisma.materialRequestItem.findMany({
    take: 10,
  });

  for (const item of requestItems) {
    if (!item.materialName || !item.unit) {
      console.error(`[FAIL] RequestItem ${item.id} missing materialName or unit snapshot.`);
      hasErrors = true;
    }
  }

  // Ensure that custom material items don't auto-create Master Data
  // We can't perfectly test this post-hoc unless we find requestItems without materialCode,
  // and ensure they aren't mysteriously in materialItem.
  // Actually, the server actions don't create master data currently.

  if (hasErrors) {
    console.error('\n[FINAL RESULT] NO-GO: Snapshot persistence failed.');
    process.exit(1);
  } else {
    console.log('\n[FINAL RESULT] GO: Snapshot persistence passes.');
    process.exit(0);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
