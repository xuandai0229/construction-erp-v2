import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function audit21Projects() {
  const { default: prisma } = await import('../src/lib/prisma');
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');
  const { resolveAIRequestContext } = await import('../src/lib/ai/context/ai-context-resolver');

  console.log('=== 1. DATABASE PROJECT TOTALS ===');
  const totalProjects = await prisma.project.count();
  const projectsByStatus = await prisma.project.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  console.log('Total Projects in DB:', totalProjects);
  console.log('Projects by Status:', JSON.stringify(projectsByStatus, null, 2));

  const allProjects = await prisma.project.findMany({
    select: { id: true, code: true, name: true, status: true },
    orderBy: { code: 'asc' },
  });
  console.log('All DB Project Codes:');
  allProjects.forEach((p, i) => console.log(`  ${i + 1}. [${p.code}] ${p.status} - ${p.name.slice(0, 40)}`));

  console.log('\n=== 2. ADMIN USER SCOPE CHECK ===');
  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });
  const context = await resolveAIRequestContext({ explicitUser: admin });
  console.log('Admin User Role:', context?.role);
  console.log('Admin Project Scope Kind:', context?.projectScope.kind);
  if (context?.projectScope.kind === 'PROJECT_IDS') {
    console.log('Admin Allowed Project IDs Count:', context.projectScope.projectIds.length);
  }

  console.log('\n=== 3. TOOL OUTPUT LIMIT AUDIT ===');
  const { getMyProjectsTool } = await import('../src/lib/ai/tools/get-my-projects');
  const toolResultDefault = await getMyProjectsTool.execute({}, context!);
  console.log('Tool Result (Default params) items count:', (toolResultDefault as any).projects.length);
  console.log('Tool Result (Default params) totalCount field:', (toolResultDefault as any).totalCount);

  const toolResultAll = await getMyProjectsTool.execute({ limit: 50 }, context!);
  console.log('Tool Result (limit: 50) items count:', (toolResultAll as any).projects.length);

  console.log('\n=== 4. PRISMA SCHEMA DOMAINS AUDIT ===');
  // Count key records across ERP domains
  const counts = {
    projects: await prisma.project.count(),
    projectMembers: await prisma.projectMember.count(),
    siteReports: await prisma.siteReport.count(),
    siteReportLines: await prisma.siteReportLine.count(),
    materialItems: await prisma.materialItem.count(),
    materialLots: await prisma.materialLot.count(),
    materialTransactions: await prisma.materialTransaction.count(),
    documents: await prisma.document.count(),
    documentFolders: await prisma.documentFolder.count(),
    documentApprovals: await prisma.documentApproval.count(),
    users: await prisma.user.count(),
    systemSettings: await prisma.systemSetting.count(),
    auditLogs: await prisma.auditLog.count(),
  };
  console.log('ERP Domain Record Counts:', JSON.stringify(counts, null, 2));

  await prisma.$disconnect();
}

audit21Projects().catch(console.error);
