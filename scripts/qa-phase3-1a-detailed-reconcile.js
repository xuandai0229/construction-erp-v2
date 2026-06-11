const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const Decimal = require('decimal.js');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function detailedOrphanAnalysis() {
  console.log('\n📊 DETAILED ORPHAN ANALYSIS');
  console.log('===========================\n');

  const orphans = await prisma.fieldProgressEntry.findMany({
    where: {
      deletedAt: null,
      item: { deletedAt: { not: null } },
    },
    include: { item: { select: { deletedAt: true } } },
    orderBy: [{ status: 'asc' }, { entryDate: 'asc' }],
  });

  console.log('| Entry ID | Item ID | Status | Entry Date | Item Deleted At | Timezone Issue | Proposed Action |');
  console.log('|----------|---------|--------|------------|---|---|---|');

  const tzIssueIds = new Set();
  const allEntries = await prisma.fieldProgressEntry.findMany({
    where: { deletedAt: null },
  });

  for (const entry of allEntries) {
    const dateStr = entry.entryDate.toISOString();
    if (dateStr.includes('17:00:00')) {
      tzIssueIds.add(entry.id);
    }
  }

  for (const entry of orphans) {
    const hasTimezoneIssue = tzIssueIds.has(entry.id);
    const action = entry.status === 'DRAFT' ? 'SOFT_DELETE' : 'MANUAL_REVIEW';
    console.log(
      `| ${entry.id.substring(0, 8)}... | ${entry.itemId.substring(0, 8)}... | ${entry.status} | ${entry.entryDate.toISOString().substring(0, 10)} | ${entry.item?.deletedAt ? 'YES' : 'N/A'} | ${hasTimezoneIssue ? 'YES' : 'NO'} | ${action} |`
    );
  }

  // Summary
  console.log(`\n📌 BREAKDOWN:`);
  const draftOrphans = orphans.filter((x) => x.status === 'DRAFT');
  const submittedOrphans = orphans.filter((x) => x.status === 'SUBMITTED');
  const approvedOrphans = orphans.filter((x) => x.status === 'APPROVED');
  const timezoneOrphans = orphans.filter((x) => tzIssueIds.has(x.id));

  console.log(`✓ DRAFT orphans: ${draftOrphans.length}`);
  console.log(`✓ SUBMITTED orphans: ${submittedOrphans.length}`);
  console.log(`✓ APPROVED orphans: ${approvedOrphans.length}`);
  console.log(`✓ With timezone issue: ${timezoneOrphans.length}`);
}

async function detailedVolumeAnalysis() {
  console.log('\n\n📊 DETAILED VOLUME ANALYSIS');
  console.log('===========================\n');

  const items = await prisma.fieldProgressItem.findMany({
    where: { deletedAt: null },
    include: {
      entries: { where: { deletedAt: null } },
    },
  });

  const issues = [];

  for (const item of items) {
    const designQty = item.designQuantity ? Number(item.designQuantity) : 0;
    if (designQty === 0) continue;

    const allStatusTotal = item.entries.reduce((sum, e) => sum + Number(e.quantity || 0), 0);
    const approvedTotal = item.entries
      .filter((e) => e.status === 'APPROVED')
      .reduce((sum, e) => sum + Number(e.quantity || 0), 0);

    const percent = (allStatusTotal / designQty) * 100;

    if (percent > 110) {
      issues.push({
        itemId: item.id,
        name: item.name || 'N/A',
        designQty,
        approvedTotal,
        allStatusTotal,
        percent: Math.round(percent),
        entryCount: item.entries.length,
        statuses: Array.from(new Set(item.entries.map((e) => e.status))),
      });
    }
  }

  console.log('| Item ID | Name | Design | Approved | All-Status | % | Count | Statuses |');
  console.log('|---------|------|--------|----------|------------|---|-------|----------|');

  issues.forEach((issue) => {
    const statusStr = issue.statuses.join(',');
    console.log(
      `| ${issue.itemId.substring(0, 8)}... | ${issue.name.substring(0, 10)} | ${issue.designQty} | ${issue.approvedTotal} | ${issue.allStatusTotal} | ${issue.percent}% | ${issue.entryCount} | ${statusStr} |`
    );
  });

  console.log(`\n📌 SUMMARY: ${issues.length} items exceed 110% of design`);
  return issues;
}

async function main() {
  try {
    await detailedOrphanAnalysis();
    await detailedVolumeAnalysis();
    process.exit(0);
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
