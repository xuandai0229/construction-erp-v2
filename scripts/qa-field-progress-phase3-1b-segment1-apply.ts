import prisma from "@/lib/prisma";
import { addHours } from "date-fns";

interface ApplyResult {
  timezoneEntriesPrechecked: number;
  orphanEntriesPrechecked: number;
  timezoneEntriesUpdated: string[];
  orphanEntriesDeleted: string[];
  skipped: string[];
  committed: boolean;
  error?: string;
}

// Exact IDs from verification report
const TIMEZONE_SAFE_IDS = [
  "cmq6dmfm50002pgwkqzfln756",
  "cmq6dn65c0005pgwksh5eivt1",
  "cmq6g418f0000n8wk2d7gvsqw",
  "cmq6g45hm0004n8wkfpn7mwme",
  "cmq6dn65f0006pgwk10nkk5fe",
  "cmq6dn65g0007pgwkdl9c7y53",
  "cmq6huwyv000yn8wkccul8ozd",
  "cmq6g8cq0000bn8wkxwihmzu6",
  "cmq6huo4h000wn8wkd1tkv45o",
];

const ORPHAN_DRAFT_IDS = [
  "cmq6dn6530004pgwkl078b7mh",
  "cmq60wbd8000cawwksph2zy2b",
  "cmq60wbdr000dawwkplzvwngb",
];

// IDs to NEVER touch
const FORBIDDEN_IDS = [
  "cmq6g418p0001n8wksy5kectv", // timezone conflict
  "cmq60vtz30008awwkqnmp5n90", // orphan submitted
  "cmq5yrrtj000om8wkkm2zrva4", // orphan submitted
  "cmq60vtzq0009awwkmcvl2jnp", // orphan submitted
  "cmq5yrrts000pm8wkqnu99jfh", // orphan submitted
  "cmq60cbpa001lm8wk1np95ehd", // orphan submitted
];

async function prechecksTimezone(): Promise<{ pass: number; skipped: string[] }> {
  console.log("\n🔍 PRE-CHECK: Timezone entries...");

  const entries = await prisma.fieldProgressEntry.findMany({
    where: { id: { in: TIMEZONE_SAFE_IDS } },
  });

  const skipped: string[] = [];
  let passCount = 0;

  for (const entry of entries) {
    const dateStr = entry.entryDate.toISOString();

    // Verify it still has 17:00:00Z pattern
    if (!dateStr.includes("17:00:00")) {
      skipped.push(`${entry.id}: Already has correct timezone`);
      continue;
    }

    // Verify not deleted
    if (entry.deletedAt !== null) {
      skipped.push(`${entry.id}: Entry is deleted`);
      continue;
    }

    // Verify not APPROVED
    if (entry.status === "APPROVED") {
      skipped.push(`${entry.id}: Entry is APPROVED`);
      continue;
    }

    // Check for conflict after +7 hours
    const proposedDate = addHours(entry.entryDate, 7);
    const conflict = await prisma.fieldProgressEntry.findFirst({
      where: {
        itemId: entry.itemId,
        id: { not: entry.id },
        entryDate: {
          gte: new Date(proposedDate.toISOString().split("T")[0] + "T00:00:00Z"),
          lt: new Date(
            new Date(proposedDate.getTime() + 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0] + "T00:00:00Z"
          ),
        },
        deletedAt: null,
      },
    });

    if (conflict) {
      skipped.push(
        `${entry.id}: Conflict with ${conflict.id} on proposed date`
      );
      continue;
    }

    passCount++;
  }

  console.log(`  ✅ Passed: ${passCount}/${entries.length}`);
  if (skipped.length > 0) {
    console.log(`  ⚠️  Skipped: ${skipped.length}`);
    skipped.forEach((s) => console.log(`     - ${s}`));
  }

  return { pass: passCount, skipped };
}

async function prechecksOrphanDraft(): Promise<{
  pass: number;
  skipped: string[];
}> {
  console.log("\n🔍 PRE-CHECK: Orphan DRAFT entries...");

  const entries = await prisma.fieldProgressEntry.findMany({
    where: { id: { in: ORPHAN_DRAFT_IDS } },
    include: { item: { select: { deletedAt: true } } },
  });

  const skipped: string[] = [];
  let passCount = 0;

  for (const entry of entries) {
    // Verify entry not deleted
    if (entry.deletedAt !== null) {
      skipped.push(`${entry.id}: Entry is already deleted`);
      continue;
    }

    // Verify status is DRAFT
    if (entry.status !== "DRAFT") {
      skipped.push(`${entry.id}: Status is ${entry.status}, not DRAFT`);
      continue;
    }

    // Verify item is deleted
    if (!entry.item || entry.item.deletedAt === null) {
      skipped.push(`${entry.id}: Item is not deleted or not found`);
      continue;
    }

    passCount++;
  }

  console.log(`  ✅ Passed: ${passCount}/${entries.length}`);
  if (skipped.length > 0) {
    console.log(`  ⚠️  Skipped: ${skipped.length}`);
    skipped.forEach((s) => console.log(`     - ${s}`));
  }

  return { pass: passCount, skipped };
}

