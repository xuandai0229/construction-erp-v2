/**
 * PHASE 3.2A - ACTIVE DATABASE HARDENING AUDIT SCRIPT
 * Read-only audit of FieldProgressEntry data.
 * Fixes:
 * - Removed `_gt` Prisma errors (using in-memory groupBy).
 * - Fixed Timezone offset false positives (using getUTC* memory check).
 * - Separated Active vs Soft-deleted data completely.
 */

import prisma from "@/lib/prisma";
import { formatWorkDate } from "@/lib/date/work-date";
import fs from "fs";
import path from "path";

async function main() {
  try {
    console.log("📋 PHASE 3.2A - OFFICIAL ACTIVE DB AUDIT\n");

    const allEntries = await prisma.fieldProgressEntry.findMany({
      include: {
        item: { select: { id: true, workContent: true, code: true, deletedAt: true } },
        createdBy: { select: { email: true } },
      },
    });

    const activeEntries = allEntries.filter((e) => e.deletedAt === null);
    const sdEntries = allEntries.filter((e) => e.deletedAt !== null);

    console.log(`Total Entries: ${allEntries.length} (Active: ${activeEntries.length}, Soft-Deleted: ${sdEntries.length})\n`);

    // ==========================================
    // 1. ACTIVE AUDIT (deletedAt IS NULL)
    // ==========================================

    // 1.1 Active Duplicates
    const activeItemDateGroups: Record<string, typeof activeEntries> = {};
    activeEntries.forEach((entry) => {
      const key = `${entry.itemId}_${entry.entryDate.toISOString()}`;
      if (!activeItemDateGroups[key]) activeItemDateGroups[key] = [];
      activeItemDateGroups[key].push(entry);
    });

    const activeDuplicates = Object.values(activeItemDateGroups)
      .filter((group) => group.length > 1)
      .map((group) => {
        const first = group[0];
        return {
          itemId: first.itemId,
          entryDate: first.entryDate.toISOString(),
          workDate: formatWorkDate(first.entryDate),
          count: group.length,
          totalQuantity: group.reduce((sum, e) => sum + Number(e.quantity), 0),
          statuses: group.map((e) => e.status),
          ids: group.map((e) => e.id),
        };
      });

    // 1.2 Active Timezone Issues
    const activeTimezoneIssues = activeEntries
      .filter((e) => {
        const d = e.entryDate;
        return d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0 || d.getUTCMilliseconds() !== 0;
      })
      .map((e) => ({
        id: e.id,
        entryDate: e.entryDate.toISOString(),
        issue: "Entry not at UTC midnight",
      }));

    // 1.3 Active Orphan Data
    const activeOrphans = activeEntries
      .filter((e) => e.item?.deletedAt !== null)
      .map((e) => ({
        entryId: e.id,
        itemId: e.itemId,
        status: e.status,
      }));

    // 1.4 Active Over-Quantity
    const activeItems = await prisma.fieldProgressItem.findMany({
      where: { deletedAt: null, designQuantity: { not: null } },
      include: {
        entries: {
          where: { deletedAt: null },
        },
      },
    });

    const activeOverVolumeIssues: any[] = [];
    let activeApprovedOverDesignCount = 0;

    for (const item of activeItems) {
      const designQty = Number(item.designQuantity);
      const approved = item.entries
        .filter((e) => e.status === "APPROVED")
        .reduce((sum, e) => sum + Number(e.quantity), 0);
      const allStatus = item.entries.reduce((sum, e) => sum + Number(e.quantity), 0);

      if (approved > designQty) {
        activeApprovedOverDesignCount++;
      }

      if (allStatus > designQty * 1.1) {
        activeOverVolumeIssues.push({
          itemId: item.id,
          workContent: item.workContent,
          designQuantity: designQty,
          approvedTotal: approved,
          allStatusTotal: allStatus,
          overage: allStatus - designQty,
        });
      }
    }

    // 1.5 Active Zero/Negative Quantity
    const activeZeroNegative = activeEntries
      .filter((e) => Number(e.quantity) <= 0)
      .map((e) => ({
        entryId: e.id,
        quantity: Number(e.quantity),
      }));

    // ==========================================
    // 2. SOFT-DELETED REFERENCE AUDIT
    // ==========================================

    const allItemDateGroups: Record<string, typeof allEntries> = {};
    allEntries.forEach((entry) => {
      const key = `${entry.itemId}_${entry.entryDate.toISOString()}`;
      if (!allItemDateGroups[key]) allItemDateGroups[key] = [];
      allItemDateGroups[key].push(entry);
    });

    const sdDuplicateRemnants = sdEntries.filter((e) => {
      const key = `${e.itemId}_${e.entryDate.toISOString()}`;
      return allItemDateGroups[key].length > 1;
    });

    const sdTimezoneIssues = sdEntries.filter((e) => {
      const d = e.entryDate;
      return d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0 || d.getUTCMilliseconds() !== 0;
    });

    const sdOrphanDrafts = sdEntries.filter((e) => e.item?.deletedAt !== null && e.status === "DRAFT");
    const sdVolumeTestEntries = sdEntries.filter((e) => Number(e.quantity) >= 1000);

    // ==========================================
    // 3. COMPILE & SAVE REPORT
    // ==========================================

    const report = {
      summary: {
        totalEntries: activeEntries.length,
        duplicatesByItemDate: activeDuplicates.length,
        timezoneIssues: activeTimezoneIssues.length,
        orphanEntries: activeOrphans.length,
        overQuantityIssues: activeOverVolumeIssues.length,
        hasConstraintConflicts: activeDuplicates.length > 0,
      },
      activeAudit: {
        duplicates: activeDuplicates,
        timezoneIssues: activeTimezoneIssues,
        orphans: activeOrphans,
        overVolume: activeOverVolumeIssues,
        zeroNegativeQuantity: activeZeroNegative,
      },
      softDeletedHistoricalFindings: {
        duplicateRemnantsCount: sdDuplicateRemnants.length,
        timezoneIssuesCount: sdTimezoneIssues.length,
        orphanDraftsCount: sdOrphanDrafts.length,
        volumeTestEntriesCount: sdVolumeTestEntries.length,
      },
    };

    const reportPath = path.join(process.cwd(), "scripts", "qa-field-progress-db-audit-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Audit report saved to: ${reportPath}`);

    // ==========================================
    // 4. PRINT SUMMARY
    // ==========================================

    console.log("\n=== 1. ACTIVE AUDIT (deletedAt IS NULL) ===");
    console.log(`| Nhóm | Count |`);
    console.log(`|---|---:|`);
    console.log(`| Active duplicate itemId + entryDate | ${activeDuplicates.length} |`);
    console.log(`| Active timezone issues | ${activeTimezoneIssues.length} |`);
    console.log(`| Active orphan entries | ${activeOrphans.length} |`);
    console.log(`| Active over-volume items | ${activeOverVolumeIssues.length} |`);
    console.log(`| Active approved over design | ${activeApprovedOverDesignCount} |`);
    console.log(`| Active zero/negative quantity | ${activeZeroNegative.length} |`);

    console.log("\n=== 2. SOFT-DELETED REFERENCE AUDIT (deletedAt IS NOT NULL) ===");
    console.log(`| Nhóm | Count |`);
    console.log(`|---|---:|`);
    console.log(`| Soft-deleted duplicate remnants | ${sdDuplicateRemnants.length} |`);
    console.log(`| Soft-deleted timezone entries | ${sdTimezoneIssues.length} |`);
    console.log(`| Soft-deleted orphan DRAFT | ${sdOrphanDrafts.length} |`);
    console.log(`| Soft-deleted volume test entries | ${sdVolumeTestEntries.length} |`);

    if (activeDuplicates.length > 0) {
      console.log("\n⚠️ ACTIVE DUPLICATES FOUND:");
      activeDuplicates.slice(0, 5).forEach((dup) => {
        console.log(`   - Item: ${dup.itemId.substring(0, 8)}..., Date: ${dup.workDate}, Count: ${dup.count}, Qty: ${dup.totalQuantity}`);
      });
    }

  } catch (error) {
    console.error("❌ Audit error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
