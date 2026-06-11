/**
 * Dry-run analysis for Phase 3.1A migration
 * 
 * READ-ONLY ONLY - No mutations
 * Analyzes what WOULD be fixed without actually fixing
 * 
 * Areas:
 * 1. Timezone issues: 11 entries with 17:00:00Z
 * 2. Orphan entries: 8 entries referencing soft-deleted items
 * 3. Volume exceeding: 2 items with quantity > design
 */

import prisma from "@/lib/prisma";

interface TimezoneFix {
  entryId: string;
  itemId: string;
  oldEntryDate: Date;
  proposedEntryDate: Date;
  status: string;
  hasConflict: boolean;
  conflictEntryId?: string;
}

interface OrphanFix {
  entryId: string;
  itemId: string;
  entryDate: Date;
  status: string;
  itemDeletedAt: Date | null;
  proposedAction: string;
  reason: string;
}

interface VolumeFix {
  itemId: string;
  designQuantity: number;
  approvedTotal: number;
  allStatusTotal: number;
  percentOfDesign: number;
  proposedAction: string;
}

async function analyzeTzFixes(): Promise<TimezoneFix[]> {
  console.log("\n🔍 ANALYZING TIMEZONE FIXES...");

  // Find all entries with non-UTC-midnight time
  const tzIssues = await prisma.fieldProgressEntry.findMany({
    where: {
      deletedAt: null,
      NOT: {
        entryDate: {
          // Match entries where time is not 00:00:00.000
          in: await prisma.$queryRaw`
            SELECT id FROM "FieldProgressEntry"
            WHERE "deletedAt" IS NULL
            AND EXTRACT(HOUR FROM "entryDate" AT TIME ZONE 'UTC') = 0
            AND EXTRACT(MINUTE FROM "entryDate" AT TIME ZONE 'UTC') = 0
            AND EXTRACT(SECOND FROM "entryDate" AT TIME ZONE 'UTC') = 0
          `,
        },
      },
    },
    include: {
      item: {
        select: { id: true },
      },
    },
  });

  console.log(`Found ${tzIssues.length} entries with timezone issues`);

  const fixes: TimezoneFix[] = [];

  for (const entry of tzIssues) {
    // Proposed fix: add 7 hours to normalize to next day UTC midnight
    const proposed = new Date(entry.entryDate);
    proposed.setUTCHours(proposed.getUTCHours() + 7);
    proposed.setUTCHours(0, 0, 0, 0); // Set to midnight

    // Check for conflicts: are there other active entries for this item on proposed date?
    const conflictCount = await prisma.fieldProgressEntry.count({
      where: {
        itemId: entry.itemId,
        deletedAt: null,
        id: { not: entry.id },
        entryDate: {
          gte: new Date(proposed.toISOString().split("T")[0] + "T00:00:00.000Z"),
          lt: new Date(
            new Date(proposed).setUTCDate(proposed.getUTCDate() + 1)
          ),
        },
      },
    });

    const hasConflict = conflictCount > 0;
    if (hasConflict) {
      console.log(`⚠️  Conflict detected for entry ${entry.id}`);
    }

    // Get conflict entry ID if exists
    const conflict = hasConflict
      ? await prisma.fieldProgressEntry.findFirst({
          where: {
            itemId: entry.itemId,
            deletedAt: null,
            id: { not: entry.id },
            entryDate: {
              gte: new Date(
                proposed.toISOString().split("T")[0] + "T00:00:00.000Z"
              ),
              lt: new Date(
                new Date(proposed).setUTCDate(proposed.getUTCDate() + 1)
              ),
            },
          },
          select: { id: true },
        })
      : null;

    fixes.push({
      entryId: entry.id,
      itemId: entry.itemId,
      oldEntryDate: entry.entryDate,
      proposedEntryDate: proposed,
      status: entry.status,
      hasConflict,
      conflictEntryId: conflict?.id,
    });
  }

  console.log(
    `✅ Timezone analysis complete: ${fixes.length} entries, ${fixes.filter((f) => f.hasConflict).length} conflicts`
  );
  return fixes;
}

async function analyzeOrphanFixes(): Promise<OrphanFix[]> {
  console.log("\n🔍 ANALYZING ORPHAN FIXES...");

  // Find all entries referencing soft-deleted items
  const orphans = await prisma.fieldProgressEntry.findMany({
    where: {
      deletedAt: null,
      item: {
        deletedAt: { not: null },
      },
    },
    include: {
      item: {
        select: {
          id: true,
          deletedAt: true,
        },
      },
    },
  });

  console.log(`Found ${orphans.length} orphan entries`);

  const fixes: OrphanFix[] = orphans.map((entry) => ({
    entryId: entry.id,
    itemId: entry.itemId,
    entryDate: entry.entryDate,
    status: entry.status,
    itemDeletedAt: entry.item?.deletedAt || null,
    proposedAction:
      entry.status === "DRAFT" ? "SOFT_DELETE_ENTRY" : "MANUAL_REVIEW_REQUIRED",
    reason:
      entry.status === "DRAFT"
        ? "Entry is DRAFT and item is deleted - safe to soft delete"
        : `Entry is ${entry.status} but item is deleted - requires manual review`,
  }));

  console.log(
    `✅ Orphan analysis complete: ${fixes.length} entries, ${fixes.filter((f) => f.proposedAction === "SOFT_DELETE_ENTRY").length} can auto-soft-delete`
  );
  return fixes;
}

