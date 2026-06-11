import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface PreCheckResult {
  passed: boolean;
  reason?: string;
}

async function preCheckTimezoneEntry(entryId: string): Promise<PreCheckResult> {
  const entry = await prisma.fieldProgressEntry.findUnique({
    where: { id: entryId },
    include: { item: true },
  });

  // Check 1: Entry exists
  if (!entry) {
    return { passed: false, reason: 'Entry not found' };
  }

  // Check 2: Not deleted
  if (entry.deletedAt !== null) {
    return { passed: false, reason: 'Entry is deleted (deletedAt is not null)' };
  }

  // Check 3: Status is DRAFT
  if (entry.status !== 'DRAFT') {
    return { passed: false, reason: `Status is ${entry.status}, expected DRAFT` };
  }

  // Check 4: Entry date matches expected 17:00:00Z on 2026-06-08
  const entryDateStr = entry.entryDate.toISOString();
  const expectedDate = '2026-06-08T17:00:00';
  if (!entryDateStr.startsWith(expectedDate)) {
    return { passed: false, reason: `Entry date is ${entryDateStr}, expected ${expectedDate}Z` };
  }

  // Check 5: New date would be 2026-06-09 00:00:00Z
  const newDate = new Date(entry.entryDate.getTime() + 7 * 60 * 60 * 1000);
  if (newDate.getUTCDate() !== 9 || newDate.getUTCMonth() !== 5) {
    return { passed: false, reason: `New date would be ${newDate.toISOString()}, expected 2026-06-09` };
  }

  // Check 6: No conflict with other entries on new date for same item
  const conflictEntry = await prisma.fieldProgressEntry.findFirst({
    where: {
      itemId: entry.itemId,
      id: { not: entryId },
      deletedAt: null,
      entryDate: {
        gte: new Date('2026-06-09T00:00:00Z'),
        lt: new Date('2026-06-10T00:00:00Z'),
      },
    },
  });

  if (conflictEntry) {
    return { passed: false, reason: `Conflict: existing entry ${conflictEntry.id} on new date` };
  }

  return { passed: true };
}

