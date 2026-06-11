import prisma from "@/lib/prisma";
import { formatWorkDate } from "@/lib/date/work-date";

interface DuplicateEntry {
  templateId: string;
  itemId: string;
  entryDate: Date;
  count: number;
  statuses: string[];
  totalQuantity: number;
  ids: string[];
}

interface TimezoneMismatch {
  id: string;
  itemId: string;
  entryDate: Date;
  entryDateRaw: string;
  hasTimeComponent: boolean;
  status: string;
}

interface OrphanEntry {
  id: string;
  itemId: string;
  templateId: string;
  projectId: string;
  entryDate: Date;
  type: string;
  detail: string;
}

interface VolumeIssue {
  itemId: string;
  projectId: string;
  templateId: string;
  designQuantity: number | null;
  approvedTotal: number;
  allStatusTotal: number;
  entryCount: number;
  status: string;
}

async function auditDuplicates(): Promise<DuplicateEntry[]> {
  console.log("🔍 Auditing duplicates by itemId + entryDate...");
  
  const entries = await prisma.fieldProgressEntry.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      itemId: true,
      templateId: true,
      entryDate: true,
      quantity: true,
      status: true,
    },
    orderBy: [
      { templateId: 'asc' },
      { itemId: 'asc' },
      { entryDate: 'asc' },
    ],
  });

  const grouped = new Map<string, DuplicateEntry>();
  
  for (const entry of entries) {
    const key = `${entry.templateId}|${entry.itemId}|${entry.entryDate.toISOString()}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        templateId: entry.templateId,
        itemId: entry.itemId,
        entryDate: entry.entryDate,
        count: 0,
        statuses: [],
        totalQuantity: 0,
        ids: [],
      });
    }
    
    const dup = grouped.get(key)!;
    dup.count++;
    dup.totalQuantity += Number(entry.quantity);
    if (!dup.statuses.includes(entry.status)) {
      dup.statuses.push(entry.status);
    }
    dup.ids.push(entry.id);
  }

  const duplicates = Array.from(grouped.values()).filter(d => d.count > 1);
  console.log(`✅ Found ${duplicates.length} duplicate groups`);
  return duplicates;
}

async function auditTimezone(): Promise<TimezoneMismatch[]> {
  console.log("🔍 Auditing timezone issues...");
  
  const entries = await prisma.fieldProgressEntry.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      itemId: true,
      entryDate: true,
      status: true,
    },
  });

  const mismatches: TimezoneMismatch[] = [];
  
  for (const entry of entries) {
    const date = entry.entryDate;
    const hasTimeComponent = !(
      date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0 &&
      date.getUTCMilliseconds() === 0
    );
    
    if (hasTimeComponent) {
      mismatches.push({
        id: entry.id,
        itemId: entry.itemId,
        entryDate: date,
        entryDateRaw: date.toISOString(),
        hasTimeComponent,
        status: entry.status,
      });
    }
  }

  console.log(`✅ Found ${mismatches.length} entries with timezone issues`);
  return mismatches;
}

async function auditOrphanData(): Promise<OrphanEntry[]> {
  console.log("🔍 Auditing orphan data...");
  
  const orphans: OrphanEntry[] = [];
  
  // Check for entries with non-existent itemId
  const entriesWithNoItem = await prisma.fieldProgressEntry.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      itemId: true,
      templateId: true,
      projectId: true,
      entryDate: true,
    },
  });

  for (const entry of entriesWithNoItem) {
    const item = await prisma.fieldProgressItem.findUnique({
      where: { id: entry.itemId },
    });
    
    if (!item) {
      orphans.push({
        id: entry.id,
        itemId: entry.itemId,
        templateId: entry.templateId,
        projectId: entry.projectId,
        entryDate: entry.entryDate,
        type: "NO_ITEM",
        detail: `Item ${entry.itemId} does not exist`,
      });
    } else if (item.deletedAt) {
      orphans.push({
        id: entry.id,
        itemId: entry.itemId,
        templateId: entry.templateId,
        projectId: entry.projectId,
        entryDate: entry.entryDate,
        type: "DELETED_ITEM",
        detail: `Item ${entry.itemId} is soft-deleted`,
      });
    }
  }

  // Check for entries with non-existent templateId
  const entriesWithNoTemplate = await prisma.fieldProgressEntry.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      itemId: true,
      templateId: true,
      projectId: true,
      entryDate: true,
    },
  });

  for (const entry of entriesWithNoTemplate) {
    const template = await prisma.fieldProgressTemplate.findUnique({
      where: { id: entry.templateId },
    });
    
    if (!template) {
      orphans.push({
        id: entry.id,
        itemId: entry.itemId,
        templateId: entry.templateId,
        projectId: entry.projectId,
        entryDate: entry.entryDate,
        type: "NO_TEMPLATE",
        detail: `Template ${entry.templateId} does not exist`,
      });
    }
  }

  console.log(`✅ Found ${orphans.length} orphan entries`);
  return orphans;
}

async function auditVolumeExceeding(): Promise<VolumeIssue[]> {
  console.log("🔍 Auditing volume exceeding designQuantity...");
  
  const issues: VolumeIssue[] = [];
  
  const items = await prisma.fieldProgressItem.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      projectId: true,
      templateId: true,
      designQuantity: true,
    },
  });

  for (const item of items) {
    if (!item.designQuantity) continue;

    const entries = await prisma.fieldProgressEntry.findMany({
      where: {
        itemId: item.id,
        deletedAt: null,
      },
      select: {
        quantity: true,
        status: true,
      },
    });

    const approvedTotal = entries
      .filter(e => e.status === 'APPROVED')
      .reduce((sum, e) => sum + Number(e.quantity), 0);

    const allStatusTotal = entries.reduce((sum, e) => sum + Number(e.quantity), 0);

    if (approvedTotal > Number(item.designQuantity)) {
      issues.push({
        itemId: item.id,
        projectId: item.projectId,
        templateId: item.templateId,
        designQuantity: Number(item.designQuantity),
        approvedTotal: approvedTotal,
        allStatusTotal: allStatusTotal,
        entryCount: entries.length,
        status: 'APPROVED_EXCEEDS',
      });
    }

    if (allStatusTotal > Number(item.designQuantity) * 1.1) { // Allow 10% buffer for draft/submitted
      issues.push({
        itemId: item.id,
        projectId: item.projectId,
        templateId: item.templateId,
        designQuantity: Number(item.designQuantity),
        approvedTotal: approvedTotal,
        allStatusTotal: allStatusTotal,
        entryCount: entries.length,
        status: 'ALL_STATUS_EXCEEDS_10PCT',
      });
    }
  }

  console.log(`✅ Found ${issues.length} volume issues`);
  return issues;
}

async function main() {
  console.log("📊 FIELD PROGRESS DATABASE AUDIT\n");
  console.log("⏱️  Start time:", new Date().toISOString());
  console.log("-----------------------------------\n");

  try {
    const duplicates = await auditDuplicates();
    const timezone = await auditTimezone();
    const orphans = await auditOrphanData();
    const volumes = await auditVolumeExceeding();

    console.log("\n-----------------------------------");
    console.log("📋 AUDIT RESULTS\n");

    console.log("1️⃣  Duplicates by itemId+entryDate:");
    if (duplicates.length === 0) {
      console.log("   ✅ No duplicates found");
    } else {
      duplicates.forEach(dup => {
        console.log(`   ❌ Template: ${dup.templateId}, Item: ${dup.itemId}`);
        console.log(`      Date: ${formatWorkDate(dup.entryDate)}, Count: ${dup.count}`);
        console.log(`      Statuses: ${dup.statuses.join(', ')}`);
        console.log(`      Total Qty: ${dup.totalQuantity}, IDs: ${dup.ids.join(', ')}`);
      });
    }

    console.log("\n2️⃣  Timezone mismatches:");
    if (timezone.length === 0) {
      console.log("   ✅ No timezone issues found");
    } else {
      const grouped = new Map<string, number>();
      timezone.forEach(tz => {
        const hours = tz.entryDate.getUTCHours();
        const mins = tz.entryDate.getUTCMinutes();
        const key = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        grouped.set(key, (grouped.get(key) || 0) + 1);
      });
      grouped.forEach((count, time) => {
        console.log(`   ❌ Time ${time}:00Z: ${count} entries`);
      });
    }

    console.log("\n3️⃣  Orphan entries:");
    if (orphans.length === 0) {
      console.log("   ✅ No orphan entries found");
    } else {
      orphans.forEach(orphan => {
        console.log(`   ❌ ${orphan.type}: ${orphan.detail}`);
      });
    }

    console.log("\n4️⃣  Volume exceeding:");
    if (volumes.length === 0) {
      console.log("   ✅ No volume issues found");
    } else {
      volumes.forEach(vol => {
        console.log(`   ❌ Item: ${vol.itemId}, Status: ${vol.status}`);
        console.log(`      Design: ${vol.designQuantity}, Approved: ${vol.approvedTotal}, All: ${vol.allStatusTotal}`);
      });
    }

    console.log("\n-----------------------------------");
    console.log("✨ Audit completed at", new Date().toISOString());

    // Export summary
    const summary = {
      timestamp: new Date().toISOString(),
      totals: {
        duplicateGroups: duplicates.length,
        timezoneIssues: timezone.length,
        orphanEntries: orphans.length,
        volumeIssues: volumes.length,
      },
      details: {
        duplicates,
        timezone,
        orphans,
        volumes,
      },
    };

    console.log("\n📥 Detailed results saved to: qa-field-progress-db-audit-report.json");
    console.log(JSON.stringify(summary, null, 2));

  } catch (error) {
    console.error("❌ Audit failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
