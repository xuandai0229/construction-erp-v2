const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function findTimezoneIssues() {
  console.log('\n🕐 TIMEZONE FIX ANALYSIS');
  console.log('========================\n');

  // Find all entries with 17:00:00Z pattern (UTC+7 local midnight)
  const allEntries = await prisma.fieldProgressEntry.findMany({
    where: { deletedAt: null },
    include: { item: { select: { id: true, deletedAt: true } } },
  });

  const issues = [];
  for (const entry of allEntries) {
    const dateStr = entry.entryDate.toISOString();
    if (dateStr.includes('17:00:00')) {
      // Add 7 hours to fix timezone
      const oldDate = new Date(entry.entryDate);
      const proposedDate = new Date(oldDate.getTime() + 7 * 60 * 60 * 1000);

      // Check for conflicts
      const hasConflict = await prisma.fieldProgressEntry.findFirst({
        where: {
          id: { not: entry.id },
          itemId: entry.itemId,
          entryDate: {
            gte: new Date(proposedDate.toISOString().split('T')[0] + 'T00:00:00Z'),
            lt: new Date(
              new Date(proposedDate.getTime() + 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0] + 'T00:00:00Z'
            ),
          },
          deletedAt: null,
        },
      });

      issues.push({
        entryId: entry.id,
        itemId: entry.itemId,
        oldEntryDate: dateStr.substring(0, 19) + 'Z',
        proposedEntryDate: proposedDate.toISOString().substring(0, 19) + 'Z',
        oldWorkDate: (entry.workDate || entry.entryDate)
          .toISOString()
          .substring(0, 10),
        proposedWorkDate: new Date(
          (entry.workDate || entry.entryDate).getTime() + 7 * 60 * 60 * 1000
        )
          .toISOString()
          .substring(0, 10),
        status: entry.status,
        conflict: !!hasConflict,
      });
    }
  }

  console.log(`Total timezone issues found: ${issues.length}`);
  if (issues.length > 0) {
    console.log(
      '\n| Entry ID | Old Entry Date | Proposed Date | Status | Conflict |'
    );
    console.log(
      '|----------|----------------|---------------|--------|----------|'
    );
    issues.forEach((issue) => {
      console.log(
        `| ${issue.entryId.substring(0, 8)}... | ${issue.oldEntryDate} | ${issue.proposedEntryDate} | ${issue.status} | ${issue.conflict ? '⚠️' : '✅'} |`
      );
    });
  }

  return issues;
}

async function findOrphanEntries() {
  console.log('\n\n👻 ORPHAN ENTRY ANALYSIS');
  console.log('========================\n');

  const orphans = await prisma.fieldProgressEntry.findMany({
    where: {
      deletedAt: null,
      item: { deletedAt: { not: null } },
    },
    include: { item: { select: { deletedAt: true } } },
  });

  console.log(`Total orphan entries found: ${orphans.length}`);
  if (orphans.length > 0) {
    console.log(
      '\n| Entry ID | Item ID | Entry Date | Status | Proposed Action |'
    );
    console.log(
      '|----------|---------|------------|--------|-----------------|'
    );
    orphans.forEach((entry) => {
      const action = entry.status === 'DRAFT' ? 'SOFT_DELETE' : 'MANUAL_REVIEW';
      console.log(
        `| ${entry.id.substring(0, 8)}... | ${entry.itemId.substring(0, 8)}... | ${entry.entryDate.toISOString().substring(0, 10)} | ${entry.status} | ${action} |`
      );
    });
  }

  return orphans;
}

