import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function auditCreatedRecords() {
  const { default: prisma } = await import('../src/lib/prisma');

  console.log('=== AUDITING EXACT RECORDS CREATED IN AI-01B ===\n');

  const project = await prisma.project.findUniqueOrThrow({ where: { code: 'CT-2026-0009' } });

  // 1. Template
  const templates = await prisma.fieldProgressTemplate.findMany({
    where: { projectId: project.id },
  });
  console.log('1. TEMPLATES:');
  for (const t of templates) {
    console.log(`  ID: ${t.id} | Name: "${t.name}" | Status: ${t.status} | CreatedAt: ${t.createdAt.toISOString()}`);
  }

  // 2. Items
  const items = await prisma.fieldProgressItem.findMany({
    where: { projectId: project.id },
    orderBy: { sortOrder: 'asc' },
  });
  console.log(`\n2. WORK ITEMS (${items.length}):`);
  for (const i of items) {
    console.log(`  ID: ${i.id} | Code: ${i.code} | "${i.workContent}" | Qty: ${i.designQuantity} ${i.unit} | Crew: ${i.constructionCrew}`);
  }

  // 3. Site Reports
  const reports = await prisma.siteReport.findMany({
    where: { projectId: project.id },
    include: { lines: true },
    orderBy: { reportDate: 'asc' },
  });
  console.log(`\n3. SITE REPORTS (${reports.length}):`);
  for (const r of reports) {
    console.log(`  ID: ${r.id} | No: ${r.reportNo} | Date: ${r.reportDate.toISOString().slice(0, 10)} | Status: ${r.status} | Lines: ${r.lines.length}`);
    console.log(`    Summary: "${r.summary?.slice(0, 80)}..."`);
    console.log(`    Issues: "${r.issues?.slice(0, 80)}..."`);
    console.log(`    Recommendations: "${r.recommendations?.slice(0, 80)}..."`);
    for (const l of r.lines) {
      console.log(`      Line ID: ${l.id} | ItemId: ${l.fieldProgressItemId} | QtyToday: ${l.quantityToday} | QtyCumul: ${l.quantityCumulative} | %: ${l.progressPercent}%`);
    }
  }

  // 4. Field Progress Entries
  const entries = await prisma.fieldProgressEntry.findMany({
    where: { projectId: project.id },
    orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
  });
  console.log(`\n4. FIELD PROGRESS ENTRIES (${entries.length}):`);
  for (const e of entries) {
    console.log(`  ID: ${e.id} | ItemId: ${e.itemId} | Date: ${e.entryDate.toISOString().slice(0, 10)} | Qty: ${e.quantity} | Status: ${e.status} | SourceReport: ${e.sourceReportId}`);
  }

  // 5. Audit Log Entries
  const auditLogs = await prisma.auditLog.findMany({
    where: { projectId: project.id, createdAt: { gte: new Date(Date.now() - 3600000) } },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n5. AUDIT LOGS GENERATED IN AI-01B (${auditLogs.length}):`);
  for (const a of auditLogs.slice(0, 10)) {
    console.log(`  ID: ${a.id} | Action: ${a.action} | Entity: ${a.entityType}:${a.entityId} | Time: ${a.createdAt.toISOString()}`);
  }

  await prisma['$disconnect']();
}

auditCreatedRecords().catch(console.error);
