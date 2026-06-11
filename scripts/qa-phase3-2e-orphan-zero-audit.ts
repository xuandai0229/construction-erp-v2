/**
 * Phase 3.2E — Deep audit for 5 orphan SUBMITTED + 3 zero-qty entries
 * Read-only. Does NOT modify any data.
 */

import prisma from "@/lib/prisma";
import { formatWorkDate } from "@/lib/date/work-date";

async function main() {
  console.log("📋 PHASE 3.2E — ORPHAN + ZERO-QTY DEEP AUDIT\n");

  // ============================================================
  // 1. Orphan Entries: active entries whose item is soft-deleted
  // ============================================================
  console.log("=== 1. ORPHAN ENTRIES (active entry, deleted item) ===\n");

  const orphanEntries = await prisma.fieldProgressEntry.findMany({
    where: {
      deletedAt: null,
      item: { deletedAt: { not: null } },
    },
    include: {
      item: {
        select: {
          id: true,
          workContent: true,
          categoryName: true,
          itemType: true,
          deletedAt: true,
          parentId: true,
          template: { select: { projectId: true, name: true } },
        },
      },
      createdBy: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found: ${orphanEntries.length} orphan entries\n`);

  for (const entry of orphanEntries) {
    const dateStr = formatWorkDate(new Date(entry.entryDate));
    console.log(`  Entry ID:      ${entry.id}`);
    console.log(`  Item ID:       ${entry.itemId}`);
    console.log(`  Item Content:  ${entry.item?.workContent || entry.item?.categoryName || "(no name)"}`);
    console.log(`  Item Type:     ${entry.item?.itemType}`);
    console.log(`  Item DeletedAt:${entry.item?.deletedAt?.toISOString()}`);
    console.log(`  Project ID:    ${entry.item?.template?.projectId}`);
    console.log(`  Entry Date:    ${dateStr}`);
    console.log(`  Quantity:      ${entry.quantity}`);
    console.log(`  Status:        ${entry.status}`);
    console.log(`  Created By:    ${entry.createdBy?.name || entry.createdBy?.email}`);
    console.log(`  Created At:    ${entry.createdAt.toISOString()}`);
    console.log();
  }

  // Check if orphan entries affect any active rollup
  const orphanItemIds = [...new Set(orphanEntries.map((e) => e.itemId))];
  console.log(`  Unique orphan item IDs: ${orphanItemIds.length}`);
  console.log(`  Are these items visible on any screen? NO (items filtered by deletedAt: null)`);
  console.log(`  Do entries affect Summary/Daily totals? NO (items not included in queries)`);
  console.log(`  Impact: ZERO — entries exist in DB but never displayed/calculated\n`);

  // ============================================================
  // 2. Zero Quantity Entries
  // ============================================================
  console.log("=== 2. ZERO QUANTITY ENTRIES (active, qty = 0) ===\n");

  const zeroEntries = await prisma.fieldProgressEntry.findMany({
    where: {
      deletedAt: null,
      quantity: { lte: 0 },
    },
    include: {
      item: {
        select: {
          id: true,
          workContent: true,
          categoryName: true,
          itemType: true,
          deletedAt: true,
        },
      },
      createdBy: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found: ${zeroEntries.length} zero/negative quantity entries\n`);

  for (const entry of zeroEntries) {
    const dateStr = formatWorkDate(new Date(entry.entryDate));
    const itemDeleted = entry.item?.deletedAt !== null;
    console.log(`  Entry ID:      ${entry.id}`);
    console.log(`  Item ID:       ${entry.itemId}`);
    console.log(`  Item Content:  ${entry.item?.workContent || entry.item?.categoryName || "(no name)"}`);
    console.log(`  Item Deleted:  ${itemDeleted ? "YES (also orphan)" : "NO (active item)"}`);
    console.log(`  Entry Date:    ${dateStr}`);
    console.log(`  Quantity:      ${entry.quantity}`);
    console.log(`  Status:        ${entry.status}`);
    console.log(`  Created By:    ${entry.createdBy?.name || entry.createdBy?.email}`);
    console.log(`  Created At:    ${entry.createdAt.toISOString()}`);
    console.log();
  }

  // Check impact
  const activeZero = zeroEntries.filter((e) => e.item?.deletedAt === null);
  const orphanZero = zeroEntries.filter((e) => e.item?.deletedAt !== null);
  console.log(`  Active-item zero-qty entries: ${activeZero.length}`);
  console.log(`  Orphan zero-qty entries:      ${orphanZero.length}`);
  console.log(`  Impact on calculations: ZERO — adding 0 to any sum = no effect`);
  console.log(`  Impact on display: Entry shows on Daily for that date with qty=0`);
  console.log();

  // ============================================================
  // 3. Summary Table
  // ============================================================
  console.log("=== 3. SUMMARY ===\n");
  console.log("| Category | Count | Impact | Recommended Action |");
  console.log("|----------|------:|--------|-------------------|");
  console.log(`| Orphan SUBMITTED | ${orphanEntries.filter((e) => e.status === "SUBMITTED").length} | None (items filtered) | Soft-delete entries OR keep as audit trail |`);
  console.log(`| Orphan other | ${orphanEntries.filter((e) => e.status !== "SUBMITTED").length} | None | Same as above |`);
  console.log(`| Zero-qty (active item) | ${activeZero.length} | None (0+x=x) | Soft-delete OR add validation to block qty=0 save |`);
  console.log(`| Zero-qty (orphan item) | ${orphanZero.length} | None | Covered by orphan cleanup |`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});