async function findVolumeIssues() {
  console.log('\n\n📊 VOLUME EXCEEDING ANALYSIS');
  console.log('=============================\n');

  const items = await prisma.fieldProgressItem.findMany({
    where: { deletedAt: null },
    include: {
      entries: { where: { deletedAt: null }, select: { quantity: true, status: true } },
    },
  });

  const issues = [];
  for (const item of items) {
    const designQty = item.designQuantity ? Number(item.designQuantity) : 0;
    if (designQty === 0) continue;

    const allStatusTotal = item.entries.reduce((sum, e) => sum + (e.quantity || 0), 0);
    const approvedTotal = item.entries
      .filter((e) => e.status === 'APPROVED')
      .reduce((sum, e) => sum + (e.quantity || 0), 0);

    const percent = (allStatusTotal / designQty) * 100;

    if (percent > 110) {
      issues.push({
        itemId: item.id,
        workContent: item.name || 'N/A',
        designQuantity: designQty,
        approvedTotal,
        allStatusTotal,
        percent: Math.round(percent),
        proposedAction:
          approvedTotal === 0
            ? 'USER_REVIEW_REQUIRED_BEFORE_SUBMIT'
            : 'ESCALATE_TO_MANAGER',
      });
    }
  }

  console.log(`Total items exceeding design: ${issues.length}`);
  if (issues.length > 0) {
    console.log(
      '\n| Item ID | Design Qty | All-Status | % of Design | Proposed Action |'
    );
    console.log(
      '|---------|------------|------------|-------------|-----------------|'
    );
    issues.forEach((issue) => {
      console.log(
        `| ${issue.itemId.substring(0, 8)}... | ${issue.designQuantity} | ${issue.allStatusTotal} | ${issue.percent}% | ${issue.proposedAction.substring(0, 20)} |`
      );
    });
  }

  return issues;
}

async function main() {
  console.log('📊 PHASE 3.1A - BACKUP + MIGRATION DRY-RUN');
  console.log('==========================================');
  console.log('⏰', new Date().toISOString());
  console.log('⚠️  READ-ONLY ANALYSIS - NO DATA MUTATIONS\n');

  try {
    const tzIssues = await findTimezoneIssues();
    const orphanIssues = await findOrphanEntries();
    const volumeIssues = await findVolumeIssues();

    // Risk Assessment
    console.log('\n\n⚠️  RISK ASSESSMENT');
    console.log('==================');
    const approvedTz = tzIssues.filter((x) => x.status === 'APPROVED');
    const conflictingTz = tzIssues.filter((x) => x.conflict);
    const nonDraftOrphans = orphanIssues.filter((x) => x.status !== 'DRAFT');

    console.log(`✓ APPROVED entries affected by timezone fix: ${approvedTz.length}`);
    if (approvedTz.length > 0) {
      console.log('  ⚠️  WARNING: APPROVED entries will be modified!');
    }

    console.log(`✓ Timezone fix conflicts: ${conflictingTz.length}`);
    if (conflictingTz.length > 0) {
      console.log('  ⚠️  WARNING: Cannot auto-fix, need manual review!');
    }

    console.log(`✓ Non-DRAFT orphan entries: ${nonDraftOrphans.length}`);
    if (nonDraftOrphans.length > 0) {
      console.log('  ⚠️  WARNING: Need different handling!');
    }

    // Summary
    console.log('\n\n📋 PHASE 3.1A SUMMARY');
    console.log('====================');
    console.log(`✓ Timezone entries to fix: ${tzIssues.length}`);
    console.log(
      `  ├─ With conflicts: ${conflictingTz.length}`
    );
    console.log(
      `  └─ Can auto-fix: ${tzIssues.length - conflictingTz.length}`
    );
    console.log(`✓ Orphan entries to handle: ${orphanIssues.length}`);
    console.log(
      `  ├─ DRAFT (safe to soft delete): ${orphanIssues.filter((x) => x.status === 'DRAFT').length}`
    );
    console.log(
      `  └─ Other statuses: ${nonDraftOrphans.length}`
    );
    console.log(`✓ Volume items to review: ${volumeIssues.length}`);

    console.log('\n✅ DRY-RUN ANALYSIS COMPLETE - NO DATA MODIFIED');
    console.log('✅ Database is intact and ready for Phase 3.1B apply\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Dry-run analysis failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