async function analyzeVolumeFixes(): Promise<VolumeFix[]> {
  console.log("\n🔍 ANALYZING VOLUME EXCEEDING FIXES...");

  // Find all items with volume issues
  const items = await prisma.fieldProgressItem.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      entries: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          quantity: true,
          status: true,
        },
      },
    },
  });

  const volumeFixes: VolumeFix[] = [];

  for (const item of items) {
    const designQty = item.designQuantity
      ? Number(item.designQuantity)
      : undefined;
    if (!designQty) continue;

    const approvedTotal = item.entries
      .filter((e) => e.status === "APPROVED")
      .reduce((sum, e) => sum + Number(e.quantity || 0), 0);

    const allTotal = item.entries.reduce(
      (sum, e) => sum + Number(e.quantity || 0),
      0
    );

    const percentOfDesign = (allTotal / designQty) * 100;

    // Check if exceeds 110%
    if (percentOfDesign > 110) {
      volumeFixes.push({
        itemId: item.id,
        designQuantity: designQty,
        approvedTotal,
        allStatusTotal: allTotal,
        percentOfDesign: Math.round(percentOfDesign * 100) / 100,
        proposedAction:
          approvedTotal === 0
            ? "USER_REVIEW_REQUIRED_BEFORE_SUBMIT"
            : "ESCALATE_TO_MANAGER",
      });
    }
  }

  console.log(`✅ Volume analysis complete: ${volumeFixes.length} items exceed design`);
  return volumeFixes;
}

async function checkApprovedAffected(
  tzFixes: TimezoneFix[],
  orphanFixes: OrphanFix[]
): Promise<{
  approvedTzFixes: number;
  approvedOrphans: number;
}> {
  const approvedTzCount = tzFixes.filter(
    (f) => f.status === "APPROVED"
  ).length;
  const approvedOrphanCount = orphanFixes.filter(
    (f) => f.status === "APPROVED"
  ).length;

  return {
    approvedTzFixes: approvedTzCount,
    approvedOrphans: approvedOrphanCount,
  };
}

async function main() {
  console.log("📊 PHASE 3.1A - DRY-RUN MIGRATION ANALYSIS");
  console.log("=========================================");
  console.log("⚠️  READ-ONLY ANALYSIS - NO DATA MUTATIONS");
  console.log("=========================================\n");

  try {
    const tzFixes = await analyzeTzFixes();
    const orphanFixes = await analyzeOrphanFixes();
    const volumeFixes = await analyzeVolumeFixes();
    const approvedAffected = await checkApprovedAffected(tzFixes, orphanFixes);

    // Print timezone table
    console.log("\n📋 TIMEZONE FIXES TABLE");
    console.log("========================================");
    console.table(
      tzFixes.map((f) => ({
        entryId: f.entryId.slice(0, 8) + "...",
        itemId: f.itemId.slice(0, 8) + "...",
        oldDate: f.oldEntryDate.toISOString().split("T")[0],
        oldTime: f.oldEntryDate.toISOString().split("T")[1],
        proposedDate: f.proposedEntryDate.toISOString().split("T")[0],
        status: f.status,
        conflict: f.hasConflict ? "⚠️ YES" : "✅ NO",
      }))
    );

    // Print orphan table
    console.log("\n📋 ORPHAN ENTRIES TABLE");
    console.log("========================================");
    console.table(
      orphanFixes.map((f) => ({
        entryId: f.entryId.slice(0, 8) + "...",
        itemId: f.itemId.slice(0, 8) + "...",
        date: f.entryDate.toISOString().split("T")[0],
        status: f.status,
        proposedAction: f.proposedAction,
      }))
    );

    // Print volume table
    console.log("\n📋 VOLUME EXCEEDING TABLE");
    console.log("========================================");
    console.table(
      volumeFixes.map((f) => ({
        itemId: f.itemId.slice(0, 8) + "...",
        design: f.designQuantity,
        approved: f.approvedTotal,
        allStatus: f.allStatusTotal,
        percent: f.percentOfDesign + "%",
        action: f.proposedAction,
      }))
    );

    // Risk assessment
    console.log("\n⚠️  RISK ASSESSMENT");
    console.log("========================================");
    console.log(`Timezone fixes with conflicts: ${tzFixes.filter((f) => f.hasConflict).length}`);
    console.log(`APPROVED entries affected by tz fix: ${approvedAffected.approvedTzFixes}`);
    console.log(`Orphan APPROVED entries: ${approvedAffected.approvedOrphans}`);
    console.log(`Non-DRAFT orphans: ${orphanFixes.filter((f) => f.status !== "DRAFT").length}`);

    // Summary
    console.log("\n📊 PHASE 3.1A SUMMARY");
    console.log("========================================");
    console.log(`✅ Timezone entries to fix: ${tzFixes.length}`);
    console.log(
      `  ├─ With conflicts: ${tzFixes.filter((f) => f.hasConflict).length}`
    );
    console.log(
      `  └─ Can auto-fix: ${tzFixes.filter((f) => !f.hasConflict).length}`
    );
    console.log(`✅ Orphan entries to handle: ${orphanFixes.length}`);
    console.log(
      `  ├─ SOFT_DELETE_ENTRY: ${orphanFixes.filter((f) => f.proposedAction === "SOFT_DELETE_ENTRY").length}`
    );
    console.log(
      `  └─ MANUAL_REVIEW: ${orphanFixes.filter((f) => f.proposedAction === "MANUAL_REVIEW_REQUIRED").length}`
    );
    console.log(`✅ Volume items to review: ${volumeFixes.length}`);
    console.log(`  └─ Needing user review: ${volumeFixes.filter((f) => f.proposedAction === "USER_REVIEW_REQUIRED_BEFORE_SUBMIT").length}`);

    console.log("\n✅ DRY-RUN ANALYSIS COMPLETE - NO DATA MODIFIED");
    process.exit(0);
  } catch (error) {
    console.error("❌ Dry-run analysis failed:", error);
    process.exit(1);
  }
}

main();
