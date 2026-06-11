/**
 * PHASE 3.0 - DATABASE HARDENING AUDIT SCRIPT
 * Read-only audit of FieldProgressEntry data for:
 * 1. Duplicates by itemId + entryDate
 * 2. Timezone data issues
 * 3. Orphan data
 * 4. Over-quantity entries
 * 5. Schema compliance
 */

import prisma from "@/lib/prisma";
import { formatWorkDate } from "@/lib/date/work-date";
import fs from "fs";
import path from "path";

interface AuditReport {
  summary: {
    totalEntries: number;
    duplicatesByItemDate: number;
    timezoneIssues: number;
    orphanEntries: number;
    overQuantityIssues: number;
    hasConstraintConflicts: boolean;
  };
  duplicates: {
    byItemDate: any[];
    byItemDateStatus: any[];
  };
  timezone: {
    badTimezonEntries: any[];
  };
  orphan: {
    orphanItems: any[];
    deletedItems: any[];
    orphanTemplates: any[];
    orphanProjects: any[];
    invalidQuantities: any[];
  };
  overQuantity: {
    issues: any[];
  };
  schemaAnalysis: {
    fieldProgressEntryFields: any;
    fieldProgressItemFields: any;
    hasConstructionCrew: boolean;
    hasCrewId: boolean;
    hasWorkShift: boolean;
    hasLocation: boolean;
  };
  codeAnalysis: {
    savePath: string;
    lookupStrategy: string;
    transactionUsed: boolean;
    auditLogUsed: boolean;
  };
}

