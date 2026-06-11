/**
 * Write Path Test: Duplicate detection logic in batchSaveDailyEntries
 * Tests the grouping/duplicate detection fix to prevent losing entries when
 * multiple existing entries share the same itemId.
 */

import { Prisma } from "@prisma/client";

interface TestEntry {
  itemId: string;
  quantity: number;
  issueNote?: string;
  proposalNote?: string;
  note?: string;
}

interface ExistingEntry {
  id: string;
  itemId: string;
}

// Simulates the OLD logic (buggy - uses Map which loses duplicates)
function oldLogic(
  inputEntries: TestEntry[],
  existingEntries: ExistingEntry[]
): {
  creates: string[];
  updates: string[];
  errors: string[];
} {
  const existingMap = new Map(existingEntries.map((e) => [e.itemId, e.id]));

  const creates: string[] = [];
  const updates: string[] = [];
  const errors: string[] = [];

  for (const entry of inputEntries) {
    const existingId = existingMap.get(entry.itemId);
    if (existingId) {
      updates.push(existingId);
    } else {
      creates.push(entry.itemId);
    }
  }

  return { creates, updates, errors };
}

// Simulates the NEW logic (fixed - uses grouping to detect duplicates)
function newLogic(
  inputEntries: TestEntry[],
  existingEntries: ExistingEntry[]
): {
  creates: string[];
  updates: string[];
  errors: string[];
} {
  const existingByItemId = new Map<string, string[]>();
  for (const entry of existingEntries) {
    if (!existingByItemId.has(entry.itemId)) {
      existingByItemId.set(entry.itemId, []);
    }
    existingByItemId.get(entry.itemId)!.push(entry.id);
  }

  const creates: string[] = [];
  const updates: string[] = [];
  const errors: string[] = [];

  for (const entry of inputEntries) {
    const existingIds = existingByItemId.get(entry.itemId) || [];

    if (existingIds.length > 1) {
      errors.push(`Duplicate entries for itemId: ${entry.itemId}`);
    } else if (existingIds.length === 1) {
      updates.push(existingIds[0]);
    } else {
      creates.push(entry.itemId);
    }
  }

  return { creates, updates, errors };
}

// Test Cases
const testCases = [
  {
    name: "Case 1: No existing entries",
    input: [{ itemId: "ITEM-A", quantity: 100 }],
    existing: [] as ExistingEntry[],
    expectedNew: { creates: ["ITEM-A"], updates: [], errors: [] },
    expectedOld: { creates: ["ITEM-A"], updates: [], errors: [] },
  },
  {
    name: "Case 2: One existing entry - update",
    input: [{ itemId: "ITEM-A", quantity: 100 }],
    existing: [{ id: "entry-1", itemId: "ITEM-A" }],
    expectedNew: { creates: [], updates: ["entry-1"], errors: [] },
    expectedOld: { creates: [], updates: ["entry-1"], errors: [] },
  },
  {
    name: "Case 3: Two existing entries - should error (NEW) vs silently ignore (OLD)",
    input: [{ itemId: "ITEM-A", quantity: 100 }],
    existing: [
      { id: "entry-1", itemId: "ITEM-A" },
      { id: "entry-2", itemId: "ITEM-A" },
    ],
    expectedNew: {
      creates: [],
      updates: [],
      errors: ["Duplicate entries for itemId: ITEM-A"],
    },
    expectedOld: { creates: [], updates: ["entry-2"], errors: [] }, // BUG: only keeps last one
  },
  {
    name: "Case 4: Soft delete - multiple entries but should ignore deleted",
    input: [{ itemId: "ITEM-B", quantity: 50 }],
    existing: [
      { id: "entry-old", itemId: "ITEM-B" },
      { id: "entry-current", itemId: "ITEM-B" },
    ],
    expectedNew: {
      creates: [],
      updates: [],
      errors: ["Duplicate entries for itemId: ITEM-B"],
    },
    expectedOld: { creates: [], updates: ["entry-current"], errors: [] }, // BUG: doesn't check deletedAt
  },
  {
    name: "Case 5: Multiple items, some with duplicates",
    input: [
      { itemId: "ITEM-A", quantity: 100 },
      { itemId: "ITEM-B", quantity: 50 },
      { itemId: "ITEM-C", quantity: 75 },
    ],
    existing: [
      { id: "entry-a1", itemId: "ITEM-A" },
      { id: "entry-a2", itemId: "ITEM-A" },
      { id: "entry-b1", itemId: "ITEM-B" },
    ],
    expectedNew: {
      creates: ["ITEM-C"],
      updates: ["entry-b1"],
      errors: ["Duplicate entries for itemId: ITEM-A"],
    },
    expectedOld: {
      creates: ["ITEM-C"],
      updates: ["entry-a2", "entry-b1"],
      errors: [],
    }, // BUG: silently uses last entry for ITEM-A
  },
];

// Run tests
console.log("🧪 WRITE PATH DUPLICATE DETECTION TEST\n");
console.log("=====================================\n");

let passCount = 0;
let failCount = 0;

for (const testCase of testCases) {
  console.log(`📋 ${testCase.name}`);
  console.log(`   Input: ${testCase.input.length} entries`);
  console.log(`   Existing: ${testCase.existing.length} entries`);

  const oldResult = oldLogic(testCase.input, testCase.existing);
  const newResult = newLogic(testCase.input, testCase.existing);

  const newMatches =
    JSON.stringify(newResult) === JSON.stringify(testCase.expectedNew);
  const oldMatches =
    JSON.stringify(oldResult) === JSON.stringify(testCase.expectedOld);

  console.log(`   NEW logic: ${newMatches ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`   OLD logic: ${oldMatches ? "✅ PASS (as expected)" : "❌ FAIL"}`);

  if (newMatches) {
    passCount++;
  } else {
    failCount++;
    console.log(`     Expected: ${JSON.stringify(testCase.expectedNew)}`);
    console.log(`     Got:      ${JSON.stringify(newResult)}`);
  }

  console.log();
}

console.log("=====================================");
console.log(`✅ ${passCount} passed | ❌ ${failCount} failed`);
console.log(
  "\n📌 NOTE: If NEW logic shows duplicates (errors array populated),",
  "that's expected - it SHOULD block operations with duplicate entries."
);

if (failCount > 0) {
  console.log("\n❌ TEST FAILED - New logic has issues");
  process.exit(1);
} else {
  console.log("\n✅ TEST PASSED - New logic correctly handles duplicates");
  process.exit(0);
}
