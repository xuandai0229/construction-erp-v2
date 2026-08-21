import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function auditERPFullInventory() {
  const { default: prisma } = await import('../src/lib/prisma');

  console.log('=== ERP DOMAIN TABLE INVENTORY ===');

  const domainCounts = {
    // Core
    User: await prisma.user.count(),
    Project: await prisma.project.count(),
    ProjectMember: await prisma.projectMember.count(),
    SystemSetting: await prisma.systemSetting.count(),
    AuditLog: await prisma.auditLog.count(),

    // Reports / Progress
    SiteReport: await prisma.siteReport.count(),
    SiteReportLine: await prisma.siteReportLine.count(),
    ProgressUpdate: await prisma.progressUpdate.count(),
    WeeklySupervisionDossier: await (prisma as any).weeklySupervisionDossier?.count().catch(() => 0),

    // Materials / Warehouse
    MaterialItem: await prisma.materialItem.count(),
    MaterialLot: await prisma.materialLot.count(),
    MaterialTransaction: await prisma.materialTransaction.count(),

    // Documents
    Document: await prisma.document.count(),
    DocumentFolder: await prisma.documentFolder.count(),
    DocumentApproval: await prisma.documentApproval.count(),

    // Tasks / WBS / Work Item
    Task: await prisma.task.count(),
    WorkItem: await prisma.workItem.count(),

    // HR
    Employee: await (prisma as any).employee?.count().catch(() => 0),
    OrganizationUnit: await (prisma as any).organizationUnit?.count().catch(() => 0),
    Position: await (prisma as any).position?.count().catch(() => 0),
  };

  console.log('Domain Counts Table:', JSON.stringify(domainCounts, null, 2));

  console.log('\n=== CURRENT AI 5 READ TOOLS INVENTORY ===');
  const { AI_TOOL_DEFINITIONS } = await import('../src/lib/ai/gateway/ai-tool-registry');
  console.log('Registered AI Tools Count:', Object.keys(AI_TOOL_DEFINITIONS).length);
  for (const [name, tool] of Object.entries(AI_TOOL_DEFINITIONS)) {
    console.log(`- ${name} (v${tool.version}): ${tool.description}`);
  }

  await prisma.$disconnect();
}

auditERPFullInventory().catch(console.error);
