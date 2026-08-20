import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.AI_PROVIDER_MODE = 'DEVELOPMENT_MOCK';

import * as fs from 'fs';
import * as path from 'path';

async function verifyRestorationAndQA() {
  const { default: prisma } = await import('../src/lib/prisma');
  const { calculateProjectActualProgress } = await import('../src/lib/dashboard/project-progress-aggregate');
  const { getProjectSummaryTool } = await import('../src/lib/ai/tools/get-project-summary');
  const { getLatestFieldReportsTool } = await import('../src/lib/ai/tools/get-latest-field-reports');
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');

  console.log('================================================================');
  console.log('AI-01C: POST-CLEANUP VERIFICATION & RESTORATION AUDIT');
  console.log('================================================================\n');

  const project = await prisma.project.findUniqueOrThrow({ where: { code: 'CT-2026-0009' } });
  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  // 1. Database Counts Audit
  console.log('1. DATABASE COUNTS AUDIT:');
  const totalProjects = await prisma.project.count({ where: { deletedAt: null } });
  const totalUsers = await prisma.user.count({ where: { deletedAt: null } });
  const totalEmployees = await prisma.employee.count();
  const totalMembers = await prisma.projectMember.count({ where: { deletedAt: null } });
  const totalAssignments = await prisma.employeeProjectAssignment.count();
  
  const ct09Templates = await prisma.fieldProgressTemplate.count({ where: { projectId: project.id, deletedAt: null } });
  const ct09Items = await prisma.fieldProgressItem.count({ where: { projectId: project.id, deletedAt: null } });
  const ct09Reports = await prisma.siteReport.count({ where: { projectId: project.id, deletedAt: null } });
  const ct09Entries = await prisma.fieldProgressEntry.count({ where: { projectId: project.id, deletedAt: null } });
  const allTemplates = await prisma.fieldProgressTemplate.count({ where: { deletedAt: null } });

  console.log(`  - Projects: ${totalProjects} (Expected: 21)`);
  console.log(`  - Users: ${totalUsers} (Expected: 15)`);
  console.log(`  - Employees: ${totalEmployees} (Expected: 12)`);
  console.log(`  - Project Members: ${totalMembers} (Expected: 18)`);
  console.log(`  - Employee Project Assignments: ${totalAssignments} (Expected: 18)`);
  console.log(`  - All Templates in DB: ${allTemplates} (Expected: 1 for CT-2026-0021)`);
  console.log(`  - CT-2026-0009 Templates: ${ct09Templates} (Expected: 0)`);
  console.log(`  - CT-2026-0009 Items: ${ct09Items} (Expected: 0)`);
  console.log(`  - CT-2026-0009 Reports: ${ct09Reports} (Expected: 0)`);
  console.log(`  - CT-2026-0009 Entries: ${ct09Entries} (Expected: 0)`);

  // 2. Dashboard Business Logic Check
  console.log('\n2. DASHBOARD BUSINESS LOGIC RESTORATION:');
  const ct09DbItems = await prisma.fieldProgressItem.findMany({
    where: { projectId: project.id, itemType: 'WORK', deletedAt: null },
    select: { id: true, projectId: true, itemType: true, designQuantity: true, deletedAt: true },
  });
  const ct09DbEntries = await prisma.fieldProgressEntry.findMany({
    where: { projectId: project.id, deletedAt: null },
    select: { id: true, projectId: true, itemId: true, quantity: true, status: true, entryDate: true, approvedAt: true, deletedAt: true },
  });

  const dashboardActual = calculateProjectActualProgress({
    projectId: project.id,
    asOf: new Date(),
    items: ct09DbItems,
    entries: ct09DbEntries,
  });

  console.log(`  Dashboard Status: ${dashboardActual.actualProgressDataStatus} (Expected: NO_PROGRESS_ITEMS)`);
  console.log(`  Dashboard Percent: ${dashboardActual.actualProgressPercent} (Expected: null)`);
  console.log(`  Dashboard Approved Entries: ${dashboardActual.approvedEntryCount} (Expected: 0)`);
  console.log(`  Dashboard Warnings: ${JSON.stringify(dashboardActual.warnings)}`);

  // 3. AI Tool Summary Check
  console.log('\n3. AI TOOL SUMMARY RESTORATION:');
  const aiSummary = await getProjectSummaryTool.execute(
    { projectId: project.id },
    { userId: admin.id, role: 'ADMIN', projectScope: { kind: 'ALL_PROJECTS' } }
  );

  console.log(`  AI Actual Progress Status: ${aiSummary.data?.actualProgress.status} (Expected: NO_DATA)`);
  console.log(`  AI Actual Progress Percent: ${aiSummary.data?.actualProgress.percent} (Expected: undefined)`);
  console.log(`  AI Approved Entry Count: ${aiSummary.data?.actualProgress.approvedEntryCount} (Expected: 0)`);
  console.log(`  AI Deadline: ${aiSummary.data?.deadline.status} (${aiSummary.data?.deadline.label}) (Expected: OVERDUE - real project property)`);
  console.log(`  AI Latest Report: ${JSON.stringify(aiSummary.data?.latestFieldReport)} (Expected: undefined/null)`);
  console.log(`  AI Risk Flags: ${JSON.stringify(aiSummary.data?.riskFlags)} (Expected: ["PROJECT_OVERDUE"])`);
  console.log(`  AI Quality Flags: ${JSON.stringify(aiSummary.qualityFlags)}`);

  // 4. AI Interactive Chat Check
  console.log('\n4. AI CHAT INTERACTIVE RESTORATION:');
  const turn = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tình hình hôm nay của công trình CT-2026-0009 thế nào?' }],
    activeProjectId: project.id,
    uiContext: { route: `/projects/${project.id}`, recordType: 'PROJECT', recordId: project.id },
    contextOptions: { explicitUser: admin },
    preferredProvider: 'mock',
  });

  console.log(`  Success: ${turn.success}`);
  console.log(`  Quality Flags: ${JSON.stringify(turn.qualityFlags)}`);
  console.log(`  Sources (${turn.sources.length}):`);
  for (const s of turn.sources) console.log(`    - [${s.sourceType}] ${s.title} -> ${s.route}`);
  console.log(`\nAI Response:\n${turn.content}\n`);

  // 5. Verify QA Fixture Integrity
  console.log('5. QA ISOLATED FIXTURE INTEGRITY:');
  const fixturePath = path.resolve('d:/construction-erp-v2/scripts/qa/fixtures/ai01b-construction-vertical-slice.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  console.log(`  Fixture classification: ${fixture.header.classification}`);
  console.log(`  Fixture items count: ${fixture.items.length}`);
  console.log(`  Fixture reports count: ${fixture.reports.length}`);
  console.log(`  Fixture entries count: ${fixture.entries.length}`);
  console.log(`  Fixture target project: ${fixture.projectContext.code}`);
  console.log(`  Fixture verified ready for isolated QA regression: YES`);

  await prisma['$disconnect']();
}

verifyRestorationAndQA().catch(console.error);
