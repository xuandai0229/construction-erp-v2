import prisma from "../src/lib/prisma";

function formatWorkDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function main() {
  console.log("📋 FIELD PROGRESS AUDIT RECONCILE - CURRENT ACTIVE STATE\n");

  const allEntries = await prisma.fieldProgressEntry.findMany({
    include: {
      item: { select: { id: true, workContent: true, code: true, deletedAt: true, designQuantity: true } },
    }
  });

  const activeEntries = allEntries.filter(e => e.deletedAt === null);
  const softDeletedEntries = allEntries.filter(e => e.deletedAt !== null);

  console.log(`Total Entries: ${allEntries.length} (Active: ${activeEntries.length}, Soft-deleted: ${softDeletedEntries.length})\n`);

  // --- 1. ACTIVE AUDIT ---
  console.log("=== 1. ACTIVE AUDIT (deletedAt IS NULL) ===");

  // Active Duplicates
  const activeItemDateGroups: Record<string, typeof activeEntries> = {};
  activeEntries.forEach(entry => {
    const key = `${entry.itemId}_${entry.entryDate.toISOString()}`;
    if (!activeItemDateGroups[key]) activeItemDateGroups[key] = [];
    activeItemDateGroups[key].push(entry);
  });
  const activeDuplicates = Object.values(activeItemDateGroups).filter(group => group.length > 1);

  // Active Timezone
  const activeTimezoneIssues = activeEntries.filter(e => {
    const d = e.entryDate;
    return d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0 || d.getUTCMilliseconds() !== 0;
  });

  // Active Orphans
  const activeOrphans = activeEntries.filter(e => e.item?.deletedAt !== null);

  // Active Over-Volume
  const activeItems = await prisma.fieldProgressItem.findMany({
    where: { deletedAt: null, designQuantity: { not: null } },
    include: { entries: { where: { deletedAt: null } } }
  });

  let activeOverVolumeItems = 0;
  let activeApprovedOverDesign = 0;

  activeItems.forEach(item => {
    const designQty = Number(item.designQuantity);
    const approvedTotal = item.entries.filter(e => e.status === "APPROVED").reduce((s, e) => s + Number(e.quantity), 0);
    const allTotal = item.entries.reduce((s, e) => s + Number(e.quantity), 0);
    
    if (allTotal > designQty * 1.1) activeOverVolumeItems++;
    if (approvedTotal > designQty) activeApprovedOverDesign++;
  });

  // Active Zero/Negative
  const activeZeroNegative = activeEntries.filter(e => Number(e.quantity) <= 0);

  console.log(`| Nhóm | Count |`);
  console.log(`|---|---:|`);
  console.log(`| Active duplicate itemId + entryDate | ${activeDuplicates.length} |`);
  console.log(`| Active timezone issues | ${activeTimezoneIssues.length} |`);
  console.log(`| Active orphan entries | ${activeOrphans.length} |`);
  console.log(`| Active over-volume items | ${activeOverVolumeItems} |`);
  console.log(`| Active approved over design | ${activeApprovedOverDesign} |`);
  console.log(`| Active zero/negative quantity | ${activeZeroNegative.length} |`);
  console.log("");


  // --- 2. SOFT-DELETED REFERENCE AUDIT ---
  console.log("=== 2. SOFT-DELETED REFERENCE AUDIT (deletedAt IS NOT NULL) ===");

  // Soft-deleted Timezone
  const sdTimezoneIssues = softDeletedEntries.filter(e => {
    const d = e.entryDate;
    return d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0 || d.getUTCMilliseconds() !== 0;
  });

  // Soft-deleted Duplicate Remnants
  // Find duplicates within soft-deleted data or cross-data
  const allItemDateGroups: Record<string, typeof allEntries> = {};
  allEntries.forEach(entry => {
    const key = `${entry.itemId}_${entry.entryDate.toISOString()}`;
    if (!allItemDateGroups[key]) allItemDateGroups[key] = [];
    allItemDateGroups[key].push(entry);
  });
  
  // A duplicate remnant is a soft-deleted entry that shares itemId+date with another entry
  const sdDuplicateRemnants = softDeletedEntries.filter(e => {
    const key = `${e.itemId}_${e.entryDate.toISOString()}`;
    return allItemDateGroups[key].length > 1;
  });

  // Soft-deleted Orphan DRAFT
  const sdOrphanDrafts = softDeletedEntries.filter(e => e.item?.deletedAt !== null && e.status === "DRAFT");

  // Soft-deleted Volume Test Entries (e.g. qty 1000)
  const sdVolumeTestEntries = softDeletedEntries.filter(e => Number(e.quantity) >= 1000);

  console.log(`| Nhóm | Count |`);
  console.log(`|---|---:|`);
  console.log(`| Soft-deleted timezone entries | ${sdTimezoneIssues.length} |`);
  console.log(`| Soft-deleted duplicate remnants | ${sdDuplicateRemnants.length} |`);
  console.log(`| Soft-deleted orphan DRAFT | ${sdOrphanDrafts.length} |`);
  console.log(`| Soft-deleted volume test entries | ${sdVolumeTestEntries.length} |`);
  console.log("");

}

main().catch(console.error).finally(() => prisma.$disconnect());
