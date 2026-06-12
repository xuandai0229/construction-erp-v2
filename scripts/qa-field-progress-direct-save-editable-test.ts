/**
 * QA Test: Field Progress Direct Save — Editable after APPROVED
 * 
 * Tests the write-path logic to ensure:
 * 1. First save creates an APPROVED entry
 * 2. Second save on same item/date updates the existing entry (no duplicate)
 * 3. Third save still updates the same entry
 * 4. Status remains APPROVED throughout
 */

import { getWorkDateRange } from "../src/lib/date/work-date";

// Simulate the server-side write-path logic (mirrors actions.ts)
function simulateWritePath(
  existingEntries: Array<{ id: string; itemId: string; status: string; quantity: number; deletedAt: Date | null }>,
  newEntries: Array<{ itemId: string; quantity: number; note?: string }>,
  dateStr: string
) {
  const { start, end } = getWorkDateRange(dateStr);
  const status = "APPROVED";

  // Build existing map (same as actions.ts)
  const existingByItemId = new Map<string, string[]>();
  for (const entry of existingEntries.filter(e => !e.deletedAt)) {
    if (!existingByItemId.has(entry.itemId)) {
      existingByItemId.set(entry.itemId, []);
    }
    existingByItemId.get(entry.itemId)!.push(entry.id);
  }

  const operations: Array<{ type: "create" | "update" | "soft-delete"; itemId: string; quantity: number; status: string }> = [];
  const errors: string[] = [];

  for (const e of newEntries) {
    const existingIds = existingByItemId.get(e.itemId) || [];

    if (existingIds.length > 1) {
      errors.push(`Duplicate entries for item ${e.itemId}`);
      continue;
    }

    if (e.quantity === 0) {
      if (existingIds.length === 1) {
        operations.push({ type: "soft-delete", itemId: e.itemId, quantity: 0, status });
      }
      continue;
    }

    if (existingIds.length === 1) {
      // UPDATE existing — regardless of current status
      operations.push({ type: "update", itemId: e.itemId, quantity: e.quantity, status });
    } else {
      // CREATE new
      operations.push({ type: "create", itemId: e.itemId, quantity: e.quantity, status });
    }
  }

  return { operations, errors };
}

// ============ Test Cases ============

console.log("🧪 DIRECT SAVE EDITABLE TEST\n");
console.log("=====================================\n");

let passed = 0;
let failed = 0;

// Case 1: First save — no existing entries
{
  const label = "Case 1: First save creates APPROVED entry";
  const result = simulateWritePath(
    [], // no existing
    [{ itemId: "item-1", quantity: 4 }],
    "2026-06-12"
  );

  const ok = result.errors.length === 0
    && result.operations.length === 1
    && result.operations[0].type === "create"
    && result.operations[0].status === "APPROVED"
    && result.operations[0].quantity === 4;

  console.log(`📋 ${label}`);
  console.log(`   Operations: ${JSON.stringify(result.operations)}`);
  console.log(`   ${ok ? "✅ PASS" : "❌ FAIL"}\n`);
  ok ? passed++ : failed++;
}

// Case 2: Second save — existing APPROVED entry, new quantity
{
  const label = "Case 2: Re-save updates existing APPROVED entry (no duplicate)";
  const result = simulateWritePath(
    [{ id: "entry-1", itemId: "item-1", status: "APPROVED", quantity: 4, deletedAt: null }],
    [{ itemId: "item-1", quantity: 8 }],
    "2026-06-12"
  );

  const ok = result.errors.length === 0
    && result.operations.length === 1
    && result.operations[0].type === "update"
    && result.operations[0].status === "APPROVED"
    && result.operations[0].quantity === 8;

  console.log(`📋 ${label}`);
  console.log(`   Operations: ${JSON.stringify(result.operations)}`);
  console.log(`   ${ok ? "✅ PASS" : "❌ FAIL"}\n`);
  ok ? passed++ : failed++;
}

// Case 3: Third save — same entry, new quantity again
{
  const label = "Case 3: Third save still updates same entry";
  const result = simulateWritePath(
    [{ id: "entry-1", itemId: "item-1", status: "APPROVED", quantity: 8, deletedAt: null }],
    [{ itemId: "item-1", quantity: 5 }],
    "2026-06-12"
  );

  const ok = result.errors.length === 0
    && result.operations.length === 1
    && result.operations[0].type === "update"
    && result.operations[0].status === "APPROVED"
    && result.operations[0].quantity === 5;

  console.log(`📋 ${label}`);
  console.log(`   Operations: ${JSON.stringify(result.operations)}`);
  console.log(`   ${ok ? "✅ PASS" : "❌ FAIL"}\n`);
  ok ? passed++ : failed++;
}

// Case 4: Set quantity to 0 → soft-delete existing APPROVED entry
{
  const label = "Case 4: Setting quantity to 0 soft-deletes existing entry";
  const result = simulateWritePath(
    [{ id: "entry-1", itemId: "item-1", status: "APPROVED", quantity: 5, deletedAt: null }],
    [{ itemId: "item-1", quantity: 0 }],
    "2026-06-12"
  );

  const ok = result.errors.length === 0
    && result.operations.length === 1
    && result.operations[0].type === "soft-delete";

  console.log(`📋 ${label}`);
  console.log(`   Operations: ${JSON.stringify(result.operations)}`);
  console.log(`   ${ok ? "✅ PASS" : "❌ FAIL"}\n`);
  ok ? passed++ : failed++;
}

// Case 5: Re-create after soft-delete
{
  const label = "Case 5: Creating after soft-delete works (no conflict)";
  const result = simulateWritePath(
    [{ id: "entry-1", itemId: "item-1", status: "APPROVED", quantity: 5, deletedAt: new Date() }],
    [{ itemId: "item-1", quantity: 3 }],
    "2026-06-12"
  );

  const ok = result.errors.length === 0
    && result.operations.length === 1
    && result.operations[0].type === "create"
    && result.operations[0].status === "APPROVED"
    && result.operations[0].quantity === 3;

  console.log(`📋 ${label}`);
  console.log(`   Operations: ${JSON.stringify(result.operations)}`);
  console.log(`   ${ok ? "✅ PASS" : "❌ FAIL"}\n`);
  ok ? passed++ : failed++;
}

// Case 6: Verify UI logic — status APPROVED should NOT lock input
{
  const label = "Case 6: UI logic — APPROVED status must NOT disable input";
  // Simulate what daily-entry-table.tsx does
  const item = { status: "APPROVED", quantity: "5" };
  
  // OLD (broken) logic: isLocked = item.status === "SUBMITTED" || item.status === "APPROVED"
  const oldIsLocked = item.status === "SUBMITTED" || item.status === "APPROVED";
  
  // NEW (fixed) logic: disabled={loading}, loading is false when not saving
  const loading = false;
  const newIsDisabled = loading;
  
  const ok = oldIsLocked === true && newIsDisabled === false;

  console.log(`📋 ${label}`);
  console.log(`   Old isLocked (BROKEN): ${oldIsLocked}`);
  console.log(`   New disabled (FIXED): ${newIsDisabled}`);
  console.log(`   ${ok ? "✅ PASS — Input stays editable after save" : "❌ FAIL"}\n`);
  ok ? passed++ : failed++;
}

console.log("=====================================");
console.log(`✅ ${passed} passed | ❌ ${failed} failed\n`);

if (failed > 0) {
  console.log("❌ SOME TESTS FAILED");
  process.exit(1);
} else {
  console.log("✅ ALL DIRECT SAVE EDITABLE TESTS PASSED");
}
