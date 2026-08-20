import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { default: prisma } = await import('../src/lib/prisma');
  const { calculateProjectActualProgress } = await import('../src/lib/dashboard/project-progress-aggregate');
  const { getProjectSummaryTool } = await import('../src/lib/ai/tools/get-project-summary');
  const { getLatestFieldReportsTool } = await import('../src/lib/ai/tools/get-latest-field-reports');
  const { syncSiteReportProgressEntries } = await import('../src/lib/reports/report-progress-sync');

  console.log('================================================================');
  console.log('STEP 4 & 5: VERIFYING PIPELINE, IDEMPOTENCY & DASHBOARD/AI PARITY');
  console.log('================================================================\n');

  const project = await prisma.project.findUniqueOrThrow({ where: { code: 'CT-2026-0009' } });
  const admin = await prisma.user.findFirstOrThrow({ where: { email: 'daicongtu2910@gmail.com', isActive: true } });

  // 1. Verify Site Reports in DB
  const reports = await prisma.siteReport.findMany({
    where: { projectId: project.id, deletedAt: null },
    include: { lines: true, createdBy: { select: { name: true } } },
    orderBy: { reportDate: 'asc' },
  });
  console.log(`1. Total Site Reports in DB: ${reports.length}`);
  for (const r of reports) {
    console.log(`  - Report ${r.reportNo} (${r.reportDate.toISOString().slice(0, 10)}) | Status: ${r.status} | Lines: ${r.lines.length} | Reporter: ${r.createdBy.name}`);
    if (r.issues) console.log(`    Issue: "${r.issues.slice(0, 70)}..."`);
  }

  // 2. Verify Field Progress Entries in DB
  const entries = await prisma.fieldProgressEntry.findMany({
    where: { projectId: project.id, deletedAt: null },
    include: { item: { select: { code: true, workContent: true, unit: true, designQuantity: true } } },
    orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
  });
  console.log(`\n2. Total Field Progress Entries in DB: ${entries.length}`);
  for (const e of entries) {
    console.log(`  - Entry on ${e.entryDate.toISOString().slice(0, 10)} | Item: [${e.item.code}] | Qty: ${e.quantity} ${e.item.unit} | Status: ${e.status} | Source: ${e.sourceType} (${e.sourceReportId?.slice(0, 12)}...)`);
  }

  // 3. Test Idempotency: re-syncing an approved report should NOT create duplicate entries
  console.log(`\n3. Testing Idempotency on Report 1 (${reports[0].id})...`);
  const initialEntryCount = await prisma.fieldProgressEntry.count({ where: { projectId: project.id, deletedAt: null } });
  
  await syncSiteReportProgressEntries(prisma, {
    reportId: reports[0].id,
    mode: 'APPROVE',
    actor: { id: admin.id, name: admin.name, role: 'ADMIN' },
  });
  
  const postSyncEntryCount = await prisma.fieldProgressEntry.count({ where: { projectId: project.id, deletedAt: null } });
  console.log(`  Initial entries: ${initialEntryCount}, Post-resync entries: ${postSyncEntryCount}`);
  if (initialEntryCount === postSyncEntryCount) {
    console.log(`  >>> IDEMPOTENCY PASSED: No duplicate entries created upon re-sync!`);
  } else {
    console.error(`  >>> IDEMPOTENCY FAILED: Duplicate entries created!`);
  }

  // 4. Dashboard Calculation
  const items = await prisma.fieldProgressItem.findMany({
    where: { projectId: project.id, itemType: 'WORK', deletedAt: null },
    select: { id: true, projectId: true, itemType: true, designQuantity: true, deletedAt: true },
  });
  const allEntries = await prisma.fieldProgressEntry.findMany({
    where: { projectId: project.id, deletedAt: null },
    select: { id: true, projectId: true, itemId: true, quantity: true, status: true, entryDate: true, approvedAt: true, deletedAt: true },
  });

  const dashboardActual = calculateProjectActualProgress({
    projectId: project.id,
    asOf: new Date(),
    items,
    entries: allEntries,
  });

  console.log(`\n4. Dashboard Actual Progress Calculation:`);
  console.log(`  Status: ${dashboardActual.actualProgressDataStatus}`);
  console.log(`  Percent: ${dashboardActual.actualProgressPercent}%`);
  console.log(`  Approved Entries Count: ${dashboardActual.approvedEntryCount}`);
  console.log(`  Last Approved At: ${dashboardActual.lastActualProgressAt?.toISOString()}`);
  console.log(`  Warnings: ${JSON.stringify(dashboardActual.warnings)}`);

  // 5. AI Tool get_project_summary Calculation
  console.log(`\n5. AI Tool get_project_summary execution:`);
  const aiSummary = await getProjectSummaryTool.execute(
    { projectId: project.id },
    { userId: admin.id, role: 'ADMIN', projectScope: { kind: 'ALL_PROJECTS' } }
  );

  console.log(`  AI Actual Progress Status: ${aiSummary.data?.actualProgress.status}`);
  console.log(`  AI Actual Progress Percent: ${aiSummary.data?.actualProgress.percent}%`);
  console.log(`  AI Approved Entry Count: ${aiSummary.data?.actualProgress.approvedEntryCount}`);
  console.log(`  AI Last Approved At: ${aiSummary.data?.actualProgress.lastApprovedAt}`);
  console.log(`  AI Deadline Status: ${aiSummary.data?.deadline.status} (${aiSummary.data?.deadline.label})`);
  console.log(`  AI Latest Report: ${aiSummary.data?.latestFieldReport?.reportNo} (${aiSummary.data?.latestFieldReport?.reportDate})`);
  console.log(`  AI Risk Flags: ${JSON.stringify(aiSummary.data?.riskFlags)}`);
  console.log(`  AI Coverage Domains: ${JSON.stringify(aiSummary.coverage.domains)}`);

  // 6. AI Tool get_latest_field_reports
  console.log(`\n6. AI Tool get_latest_field_reports execution:`);
  const aiReports = await getLatestFieldReportsTool.execute(
    { projectId: project.id, limit: 5 },
    { userId: admin.id, role: 'ADMIN', projectScope: { kind: 'ALL_PROJECTS' } }
  );
  console.log(`  AI Field Reports Count: ${aiReports.data.length}`);
  console.log(`  AI Reports Coverage: ${JSON.stringify(aiReports.coverage)}`);
  for (const r of aiReports.data) {
    console.log(`  - Report ${r.reportNo} (${r.reportDate}) | Work Items: ${r.lines.length} | Has Issues: ${Boolean(r.issues)} | Has Recommendations: ${Boolean(r.recommendations)}`);
  }

  // Parity Check
  const parityPass = (
    dashboardActual.actualProgressPercent === aiSummary.data?.actualProgress.percent &&
    dashboardActual.approvedEntryCount === aiSummary.data?.actualProgress.approvedEntryCount &&
    dashboardActual.actualProgressDataStatus === aiSummary.data?.actualProgress.status
  );

  console.log(`\n================================================================`);
  console.log(`DASHBOARD VS AI PARITY VERDICT: ${parityPass ? '100% MATCH (PASS)' : 'MISMATCH (FAIL)'}`);
  console.log(`================================================================\n`);

  await prisma['$disconnect']();
}

main().catch(console.error);