async function auditDuplicatesByItemDate() {
  console.log("🔍 Checking duplicates by itemId + entryDate...");
  
  const duplicates = await prisma.fieldProgressEntry.groupBy({
    by: ["templateId", "itemId", "entryDate"],
    _count: true,
    having: {
      id: {
        _gt: 1,
      },
    },
    orderBy: {
      entryDate: "desc",
    },
  });

  const detailed = await Promise.all(
    duplicates.map(async (dup) => {
      const entries = await prisma.fieldProgressEntry.findMany({
        where: {
          templateId: dup.templateId,
          itemId: dup.itemId,
          entryDate: dup.entryDate,
        },
        include: {
          item: { select: { workContent: true, code: true } },
          createdBy: { select: { email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        templateId: dup.templateId,
        itemId: dup.itemId,
        entryDate: dup.entryDate,
        workDate: formatWorkDate(dup.entryDate),
        count: dup._count,
        workContent: entries[0]?.item?.workContent,
        itemCode: entries[0]?.item?.code,
        statuses: entries.map((e) => e.status),
        quantities: entries.map((e) => Number(e.quantity)),
        totalQuantity: entries.reduce((sum, e) => sum + Number(e.quantity), 0),
        ids: entries.map((e) => e.id),
        createdBys: entries.map((e) => e.createdBy?.email),
        note: entries.length > 0 ? `Last entry: ${entries[0].id.substring(0, 8)}...` : "",
      };
    })
  );

  return detailed;
}

async function auditDuplicatesByItemDateStatus() {
  console.log("🔍 Checking duplicates by itemId + entryDate + status...");
  
  const duplicates = await prisma.fieldProgressEntry.groupBy({
    by: ["templateId", "itemId", "entryDate", "status"],
    _count: true,
    having: {
      id: {
        _gt: 1,
      },
    },
  });

  const detailed = await Promise.all(
    duplicates.map(async (dup) => {
      const entries = await prisma.fieldProgressEntry.findMany({
        where: {
          templateId: dup.templateId,
          itemId: dup.itemId,
          entryDate: dup.entryDate,
          status: dup.status,
        },
      });

      return {
        templateId: dup.templateId,
        itemId: dup.itemId,
        entryDate: formatWorkDate(dup.entryDate),
        status: dup.status,
        count: dup._count,
        totalQuantity: entries.reduce((sum, e) => sum + Number(e.quantity), 0),
        ids: entries.map((e) => e.id.substring(0, 8)),
      };
    })
  );

  return detailed;
}

async function auditTimezoneIssues() {
  console.log("🌍 Checking for timezone issues...");
  
  const allEntries = await prisma.fieldProgressEntry.findMany({
    select: {
      id: true,
      entryDate: true,
      itemId: true,
      status: true,
      item: { select: { workContent: true } },
    },
  });

  const badEntries = allEntries.filter((e) => {
    const date = e.entryDate;
    // Check if not UTC midnight (00:00:00.000Z)
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    const ms = date.getUTCMilliseconds();

    return hours !== 0 || minutes !== 0 || seconds !== 0 || ms !== 0;
  });

  const detailed = badEntries.map((e) => ({
    id: e.id,
    entryDate: e.entryDate.toISOString(),
    entryDateLocal: e.entryDate.toLocaleString("vi-VN"),
    workDate: formatWorkDate(e.entryDate),
    itemId: e.itemId,
    workContent: e.item?.workContent,
    status: e.status,
    issue: "Entry not at UTC midnight (00:00:00.000Z)",
  }));

  return detailed;
}

async function auditOrphanData() {
  console.log("🔗 Checking for orphan data...");
  
  const orphanItems: any[] = [];
  const deletedItems: any[] = [];
  const orphanTemplates: any[] = [];
  const orphanProjects: any[] = [];
  const invalidQuantities: any[] = [];

  // Check entries with non-existent items
  const allEntries = await prisma.fieldProgressEntry.findMany({
    select: { id: true, itemId: true, templateId: true, projectId: true, quantity: true },
  });

  for (const entry of allEntries) {
    const item = await prisma.fieldProgressItem.findUnique({
      where: { id: entry.itemId },
      select: { id: true, deletedAt: true },
    });

    if (!item) {
      orphanItems.push({
        entryId: entry.id,
        itemId: entry.itemId,
        issue: "Item does not exist",
      });
    } else if (item.deletedAt) {
      deletedItems.push({
        entryId: entry.id,
        itemId: entry.itemId,
        issue: "Item is soft-deleted",
      });
    }

    const template = await prisma.fieldProgressTemplate.findUnique({
      where: { id: entry.templateId },
    });

    if (!template) {
      orphanTemplates.push({
        entryId: entry.id,
        templateId: entry.templateId,
        issue: "Template does not exist",
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: entry.projectId },
    });

    if (!project) {
      orphanProjects.push({
        entryId: entry.id,
        projectId: entry.projectId,
        issue: "Project does not exist",
      });
    }

    // Check invalid quantities
    const qty = Number(entry.quantity);
    if (qty < 0 || qty === 0) {
      invalidQuantities.push({
        entryId: entry.id,
        quantity: qty,
        issue: qty < 0 ? "Negative quantity" : "Zero quantity",
      });
    }
  }

  return {
    orphanItems,
    deletedItems,
    orphanTemplates,
    orphanProjects,
    invalidQuantities,
  };
}

async function auditOverQuantity() {
  console.log("📊 Checking for over-quantity entries...");
  
  const issues: any[] = [];

  // Get all items with designQuantity
  const items = await prisma.fieldProgressItem.findMany({
    where: {
      designQuantity: { not: null },
    },
    select: {
      id: true,
      code: true,
      workContent: true,
      designQuantity: true,
      entries: {
        select: {
          quantity: true,
          status: true,
        },
      },
    },
  });

  for (const item of items) {
    const designQty = Number(item.designQuantity);
    
    // Sum by status
    const approved = item.entries
      .filter((e) => e.status === "APPROVED")
      .reduce((sum, e) => sum + Number(e.quantity), 0);

    const allStatus = item.entries.reduce((sum, e) => sum + Number(e.quantity), 0);

    if (approved > designQty) {
      issues.push({
        itemId: item.id,
        itemCode: item.code,
        workContent: item.workContent,
        designQuantity: designQty,
        approvedTotal: approved,
        allStatusTotal: allStatus,
        status: "⚠️ APPROVED exceeds design",
        overage: approved - designQty,
      });
    }

    if (allStatus > designQty * 1.1) {
      // Warn if total is 10% over design
      issues.push({
        itemId: item.id,
        itemCode: item.code,
        workContent: item.workContent,
        designQuantity: designQty,
        approvedTotal: approved,
        allStatusTotal: allStatus,
        status: "⚠️ All statuses exceed design by 10%",
        overage: allStatus - designQty,
      });
    }
  }

  return issues;
}

function getSchemaAnalysis() {
  return {
    fieldProgressEntryFields: [
      "id (String, required)",
      "projectId (String, required)",
      "templateId (String, required)",
      "itemId (String, required)",
      "entryDate (DateTime, required)",
      "quantity (Decimal, required)",
      "issueNote (String, optional)",
      "proposalNote (String, optional)",
      "note (String, optional)",
      "status (FieldProgressEntryStatus, default DRAFT)",
      "createdById (String, required)",
      "submittedAt (DateTime, optional)",
      "approvedById (String, optional)",
      "approvedAt (DateTime, optional)",
      "rejectedReason (String, optional)",
      "createdAt (DateTime, default now)",
      "updatedAt (DateTime, updated)",
      "deletedAt (DateTime, optional)",
    ],
    fieldProgressItemFields: [
      "id (String, required)",
      "projectId (String, required)",
      "templateId (String, required)",
      "parentId (String, optional)",
      "sortOrder (Int)",
      "level (Int)",
      "itemType (FieldProgressItemType)",
      "code (String, optional)",
      "categoryName (String, optional)",
      "workContent (String, optional)",
      "constructionCrew (String, optional)",
      "designQuantity (Decimal, optional)",
      "unit (String, optional)",
      "status (FieldProgressItemStatus)",
      "isLocked (Boolean)",
      "note (String, optional)",
      "createdById (String, required)",
      "createdAt (DateTime)",
      "updatedAt (DateTime)",
      "deletedAt (DateTime, optional)",
    ],
    hasConstructionCrew: true,
    hasCrewId: false,
    hasWorkShift: false,
    hasLocation: false,
    uniqueConstraints: ["None on FieldProgressEntry currently"],
    indexes: [
      "projectId",
      "templateId",
      "itemId",
      "entryDate",
    ],
  };
}

function getCodeAnalysis() {
  return {
    savePath: "src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts",
    lookupStrategy: "findMany by templateId + entryDate range [start, end)",
    transactionUsed: true,
    auditLogUsed: true,
    writePattern: "batchSaveDailyEntries()",
    details: [
      "Uses getWorkDateRange(entryDateStr) to convert to UTC [start, end)",
      "Maps existing entries by itemId to existingMap",
      "For each entry: if exists then update, else create",
      "Uses prisma.$transaction() for batch atomicity",
      "Writes AuditLog after transaction",
      "No hard unique constraint checking in code",
      "Handles DRAFT and SUBMITTED status",
      "Does NOT validate duplicate prevention at DB level",
    ],
  };
}

async function main() {
  try {
    console.log("📋 PHASE 3.0 - DATABASE HARDENING AUDIT\n");

    // Count total entries
    const totalEntries = await prisma.fieldProgressEntry.count();
    console.log(`Total FieldProgressEntry records: ${totalEntries}\n`);

    // Run all audits
    const duplicatesByItemDate = await auditDuplicatesByItemDate();
    const duplicatesByItemDateStatus = await auditDuplicatesByItemDateStatus();
    const timezoneIssues = await auditTimezoneIssues();
    const orphanData = await auditOrphanData();
    const overQuantityIssues = await auditOverQuantity();

    // Compile report
    const report: AuditReport = {
      summary: {
        totalEntries,
        duplicatesByItemDate: duplicatesByItemDate.length,
        timezoneIssues: timezoneIssues.length,
        orphanEntries: orphanData.orphanItems.length,
        overQuantityIssues: overQuantityIssues.length,
        hasConstraintConflicts: duplicatesByItemDate.length > 0,
      },
      duplicates: {
        byItemDate: duplicatesByItemDate,
        byItemDateStatus: duplicatesByItemDateStatus,
      },
      timezone: {
        badTimezonEntries: timezoneIssues,
      },
      orphan: orphanData,
      overQuantity: {
        issues: overQuantityIssues,
      },
      schemaAnalysis: getSchemaAnalysis(),
      codeAnalysis: getCodeAnalysis(),
    };

    // Save report as JSON
    const reportPath = path.join(process.cwd(), "scripts", "qa-field-progress-db-audit-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Audit report saved to: ${reportPath}`);

    // Print summary
    console.log("\n📊 AUDIT SUMMARY:");
    console.log(`  Total Entries: ${report.summary.totalEntries}`);
    console.log(`  Duplicates (item+date): ${report.summary.duplicatesByItemDate}`);
    console.log(`  Timezone Issues: ${report.summary.timezoneIssues}`);
    console.log(`  Orphan Entries: ${report.summary.orphanEntries}`);
    console.log(`  Over-Quantity Issues: ${report.summary.overQuantityIssues}`);
    console.log(
      `  Has Constraint Conflicts: ${report.summary.hasConstraintConflicts ? "⚠️ YES" : "✅ NO"}`
    );

    if (duplicatesByItemDate.length > 0) {
      console.log("\n⚠️ DUPLICATES FOUND:");
      duplicatesByItemDate.slice(0, 5).forEach((dup) => {
        console.log(
          `   - Item: ${dup.itemId.substring(0, 8)}..., Date: ${dup.workDate}, Count: ${dup.count}, Qty: ${dup.totalQuantity}`
        );
      });
      if (duplicatesByItemDate.length > 5) {
        console.log(`   ... and ${duplicatesByItemDate.length - 5} more`);
      }
    }

    if (timezoneIssues.length > 0) {
      console.log("\n🌍 TIMEZONE ISSUES FOUND:");
      timezoneIssues.slice(0, 3).forEach((issue) => {
        console.log(`   - ${issue.entryDate}`);
      });
      if (timezoneIssues.length > 3) {
        console.log(`   ... and ${timezoneIssues.length - 3} more`);
      }
    }

    return report;
  } catch (error) {
    console.error("❌ Audit error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