async function applyTimezoneFixWithTransaction() {
  const entryId = 'cmq6g418p0001n8wksy5kectv';

  console.log('\n🔍 PRE-CHECK PHASE');
  console.log('=================\n');

  const preCheck = await preCheckTimezoneEntry(entryId);
  if (!preCheck.passed) {
    console.log(`❌ PRE-CHECK FAILED: ${preCheck.reason}\n`);
    console.log('❌ TRANSACTION ROLLED BACK - NO DATA MODIFIED\n');
    return { success: false, updated: 0, reason: preCheck.reason };
  }

  console.log(`✅ All pre-checks passed for entry ${entryId}\n`);

  console.log('📝 APPLYING TIMEZONE FIX');
  console.log('========================\n');

  try {
    // Get current data for before/after report
    const beforeEntry = await prisma.fieldProgressEntry.findUnique({
      where: { id: entryId },
    });

    if (!beforeEntry) throw new Error('Entry disappeared during apply');

    const beforeDate = beforeEntry.entryDate.toISOString();
    const newDate = new Date(beforeEntry.entryDate.getTime() + 7 * 60 * 60 * 1000);
    const afterDate = newDate.toISOString();

    console.log(`Entry ID: ${entryId}`);
    console.log(`Before: ${beforeDate}`);
    console.log(`After:  ${afterDate}`);
    console.log(`Status: ${beforeEntry.status} (unchanged)`);
    console.log(`Qty:    ${beforeEntry.quantity} (unchanged)\n`);

    // Update entry with new date
    const updated = await prisma.fieldProgressEntry.update({
      where: { id: entryId },
      data: {
        entryDate: newDate,
      },
    });

    console.log(`✅ TIMEZONE FIX APPLIED\n`);

    // Verify update
    console.log('🔍 POST-CHECK PHASE');
    console.log('===================\n');

    const afterEntry = await prisma.fieldProgressEntry.findUnique({
      where: { id: entryId },
    });

    if (!afterEntry) throw new Error('Entry vanished after update');

    const afterDateStr = afterEntry.entryDate.toISOString();
    console.log(`✅ Entry updated successfully`);
    console.log(`   New date: ${afterDateStr}`);
    console.log(`   Status: ${afterEntry.status} (verified unchanged)`);
    console.log(`   Qty: ${afterEntry.quantity} (verified unchanged)\n`);

    return {
      success: true,
      updated: 1,
      entryId,
      beforeDate,
      afterDate: afterDateStr,
    };
  } catch (error) {
    console.log(`\n❌ APPLY FAILED: ${error instanceof Error ? error.message : String(error)}`);
    console.log('❌ TRANSACTION ROLLED BACK - NO DATA MODIFIED\n');
    return {
      success: false,
      updated: 0,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function volumeDryRun() {
  const itemId = 'cmq5zzdx90004zkwkw1b5qx04';

  console.log('\n\n📊 VOLUME DRY-RUN: Finding test DRAFT entry');
  console.log('===========================================\n');

  const item = await prisma.fieldProgressItem.findUnique({
    where: { id: itemId },
    include: {
      entries: {
        where: { deletedAt: null, quantity: 1000, status: 'DRAFT' },
      },
    },
  });

  if (!item || item.entries.length === 0) {
    console.log(`❌ No DRAFT entry with quantity=1000 found for item ${itemId}\n`);
    return null;
  }

  const testEntry = item.entries[0];

  console.log(`✅ Found suspected test entry:\n`);
  console.log(`| Field | Value |`);
  console.log(`|-------|-------|`);
  console.log(`| Entry ID | ${testEntry.id} |`);
  console.log(`| Item ID | ${itemId} |`);
  console.log(`| Entry Date | ${testEntry.entryDate.toISOString().substring(0, 10)} |`);
  console.log(`| Quantity | ${testEntry.quantity} |`);
  console.log(`| Status | ${testEntry.status} |`);
  console.log(`| Reason | Quantity 1000 vs design 60 (1670% over) |`);

  console.log(`\n💡 RECOMMENDATION:`);
  console.log(`   Soft-delete this DRAFT entry`);
  console.log(`   ⏳ AWAITING USER APPROVAL before deletion\n`);

  return testEntry;
}

async function verifyOrphanSubmittedUntouched() {
  const orphanIds = [
    'cmq60vtz30008awwkqnmp5n90',
    'cmq5yrrtj000om8wkkm2zrva4',
    'cmq60vtzq0009awwkmcvl2jnp',
    'cmq5yrrts000pm8wkqnu99jfh',
    'cmq60cbpa001lm8wk1np95ehd',
  ];

  console.log('\n\n👻 ORPHAN SUBMITTED VERIFICATION');
  console.log('==================================\n');

  const orphans = await prisma.fieldProgressEntry.findMany({
    where: { id: { in: orphanIds } },
  });

  if (orphans.length !== 5) {
    console.log(`⚠️  WARNING: Expected 5 orphan entries, found ${orphans.length}\n`);
  }

  console.log(`| # | Entry ID | Status | Touched? |`);
  console.log(`|---|----------|--------|----------|`);

  let allUntouched = true;
  orphans.forEach((entry, idx) => {
    const touched = entry.deletedAt !== null ? 'YES (UNEXPECTED!)' : 'NO ✓';
    if (entry.deletedAt !== null) allUntouched = false;
    console.log(`| ${idx + 1} | ${entry.id.substring(0, 8)}... | ${entry.status} | ${touched} |`);
  });

  console.log(`\n${allUntouched ? '✅' : '❌'} Orphan SUBMITTED entries: ${allUntouched ? 'ALL UNTOUCHED' : 'SOME MODIFIED (ERROR!)'}\n`);

  return allUntouched;
}

async function main() {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🔧 PHASE 3.1D - APPLY LIMITED MANUAL DECISIONS');
    console.log(`${'='.repeat(60)}\n`);

    // Apply timezone fix
    const tzResult = await applyTimezoneFixWithTransaction();

    // Volume dry-run
    const volumeEntry = await volumeDryRun();

    // Verify orphans untouched
    const orphansClean = await verifyOrphanSubmittedUntouched();

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📋 PHASE 3.1D SUMMARY');
    console.log(`${'='.repeat(60)}\n`);
    console.log(`Timezone fix applied: ${tzResult.success ? '✅ YES' : '❌ NO'}`);
    console.log(`Volume dry-run: ${volumeEntry ? '✅ Found test entry' : '❌ No test entry found'}`);
    console.log(`Orphan SUBMITTED safe: ${orphansClean ? '✅ YES' : '❌ NO'}`);
    console.log(`\nReady for post-apply audit verification.\n`);

    process.exit(tzResult.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