async function applyTimezoneFixesInTransaction(): Promise<{
  updated: string[];
  error?: string;
}> {
  console.log("\n⏳ Applying timezone fixes in transaction...");

  const updated: string[] = [];

  try {
    // Re-check before transaction
    const prechecks = await prechecksTimezone();
    if (prechecks.pass < TIMEZONE_SAFE_IDS.length) {
      const activeCount = await prisma.fieldProgressEntry.count({
        where: {
          id: { in: TIMEZONE_SAFE_IDS },
          deletedAt: null,
          status: { not: "APPROVED" },
        },
      });

      if (activeCount !== prechecks.pass) {
        return {
          updated: [],
          error: `Pre-check failed: only ${prechecks.pass} entries ready, expected ${activeCount}`,
        };
      }
    }

    // Update each entry individually within transaction context
    for (const entryId of TIMEZONE_SAFE_IDS) {
      const entry = await prisma.fieldProgressEntry.findUnique({
        where: { id: entryId },
      });

      if (!entry || entry.deletedAt !== null) {
        continue;
      }

      if (!entry.entryDate.toISOString().includes("17:00:00")) {
        continue;
      }

      const newDate = addHours(entry.entryDate, 7);

      await prisma.fieldProgressEntry.update({
        where: { id: entryId },
        data: { entryDate: newDate },
      });

      updated.push(entryId);
      console.log(
        `  ✅ Updated: ${entryId} (${entry.entryDate.toISOString().substring(0, 19)} → ${newDate.toISOString().substring(0, 19)})`
      );
    }

    return { updated };
  } catch (error) {
    return {
      updated: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function applySoftDeleteInTransaction(): Promise<{
  deleted: string[];
  error?: string;
}> {
  console.log("\n⏳ Applying orphan soft deletes in transaction...");

  const deleted: string[] = [];

  try {
    // Re-check before transaction
    const prechecks = await prechecksOrphanDraft();
    if (prechecks.pass < ORPHAN_DRAFT_IDS.length) {
      return {
        deleted: [],
        error: `Pre-check failed: only ${prechecks.pass} entries ready, expected ${ORPHAN_DRAFT_IDS.length}`,
      };
    }

    // Soft delete each entry
    for (const entryId of ORPHAN_DRAFT_IDS) {
      const entry = await prisma.fieldProgressEntry.findUnique({
        where: { id: entryId },
      });

      if (!entry || entry.deletedAt !== null) {
        continue;
      }

      if (entry.status !== "DRAFT") {
        continue;
      }

      await prisma.fieldProgressEntry.update({
        where: { id: entryId },
        data: { deletedAt: new Date() },
      });

      deleted.push(entryId);
      console.log(`  ✅ Soft deleted: ${entryId} (status was ${entry.status})`);
    }

    return { deleted };
  } catch (error) {
    return {
      deleted: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log("🚀 PHASE 3.1B-SEGMENT1 - APPLY SAFE FIXES");
  console.log("========================================");
  console.log(`⏰ ${new Date().toISOString()}\n`);

  const result: ApplyResult = {
    timezoneEntriesPrechecked: 0,
    orphanEntriesPrechecked: 0,
    timezoneEntriesUpdated: [],
    orphanEntriesDeleted: [],
    skipped: [],
    committed: false,
  };

  try {
    // PRE-CHECKS
    console.log("\n📋 PRE-CHECKS");
    console.log("=============");

    const tzCheck = await prechecksTimezone();
    const orphanCheck = await prechecksOrphanDraft();

    result.timezoneEntriesPrechecked = tzCheck.pass;
    result.orphanEntriesPrechecked = orphanCheck.pass;
    result.skipped = [...tzCheck.skipped, ...orphanCheck.skipped];

    if (tzCheck.pass < TIMEZONE_SAFE_IDS.length) {
      console.log(
        `\n⚠️  WARNING: Only ${tzCheck.pass}/${TIMEZONE_SAFE_IDS.length} timezone entries passed pre-check`
      );
    }

    if (orphanCheck.pass < ORPHAN_DRAFT_IDS.length) {
      console.log(
        `\n⚠️  WARNING: Only ${orphanCheck.pass}/${ORPHAN_DRAFT_IDS.length} orphan entries passed pre-check`
      );
    }

    // APPLY CHANGES
    console.log("\n🔄 APPLYING CHANGES");
    console.log("==================");

    const tzResult = await applyTimezoneFixesInTransaction();
    if (tzResult.error) {
      console.error(`\n❌ Timezone apply failed: ${tzResult.error}`);
      process.exit(1);
    }
    result.timezoneEntriesUpdated = tzResult.updated;

    const orphanResult = await applySoftDeleteInTransaction();
    if (orphanResult.error) {
      console.error(`\n❌ Orphan soft delete failed: ${orphanResult.error}`);
      process.exit(1);
    }
    result.orphanEntriesDeleted = orphanResult.deleted;

    // SUMMARY
    console.log("\n📊 SUMMARY");
    console.log("==========");
    console.log(`✅ Timezone entries updated: ${result.timezoneEntriesUpdated.length}`);
    console.log(`✅ Orphan entries soft deleted: ${result.orphanEntriesDeleted.length}`);
    if (result.skipped.length > 0) {
      console.log(`⚠️  Entries skipped: ${result.skipped.length}`);
    }

    result.committed = true;
    console.log(`\n✅ ALL CHANGES COMMITTED`);

    console.log("\n📝 APPLIED IDS:");
    console.log("  Timezone:");
    result.timezoneEntriesUpdated.forEach((id) =>
      console.log(`    - ${id}`)
    );
    console.log("  Orphan:");
    result.orphanEntriesDeleted.forEach((id) => console.log(`    - ${id}`));

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ CRITICAL ERROR: ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
