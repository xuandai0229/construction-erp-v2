import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testCompletenessE2E() {
  const { default: prisma } = await import('../src/lib/prisma');
  const { resolveAIRequestContext } = await import('../src/lib/ai/context/ai-context-resolver');
  const { getMyProjectsTool } = await import('../src/lib/ai/tools/get-my-projects');

  console.log('================================================================');
  console.log('PHASE 2: END-TO-END COMPLETENESS TEST (ADMIN VS SCOPED)');
  console.log('================================================================');

  // 1. ADMIN USER (ALL_PROJECTS)
  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'daicongtu2910@gmail.com', isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });
  const adminContext = await resolveAIRequestContext({ explicitUser: admin });
  const totalDbCount = await prisma.project.count({ where: { deletedAt: null } });

  console.log(`[Admin Test] Total DB Projects: ${totalDbCount}`);
  console.log(`[Admin Test] Admin Scope Kind: ${adminContext?.projectScope.kind}`);

  const adminToolResult = await getMyProjectsTool.execute({}, adminContext!);
  console.log(`[Admin Test] Tool authorizedTotalCount: ${adminToolResult.data.authorizedTotalCount}`);
  console.log(`[Admin Test] Tool returnedCount: ${adminToolResult.data.returnedCount}`);
  console.log(`[Admin Test] Tool hasMore: ${adminToolResult.data.hasMore}`);
  console.log(`[Admin Test] Tool items length: ${adminToolResult.data.items.length}`);
  console.log(`[Admin Test] Coverage summary: ${adminToolResult.coverage?.summary}`);

  if (adminToolResult.data.authorizedTotalCount === 21 && adminToolResult.data.returnedCount === 21) {
    console.log('>>> ADMIN COMPLETENESS: PASS (21/21 in all layers)');
  } else {
    console.error('>>> ADMIN COMPLETENESS: FAIL!');
  }

  // 2. SCOPED CHIEF_COMMANDER USER (PROJECT_IDS)
  const commanderUser = await prisma.user.findFirst({
    where: { role: 'CHIEF_COMMANDER', isActive: true, projectMembers: { some: { deletedAt: null } } },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  if (commanderUser) {
    const commanderContext = await resolveAIRequestContext({ explicitUser: commanderUser });
    console.log(`\n[Commander Test] Commander Role: ${commanderContext?.role}`);
    console.log(`[Commander Test] Commander Scope Kind: ${commanderContext?.projectScope.kind}`);
    const assignedProjectIds = commanderContext?.projectScope.kind === 'PROJECT_IDS' ? commanderContext.projectScope.projectIds : [];
    console.log(`[Commander Test] Assigned Project IDs Count: ${assignedProjectIds.length}`);

    const commanderToolResult = await getMyProjectsTool.execute({}, commanderContext!);
    console.log(`[Commander Test] Tool authorizedTotalCount: ${commanderToolResult.data.authorizedTotalCount}`);
    console.log(`[Commander Test] Tool returnedCount: ${commanderToolResult.data.returnedCount}`);
    console.log(`[Commander Test] Coverage summary: ${commanderToolResult.coverage?.summary}`);

    if (
      commanderToolResult.data.authorizedTotalCount === assignedProjectIds.length &&
      commanderToolResult.data.returnedCount === assignedProjectIds.length &&
      commanderToolResult.data.authorizedTotalCount !== totalDbCount
    ) {
      console.log('>>> SCOPED ROLE COMPLETENESS & PRIVACY: PASS (Exact assigned, no global leak)');
    } else {
      console.error('>>> SCOPED ROLE COMPLETENESS: FAIL!');
    }
  }

  await prisma.$disconnect();
}

testCompletenessE2E().catch(console.error);
