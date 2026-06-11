const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function reviewTimezoneConflict() {
  console.log('\n🔍 TIMEZONE CONFLICT REVIEW');
  console.log('===========================\n');

  const conflictEntryId = 'cmq6g418p0001n8wksy5kectv';

  // Get conflict entry
  const conflictEntry = await prisma.fieldProgressEntry.findUnique({
    where: { id: conflictEntryId },
    include: {
      item: { select: { id: true, workContent: true, deletedAt: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!conflictEntry) {
    console.log('❌ Conflict entry not found');
    return;
  }

  // Find existing entry on proposed date
  const proposedDate = new Date(conflictEntry.entryDate.getTime() + 7 * 60 * 60 * 1000);
  const proposedDateStr = proposedDate.toISOString().split('T')[0];

  const existingEntry = await prisma.fieldProgressEntry.findFirst({
    where: {
      itemId: conflictEntry.itemId,
      id: { not: conflictEntry.id },
      deletedAt: null,
      entryDate: {
        gte: new Date(proposedDateStr + 'T00:00:00Z'),
        lt: new Date(new Date(proposedDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00Z'),
      },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  console.log('CONFLICT ENTRY vs EXISTING ENTRY ON PROPOSED DATE\n');
  console.log('| Field | Conflict Entry | Existing Entry (on proposed date) |');
  console.log('|-------|---|---|');
  console.log(`| Entry ID | ${conflictEntry.id} | ${existingEntry?.id || 'N/A'} |`);
  console.log(`| Item ID | ${conflictEntry.itemId} | ${existingEntry?.itemId || 'N/A'} |`);
  console.log(`| Old Entry Date | ${conflictEntry.entryDate.toISOString().substring(0, 10)} | ${existingEntry?.entryDate.toISOString().substring(0, 10) || 'N/A'} |`);
  console.log(`| Proposed/Actual Date | ${proposedDateStr} | ${existingEntry?.entryDate.toISOString().substring(0, 10) || 'N/A'} |`);
  console.log(`| Quantity | ${conflictEntry.quantity || 0} | ${existingEntry?.quantity || 0} |`);
  console.log(`| Status | ${conflictEntry.status} | ${existingEntry?.status || 'N/A'} |`);
  console.log(`| Created By | ${conflictEntry.createdBy?.name || 'N/A'} | ${existingEntry?.createdBy?.name || 'N/A'} |`);
  console.log(`| Created At | ${conflictEntry.createdAt.toISOString().substring(0, 10)} | ${existingEntry?.createdAt.toISOString().substring(0, 10) || 'N/A'} |`);

  console.log('\n📋 THREE DECISION OPTIONS:\n');
  console.log('🔵 OPTION A: Keep existing, soft delete conflict DRAFT');
  console.log('   - Use if conflict entry is test data or data entry error');
  console.log('   - Will preserve existing entry on proposed date');
  console.log('   - Mark conflict entry as deleted\n');

  console.log('🔵 OPTION B: Merge quantities into existing entry');
  console.log('   - Use if both entries are for same work on same date');
  console.log('   - Will add quantity: conflict (' + (conflictEntry.quantity || 0) + ') + existing (' + (existingEntry?.quantity || 0) + ') = ' + ((conflictEntry.quantity || 0) + (existingEntry?.quantity || 0)) + '');
  console.log('   - Will append notes from both entries\n');

  console.log('🔵 OPTION C: Keep conflict on old date');
  console.log('   - Use if old date is actually correct business date');
  console.log('   - Will not apply timezone fix to this entry');
  console.log('   - Both entries will remain with different dates\n');
}

async function reviewOrphanSubmitted() {
  console.log('\n\n👻 ORPHAN SUBMITTED ENTRIES REVIEW');
  console.log('===================================\n');

  const orphanIds = [
    'cmq60vtz30008awwkqnmp5n90',
    'cmq5yrrtj000om8wkkm2zrva4',
    'cmq60vtzq0009awwkmcvl2jnp',
    'cmq5yrrts000pm8wkqnu99jfh',
    'cmq60cbpa001lm8wk1np95ehd',
  ];

  const orphans = await prisma.fieldProgressEntry.findMany({
    where: { id: { in: orphanIds } },
    include: {
      item: { select: { id: true, workContent: true, deletedAt: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('| # | Entry ID | Item ID | Item Deleted | Entry Date | Status | Qty | Created By | Risk | Recommendation |');
  console.log('|---|----------|---------|---|---|---|---|---|---|---|');

  orphans.forEach((entry, idx) => {
    const itemDeleted = entry.item?.deletedAt ? 'YES' : 'NO';
    const risk = entry.status === 'SUBMITTED' ? 'Medium' : 'High';
    const rec = 'Requires review';

    console.log(
      `| ${idx + 1} | ${entry.id.substring(0, 8)}... | ${entry.itemId.substring(0, 8)}... | ${itemDeleted} | ${entry.entryDate.toISOString().substring(0, 10)} | ${entry.status} | ${entry.quantity || 0} | ${entry.createdBy?.name || 'N/A'} | ${risk} | ${rec} |`
    );
  });

  console.log('\n📋 THREE DECISION OPTIONS PER ENTRY:\n');
  console.log('🔵 OPTION A: Restore deleted item');
  console.log('   - Use if SUBMITTED entry is real data and item was deleted by mistake');
  console.log('   - Requires item restoration and re-linking');
  console.log('   - Entry stays SUBMITTED, becomes active again\n');

  console.log('🔵 OPTION B: Soft delete entry');
  console.log('   - Use if entry is test data or item was deleted correctly');
  console.log('   - Entry marked as deleted (deletedAt set)');
  console.log('   - Item stays deleted, entry just hidden\n');

  console.log('🔵 OPTION C: Keep as audit-only');
  console.log('   - Use if need to preserve history but exclude from reports');
  console.log('   - Entry kept as is, but add flag to exclude from calculations');
  console.log('   - Entry visible only in audit logs, not in daily/summary\n');
}

async function reviewVolumeIssues() {
  console.log('\n\n📊 VOLUME EXCEEDING ITEMS REVIEW');
  console.log('=================================\n');

  const itemIds = ['cmq5zzdx30002zkwklrgpdxzc', 'cmq5zzdx90004zkwkw1b5qx04'];

  for (const itemId of itemIds) {
    const item = await prisma.fieldProgressItem.findUnique({
      where: { id: itemId },
      include: {
        entries: { where: { deletedAt: null }, include: { createdBy: { select: { name: true } } } },
      },
    });

    if (!item) continue;

    const designQty = Number(item.designQuantity || 0);
    const approvedTotal = item.entries
      .filter((e) => e.status === 'APPROVED')
      .reduce((sum, e) => sum + Number(e.quantity || 0), 0);
    const draftTotal = item.entries
      .filter((e) => e.status === 'DRAFT')
      .reduce((sum, e) => sum + Number(e.quantity || 0), 0);
    const submittedTotal = item.entries
      .filter((e) => e.status === 'SUBMITTED')
      .reduce((sum, e) => sum + Number(e.quantity || 0), 0);
    const allTotal = item.entries.reduce((sum, e) => sum + Number(e.quantity || 0), 0);
    const percent = designQty > 0 ? Math.round((allTotal / designQty) * 100) : 0;

    console.log(`\n📌 ITEM: ${item.id.substring(0, 8)}... (${item.workContent || 'No content'})`);
    console.log('---');
    console.log(`Design Quantity: ${designQty}`);
    console.log(`Approved Total: ${approvedTotal}`);
    console.log(`Draft Total: ${draftTotal}`);
    console.log(`Submitted Total: ${submittedTotal}`);
    console.log(`All-Status Total: ${allTotal}`);
    console.log(`% of Design: ${percent}%`);
    console.log(`Risk: ${percent > 200 ? 'CRITICAL' : percent > 110 ? 'HIGH' : 'MEDIUM'}`);

    console.log(`\nEntries (${item.entries.length}):`);
    console.log('| Entry Date | Status | Qty | Created By |');
    console.log('|---|---|---|---|');
    item.entries.forEach((entry) => {
      console.log(
        `| ${entry.entryDate.toISOString().substring(0, 10)} | ${entry.status} | ${entry.quantity || 0} | ${entry.createdBy?.name || 'N/A'} |`
      );
    });

    console.log('\n💡 ASSESSMENT:\n');
    if (percent > 500) {
      console.log('⚠️  CRITICAL: Quantity far exceeds design (1700%+)');
      console.log('   Likely test data or major data entry error');
      console.log('   Recommendation: Soft delete DRAFT entries if test\n');
    } else if (percent > 200) {
      console.log('⚠️  HIGH: Quantity significantly exceeds design (200%+)');
      console.log('   Likely test data, unplanned work, or entry error');
      console.log('   Recommendation: User review required\n');
    }

    if (approvedTotal === 0) {
      console.log('✓ SAFE: No approved quantity (entries not finalized)');
      console.log('  Can still be adjusted without affecting historical records\n');
    }
  }
}

async function main() {
  try {
    await reviewTimezoneConflict();
    await reviewOrphanSubmitted();
    await reviewVolumeIssues();

    console.log('\n\n✅ MANUAL REVIEW DATA COLLECTION COMPLETE');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
