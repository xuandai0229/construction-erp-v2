import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';

export interface CleanupResult {
  dryRun: boolean;
  success: boolean;
  manifestLoaded: boolean;
  matched: {
    templates: number;
    items: number;
    reports: number;
    lines: number;
    entries: number;
  };
  deleted: {
    templates: number;
    items: number;
    reports: number;
    lines: number;
    entries: number;
  };
  unexpectedRecords: number;
  errors: string[];
}

export async function runCleanup(options: { dryRun?: boolean } = { dryRun: true }): Promise<CleanupResult> {
  const isDryRun = options.dryRun !== false;
  const manifestPath = path.resolve('d:/construction-erp-v2/scripts/qa/fixtures/ai01b-synthetic-dataset-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file not found at: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const { default: prisma } = await import('../../src/lib/prisma');

  const result: CleanupResult = {
    dryRun: isDryRun,
    success: false,
    manifestLoaded: true,
    matched: { templates: 0, items: 0, reports: 0, lines: 0, entries: 0 },
    deleted: { templates: 0, items: 0, reports: 0, lines: 0, entries: 0 },
    unexpectedRecords: 0,
    errors: [],
  };

  const expectedTemplateIds = new Set<string>(manifest.exactIds.fieldProgressTemplateIds);
  const expectedItemIds = new Set<string>(manifest.exactIds.fieldProgressItemIds);
  const expectedReportIds = new Set<string>(manifest.exactIds.siteReportIds);
  const expectedLineIds = new Set<string>(manifest.exactIds.siteReportLineIds);
  const expectedEntryIds = new Set<string>(manifest.exactIds.fieldProgressEntryIds);
  const targetProjectId = manifest.metadata.projectId;

  console.log(`=== AI-01C CLEANUP SCRIPT (${isDryRun ? 'DRY RUN' : 'LIVE EXECUTION'}) ===`);
  console.log(`Target Project: ${manifest.metadata.projectCode} (${targetProjectId})`);
  console.log(`Expected IDs in manifest:`);
  console.log(`  - Templates: ${expectedTemplateIds.size}`);
  console.log(`  - Items: ${expectedItemIds.size}`);
  console.log(`  - Reports: ${expectedReportIds.size}`);
  console.log(`  - Lines: ${expectedLineIds.size}`);
  console.log(`  - Entries: ${expectedEntryIds.size}\n`);

  // 1. Check matching in Database
  const dbEntries = await prisma.fieldProgressEntry.findMany({
    where: { id: { in: Array.from(expectedEntryIds) } },
  });
  result.matched.entries = dbEntries.length;
  for (const e of dbEntries) {
    if (e.projectId !== targetProjectId) {
      result.unexpectedRecords++;
      result.errors.push(`Entry ${e.id} belongs to project ${e.projectId}, not ${targetProjectId}`);
    }
  }

  const dbLines = await prisma.siteReportLine.findMany({
    where: { id: { in: Array.from(expectedLineIds) } },
  });
  result.matched.lines = dbLines.length;
  for (const l of dbLines) {
    if (l.projectId !== targetProjectId) {
      result.unexpectedRecords++;
      result.errors.push(`Line ${l.id} belongs to project ${l.projectId}, not ${targetProjectId}`);
    }
  }

  const dbReports = await prisma.siteReport.findMany({
    where: { id: { in: Array.from(expectedReportIds) } },
  });
  result.matched.reports = dbReports.length;
  for (const r of dbReports) {
    if (r.projectId !== targetProjectId) {
      result.unexpectedRecords++;
      result.errors.push(`Report ${r.id} belongs to project ${r.projectId}, not ${targetProjectId}`);
    }
  }

  const dbItems = await prisma.fieldProgressItem.findMany({
    where: { id: { in: Array.from(expectedItemIds) } },
  });
  result.matched.items = dbItems.length;
  for (const i of dbItems) {
    if (i.projectId !== targetProjectId) {
      result.unexpectedRecords++;
      result.errors.push(`Item ${i.id} belongs to project ${i.projectId}, not ${targetProjectId}`);
    }
  }

  const dbTemplates = await prisma.fieldProgressTemplate.findMany({
    where: { id: { in: Array.from(expectedTemplateIds) } },
  });
  result.matched.templates = dbTemplates.length;
  for (const t of dbTemplates) {
    if (t.projectId !== targetProjectId) {
      result.unexpectedRecords++;
      result.errors.push(`Template ${t.id} belongs to project ${t.projectId}, not ${targetProjectId}`);
    }
  }

  console.log(`Database Matching Summary:`);
  console.log(`  - Templates matched: ${result.matched.templates}/${expectedTemplateIds.size}`);
  console.log(`  - Items matched: ${result.matched.items}/${expectedItemIds.size}`);
  console.log(`  - Reports matched: ${result.matched.reports}/${expectedReportIds.size}`);
  console.log(`  - Lines matched: ${result.matched.lines}/${expectedLineIds.size}`);
  console.log(`  - Entries matched: ${result.matched.entries}/${expectedEntryIds.size}`);
  console.log(`  - Unexpected project records: ${result.unexpectedRecords}`);

  if (result.unexpectedRecords > 0 || result.errors.length > 0) {
    console.error(`\nSAFETY ABORT: Found unexpected records or project mismatches!`);
    console.error(result.errors.join('\n'));
    result.success = false;
    return result;
  }

  // Check preservation of CT-2026-0021 template
  const otherTemplates = await prisma.fieldProgressTemplate.findMany({
    where: { id: { notIn: Array.from(expectedTemplateIds) } },
  });
  console.log(`\nPreserved other project templates in DB: ${otherTemplates.length} (Expected: 1 for CT-2026-0021)`);
  for (const ot of otherTemplates) {
    console.log(`  - Preserved template ID: ${ot.id} (Project: ${ot.projectId})`);
  }

  if (isDryRun) {
    console.log(`\n[DRY RUN COMPLETE] Exact-ID safety checks PASSED. Ready for live execution.`);
    result.success = true;
    return result;
  }

  // 2. Live Execution in Exact Foreign-Key Dependency Order inside a Transaction
  console.log(`\nExecuting exact-ID transactional deletion...`);

  await prisma.$transaction(async (tx) => {
    // A. Delete FieldProgressEntries (20)
    const delEntries = await tx.fieldProgressEntry.deleteMany({
      where: { id: { in: Array.from(expectedEntryIds) }, projectId: targetProjectId },
    });
    result.deleted.entries = delEntries.count;

    // B. Delete SiteReportLines (20)
    const delLines = await tx.siteReportLine.deleteMany({
      where: { id: { in: Array.from(expectedLineIds) }, projectId: targetProjectId },
    });
    result.deleted.lines = delLines.count;

    // C. Delete SiteReports (5)
    const delReports = await tx.siteReport.deleteMany({
      where: { id: { in: Array.from(expectedReportIds) }, projectId: targetProjectId },
    });
    result.deleted.reports = delReports.count;

    // D. Delete FieldProgressItems (11)
    const delItems = await tx.fieldProgressItem.deleteMany({
      where: { id: { in: Array.from(expectedItemIds) }, projectId: targetProjectId },
    });
    result.deleted.items = delItems.count;

    // E. Delete FieldProgressTemplate (1)
    const delTemplates = await tx.fieldProgressTemplate.deleteMany({
      where: { id: { in: Array.from(expectedTemplateIds) }, projectId: targetProjectId },
    });
    result.deleted.templates = delTemplates.count;

    // F. Append Immutable Audit Log Event for cleanup record
    await tx.auditLog.create({
      data: {
        projectId: targetProjectId,
        action: "AI01B_SYNTHETIC_QA_DATA_REMOVED",
        entityType: "FieldProgressTemplate",
        entityId: Array.from(expectedTemplateIds)[0],
        beforeData: JSON.stringify({
          classification: "SYNTHETIC_QA",
          removedTemplates: delTemplates.count,
          removedItems: delItems.count,
          removedReports: delReports.count,
          removedEntries: delEntries.count,
        }),
        afterData: JSON.stringify({
          status: "RESTORED_TO_PRE_AI01B_STATE",
          fixtureExportedAt: manifest.metadata.createdAt,
        }),
      },
    });
  });

  console.log(`\n[LIVE CLEANUP COMPLETE] Successfully deleted:`);
  console.log(`  - FieldProgressEntries deleted: ${result.deleted.entries}`);
  console.log(`  - SiteReportLines deleted: ${result.deleted.lines}`);
  console.log(`  - SiteReports deleted: ${result.deleted.reports}`);
  console.log(`  - FieldProgressItems deleted: ${result.deleted.items}`);
  console.log(`  - FieldProgressTemplates deleted: ${result.deleted.templates}`);
  console.log(`  - Audit Log Event created: AI01B_SYNTHETIC_QA_DATA_REMOVED`);

  result.success = true;
  return result;
}

if (require.main === module) {
  const isLive = process.argv.includes('--execute');
  runCleanup({ dryRun: !isLive })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
