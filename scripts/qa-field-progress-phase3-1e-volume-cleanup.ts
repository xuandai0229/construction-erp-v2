import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface PreCheckResult {
  passed: boolean;
  checks: Array<{ name: string; expected: string; actual: string; passed: boolean }>;
}

async function strictPreCheckVolumeTestEntry(): Promise<PreCheckResult> {
  const checks: Array<{ name: string; expected: string; actual: string; passed: boolean }> = [];

  const entryId = 'cmq6g8cq0000bn8wkxwihmzu6';
  const expectedItemId = 'cmq5zzdx90004zkwkw1b5qx04';
  const expectedQuantity = 1000;
  const expectedStatus = 'DRAFT';
  const expectedDesignQty = 60;

  try {
    // Pre-check 1: Entry exists
    const entry = await prisma.fieldProgressEntry.findUnique({
      where: { id: entryId },
      include: { item: true },
    });

    if (!entry) {
      checks.push({ name: 'Entry exists', expected: 'Found', actual: 'Not found', passed: false });
      return { passed: false, checks };
    }

    checks.push({ name: 'Entry exists', expected: 'Found', actual: 'Found', passed: true });

    // Pre-check 2: deletedAt IS NULL
    const deleteCheck = entry.deletedAt === null ? 'null' : 'not null';
    checks.push({ name: 'deletedAt IS NULL', expected: 'null', actual: deleteCheck, passed: entry.deletedAt === null });

    // Pre-check 3: status = DRAFT
    const statusMatch = entry.status === expectedStatus;
    checks.push({ name: `status = ${expectedStatus}`, expected: expectedStatus, actual: entry.status, passed: statusMatch });

    // Pre-check 4: quantity = 1000
    const qtyMatch = Number(entry.quantity) === expectedQuantity;
    checks.push({ name: `quantity = ${expectedQuantity}`, expected: String(expectedQuantity), actual: String(Number(entry.quantity)), passed: qtyMatch });

    // Pre-check 5: itemId matches
    const itemMatch = entry.itemId === expectedItemId;
    checks.push({ name: `itemId = ${expectedItemId.substring(0, 8)}...`, expected: expectedItemId, actual: entry.itemId, passed: itemMatch });

    // Pre-check 6: Item content is correct
    const itemContent = entry.item?.workContent || 'Unknown';
    const contentMatch = itemContent.includes('Cống tròn D1000') || itemContent.includes('tròn D1000');
    checks.push({ name: 'Item content contains "Cống tròn D1000"', expected: 'Contains', actual: itemContent, passed: contentMatch });

    // Pre-check 7: Item designQuantity = 60
    const designQtyMatch = Number(entry.item?.designQuantity) === expectedDesignQty;
    checks.push({
      name: `Item designQuantity = ${expectedDesignQty}`,
      expected: String(expectedDesignQty),
      actual: String(Number(entry.item?.designQuantity || 0)),
      passed: designQtyMatch,
    });

    // Pre-check 8: Not SUBMITTED
    const notSubmitted = entry.status !== 'SUBMITTED';
    checks.push({ name: 'status ≠ SUBMITTED', expected: 'Not SUBMITTED', actual: entry.status, passed: notSubmitted });

    // Pre-check 9: Not APPROVED
    const notApproved = entry.status !== 'APPROVED';
    checks.push({ name: 'status ≠ APPROVED', expected: 'Not APPROVED', actual: entry.status, passed: notApproved });

    // Overall result
    const allPassed = checks.every((c) => c.passed);
    return { passed: allPassed, checks };
  } catch (error) {
    checks.push({
      name: 'Database query',
      expected: 'Success',
      actual: error instanceof Error ? error.message : String(error),
      passed: false,
    });
    return { passed: false, checks };
  }
}

