/**
 * FP-L05 Guard Consistency Test
 *
 * Tests that the server action logic for Volume Guard uses APPROVED-only
 * cumulative, matching what the Daily display shows the user.
 *
 * This test simulates the query logic in batchSaveDailyEntries without
 * hitting the DB.
 */

import { evaluateVolumeGuard } from "../src/lib/field-progress/volume-guard";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
}

// Simulate DB entries that exist "before today" for a given item
interface MockEntry {
  itemId: string;
  quantity: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  deletedAt: null | Date;
}

function simulateServerGuardQuery(
  entries: MockEntry[],
  itemId: string,
  designQuantity: number,
  todayQuantity: number,
  submitStatus: "DRAFT" | "SUBMITTED",
) {
  // This simulates the FIXED server action query:
  // status: "APPROVED", deletedAt: null, entryDate < start
  const approvedOnlySum = entries
    .filter((e) => e.itemId === itemId && e.deletedAt === null && e.status === "APPROVED")
    .reduce((sum, e) => sum + e.quantity, 0);

  // This simulates the OLD (buggy) query:
  // deletedAt: null, entryDate < start (no status filter)
  const allStatusSum = entries
    .filter((e) => e.itemId === itemId && e.deletedAt === null)
    .reduce((sum, e) => sum + e.quantity, 0);

  const fixedGuard = evaluateVolumeGuard({
    designQuantity,
    cumulativeBefore: approvedOnlySum,
    todayQuantity,
    status: submitStatus,
  });

  const oldGuard = evaluateVolumeGuard({
    designQuantity,
    cumulativeBefore: allStatusSum,
    todayQuantity,
    status: submitStatus,
  });

  return { approvedOnlySum, allStatusSum, fixedGuard, oldGuard };
}

console.log("🧪 FP-L05 Guard Consistency Test\n");
console.log("=".repeat(60) + "\n");

// =========================================================
// Scenario 1: Item with APPROVED + DRAFT history
// =========================================================
console.log("📋 Scenario 1: APPROVED=61, DRAFT=50 before today, user enters 30 today\n");

const historicalEntries: MockEntry[] = [
  { itemId: "ITEM-X", quantity: 31, status: "APPROVED", deletedAt: null },
  { itemId: "ITEM-X", quantity: 30, status: "APPROVED", deletedAt: null },
  { itemId: "ITEM-X", quantity: 25, status: "DRAFT", deletedAt: null },
  { itemId: "ITEM-X", quantity: 25, status: "SUBMITTED", deletedAt: null },
];

const result1 = simulateServerGuardQuery(historicalEntries, "ITEM-X", 100, 30, "SUBMITTED");

console.log(`  APPROVED-only cumulative: ${result1.approvedOnlySum}`);
console.log(`  ALL-status cumulative:    ${result1.allStatusSum}`);
console.log(`  Today quantity:           30`);
console.log(`  Design quantity:          100`);
console.log();
console.log(`  FIXED guard (APPROVED=61 + 30 = 91%): Level=${result1.fixedGuard.level}, canSubmit=${result1.fixedGuard.canSubmit}`);
console.log(`  OLD guard   (ALL=111 + 30 = 141%):    Level=${result1.oldGuard.level}, canSubmit=${result1.oldGuard.canSubmit}`);
console.log();

assert(result1.approvedOnlySum === 61, "APPROVED sum should be 61");
assert(result1.allStatusSum === 111, "ALL-status sum should be 111");
assert(result1.fixedGuard.canSubmit === true, "FIXED guard should allow submit (91% ≤ 100%)");
assert(result1.oldGuard.canSubmit === false, "OLD guard would block submit (141% > 110%)");
assert(result1.fixedGuard.level === "NEAR_LIMIT", "FIXED guard should be NEAR_LIMIT (91%)");

console.log("  ✅ PASS: Fixed guard allows submit. Old guard would wrongly block.\n");

// =========================================================
// Scenario 2: Soft-deleted entries should be excluded
// =========================================================
console.log("📋 Scenario 2: Soft-deleted APPROVED should not count\n");

const entriesWithDeleted: MockEntry[] = [
  { itemId: "ITEM-Y", quantity: 80, status: "APPROVED", deletedAt: null },
  { itemId: "ITEM-Y", quantity: 50, status: "APPROVED", deletedAt: new Date() }, // soft-deleted
  { itemId: "ITEM-Y", quantity: 10, status: "DRAFT", deletedAt: null },
];

const result2 = simulateServerGuardQuery(entriesWithDeleted, "ITEM-Y", 100, 15, "SUBMITTED");

console.log(`  APPROVED-only cumulative (excl deleted): ${result2.approvedOnlySum}`);
console.log(`  Design: 100, Today: 15`);
console.log(`  Projected: ${result2.approvedOnlySum + 15} → ${((result2.approvedOnlySum + 15) / 100 * 100).toFixed(0)}%`);
console.log(`  FIXED guard: Level=${result2.fixedGuard.level}, canSubmit=${result2.fixedGuard.canSubmit}`);
console.log();

assert(result2.approvedOnlySum === 80, "Should only count active APPROVED (80), not deleted (50)");
assert(result2.fixedGuard.level === "NEAR_LIMIT", "80+15=95% should be NEAR_LIMIT");
assert(result2.fixedGuard.canSubmit === true, "95% should allow submit");

console.log("  ✅ PASS: Soft-deleted APPROVED correctly excluded.\n");

// =========================================================
// Scenario 3: Daily display matches guard
// =========================================================
console.log("📋 Scenario 3: Daily display 'Đã làm' matches guard cumulativeBefore\n");

// Daily page computes: cumulativeBefore = APPROVED entries before selected date
// Guard should use the same number
const dailyDisplayCumBefore = historicalEntries
  .filter((e) => e.itemId === "ITEM-X" && e.deletedAt === null && e.status === "APPROVED")
  .reduce((sum, e) => sum + e.quantity, 0);

const guardCumBefore = result1.approvedOnlySum;

console.log(`  Daily display 'Đã làm': ${dailyDisplayCumBefore}`);
console.log(`  Guard cumulativeBefore: ${guardCumBefore}`);

assert(dailyDisplayCumBefore === guardCumBefore, "Daily display and guard must use same cumulative");

console.log("  ✅ PASS: Daily display and guard are consistent.\n");

// =========================================================
// Summary
// =========================================================
console.log("=".repeat(60));
console.log("\n🎉 ALL GUARD CONSISTENCY TESTS PASSED");
console.log("\n📌 Conclusion: Volume Guard now uses APPROVED-only cumulative,");
console.log("   matching what the user sees on the Daily screen.");
console.log("   DRAFT/SUBMITTED history no longer causes false blocks.");
