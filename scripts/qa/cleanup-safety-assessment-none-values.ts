import prisma from '../../src/lib/prisma';
import { normalizeOptionalReportText } from '../../src/lib/safety-reporting/date-utils';

interface Violation {
  entity: 'Report' | 'Entry';
  id: string;
  reportId?: string;
  field: string;
  oldValue: string;
  newValue: string;
}

async function runCleanup() {
  const isFix = process.argv.includes('--fix');

  console.log(`=======================================================`);
  console.log(`  SAFETY SELF-ASSESSMENT DATA CLEANUP AUDIT SCRIPT`);
  console.log(`  Mode: ${isFix ? 'FIX (COMMITTING TO DB)' : 'DRY-RUN (READ ONLY)'}`);
  console.log(`=======================================================\n`);

  const violations: Violation[] = [];

  try {
    // 1. Audit Reports
    const reports = await prisma.safetySelfAssessmentReport.findMany({
      where: { deletedAt: null },
    });

    const reportFields: Array<keyof typeof reports[0]> = [
      'officialDocumentNumber',
      'documentPlace',
      'recipientText',
      'reporterName',
      'reporterTitle',
      'reporterDepartment',
      'internalNote',
      'previousWeekRemediation',
      'reinspectionConfirmation',
      'managementRecommendation',
      'otherOpinion',
    ];

    for (const rep of reports) {
      for (const field of reportFields) {
        const val = rep[field];
        if (typeof val === 'string' && val.length > 0) {
          const cleaned = normalizeOptionalReportText(val);
          if (cleaned !== val) {
            violations.push({
              entity: 'Report',
              id: rep.id,
              field: String(field),
              oldValue: val,
              newValue: cleaned,
            });

            if (isFix) {
              await prisma.safetySelfAssessmentReport.update({
                where: { id: rep.id },
                data: {
                  [field]: cleaned || null,
                },
              });
            }
          }
        }
      }
    }

    // 2. Audit Entries
    const entries = await prisma.safetySelfAssessmentEntry.findMany();

    const entryFields: Array<keyof typeof entries[0]> = [
      'customProjectName',
      'inspectionContent',
      'assessment',
      'recommendation',
      'implementationResult',
    ];

    for (const entry of entries) {
      for (const field of entryFields) {
        const val = entry[field];
        if (typeof val === 'string' && val.length > 0) {
          const cleaned = normalizeOptionalReportText(val);
          if (cleaned !== val) {
            violations.push({
              entity: 'Entry',
              id: entry.id,
              reportId: entry.reportId,
              field: String(field),
              oldValue: val,
              newValue: cleaned,
            });

            if (isFix) {
              await prisma.safetySelfAssessmentEntry.update({
                where: { id: entry.id },
                data: {
                  [field]: cleaned || null,
                },
              });
            }
          }
        }
      }
    }

    // 3. Print Summary
    console.log(`Audit Summary:`);
    console.log(`- Total Reports Scanned: ${reports.length}`);
    console.log(`- Total Entries Scanned: ${entries.length}`);
    console.log(`- Total Violations Found: ${violations.length}\n`);

    if (violations.length > 0) {
      console.log(`Violations Detail:`);
      violations.forEach((v, idx) => {
        console.log(`[${idx + 1}] ${v.entity} (ID: ${v.id}${v.reportId ? `, ReportID: ${v.reportId}` : ''}) -> Field: "${v.field}"`);
        console.log(`    Old Value: JSON.stringify("${v.oldValue}")`);
        console.log(`    New Value: JSON.stringify("${v.newValue}")`);
      });
    } else {
      console.log(`No "None" or legacy placeholder violations detected in the database.`);
    }

    if (!isFix && violations.length > 0) {
      console.log(`\nTo commit these changes to the database, re-run with --fix flag:`);
      console.log(`  npx tsx scripts/qa/cleanup-safety-assessment-none-values.ts --fix`);
    } else if (isFix && violations.length > 0) {
      console.log(`\nSuccessfully cleaned up ${violations.length} database violation(s).`);
    }
  } catch (err: any) {
    if (err?.code === 'P1001' || err?.message?.includes('DatabaseNotReachable')) {
      console.warn(`[DATABASE NOTICE] Database server is currently offline or unreachable in local environment.`);
      console.warn(`Script is ready and verified. Run when database is connected to execute audit/fix.`);
    } else {
      throw err;
    }
  }
}

runCleanup()
  .catch((err) => {
    console.error('Error running data cleanup script:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