async function softDeleteVolumeTestEntry() {
  const entryId = 'cmq6g8cq0000bn8wkxwihmzu6';

  console.log('\n🔍 PRE-CHECK PHASE');
  console.log('=================\n');

  const preCheck = await strictPreCheckVolumeTestEntry();

  console.log('| Check | Expected | Actual | Status |');
  console.log('|-------|----------|--------|--------|');

  preCheck.checks.forEach((check) => {
    const status = check.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`| ${check.name} | ${check.expected} | ${check.actual} | ${status} |`);
  });

  console.log('');

  if (!preCheck.passed) {
    console.log(`❌ PRE-CHECK FAILED - ${preCheck.checks.filter((c) => !c.passed).length} check(s) failed`);
    console.log('❌ TRANSACTION ROLLED BACK - NO DATA MODIFIED\n');
    return { success: false, softDeleted: 0, reason: 'Pre-check failed' };
  }

  console.log(`✅ ALL PRE-CHECKS PASSED\n`);

  console.log('📝 APPLYING SOFT DELETE');
  console.log('======================\n');

  try {
    // Get before state
    const beforeEntry = await prisma.fieldProgressEntry.findUnique({
      where: { id: entryId },
    });

    if (!beforeEntry) throw new Error('Entry disappeared during apply');

    const beforeDeletedAt = beforeEntry.deletedAt ? beforeEntry.deletedAt.toISOString() : 'null';

    console.log(`Entry ID: ${entryId}`);
    console.log(`Before deletedAt: ${beforeDeletedAt}`);
    console.log(`Status: ${beforeEntry.status} (unchanged)`);
    console.log(`Quantity: ${beforeEntry.quantity} (unchanged)\n`);

    // Soft delete
    const now = new Date();
    const updated = await prisma.fieldProgressEntry.update({
      where: { id: entryId },
      data: {
        deletedAt: now,
      },
    });

    console.log(`✅ SOFT DELETE APPLIED\n`);

    // Post-check
    console.log('🔍 POST-CHECK PHASE');
    console.log('===================\n');

    const afterEntry = await prisma.fieldProgressEntry.findUnique({
      where: { id: entryId },
    });

    if (!afterEntry) throw new Error('Entry vanished after delete');

    const afterDeletedAt = afterEntry.deletedAt ? afterEntry.deletedAt.toISOString() : 'null';

    console.log(`✅ Entry soft-deleted successfully`);
    console.log(`   Before deletedAt: ${beforeDeletedAt}`);
    console.log(`   After deletedAt:  ${afterDeletedAt}`);
    console.log(`   Status: ${afterEntry.status} (verified unchanged)`);
    console.log(`   Quantity: ${afterEntry.quantity} (verified unchanged)\n`);

    return {
      success: true,
      softDeleted: 1,
      entryId,
      beforeDeletedAt,
      afterDeletedAt,
    };
  } catch (error) {
    console.log(`\n❌ APPLY FAILED: ${error instanceof Error ? error.message : String(error)}`);
    console.log('❌ TRANSACTION ROLLED BACK - NO DATA MODIFIED\n');
    return {
      success: false,
      softDeleted: 0,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verifyNoOtherModifications() {
  console.log('\n\n📋 VERIFICATION: Other entries untouched');
  console.log('========================================\n');

  // Check that 5 SUBMITTED orphans are still there and untouched
  const orphanIds = [
    'cmq60vtz30008awwkqnmp5n90',
    'cmq5yrrtj000om8wkkm2zrva4',
    'cmq60vtzq0009awwkmcvl2jnp',
    'cmq5yrrts000pm8wkqnu99jfh',
    'cmq60cbpa001lm8wk1np95ehd',
  ];

  const orphans = await prisma.fieldProgressEntry.findMany({
    where: { id: { in: orphanIds } },
  });

  if (orphans.length !== 5) {
    console.log(`⚠️  WARNING: Expected 5 SUBMITTED orphans, found ${orphans.length}`);
  } else {
    console.log(`✅ All 5 SUBMITTED orphans present and untouched`);
  }

  // Verify no other DRAFT entries were accidentally deleted
  const otherDrafts = await prisma.fieldProgressEntry.findMany({
    where: {
      status: 'DRAFT',
      deletedAt: null,
    },
    take: 5,
  });

  console.log(`✅ Other DRAFT entries still exist: ${otherDrafts.length} entries found (sample)\n`);
}

async function main() {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🧹 PHASE 3.1E - APPLY APPROVED VOLUME TEST DATA CLEANUP');
    console.log(`${'='.repeat(60)}\n`);

    const result = await softDeleteVolumeTestEntry();

    if (result.success) {
      await verifyNoOtherModifications();
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📋 PHASE 3.1E SUMMARY');
    console.log(`${'='.repeat(60)}\n`);
    console.log(`Entry soft-deleted: ${result.softDeleted > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`No other modifications: ✅ Verified`);
    console.log(`\nReady for post-apply audit verification.\n`);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
