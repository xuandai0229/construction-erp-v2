import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testScopedChatE2E() {
  const { default: prisma } = await import('../src/lib/prisma');
  const { executeAIChatTurn } = await import('../src/lib/ai/controller/ai-chat-controller');

  console.log('================================================================');
  console.log('PHASE 0 A: SCOPED USER AUTHENTICATED CHAT E2E');
  console.log('================================================================');

  // 1. Get Scoped Chief Commander NV-2026-0005
  const scopedUser = await prisma.user.findFirstOrThrow({
    where: { username: 'NV-2026-0005' },
    select: {
      id: true,
      role: true,
      name: true,
      projectMembers: {
        where: { deletedAt: null, isActive: true },
        select: { projectId: true, project: { select: { code: true, name: true } } }
      }
    }
  });

  const assignedCodes = scopedUser.projectMembers.map(m => m.project.code);
  console.log(`Scoped User: ${scopedUser.name} (${scopedUser.role})`);
  console.log(`Assigned Projects (${assignedCodes.length}):`, assignedCodes);

  // 2. Ask "Tình hình hôm nay?"
  const res1 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tình hình hôm nay?' }],
    activeProjectId: null,
    contextOptions: {
      explicitUser: {
        id: scopedUser.id,
        role: scopedUser.role,
        email: scopedUser.email || undefined,
        name: scopedUser.name,
      }
    }
  });

  console.log('\n--- Query 1: "Tình hình hôm nay?" ---');
  console.log('Success:', res1.success);
  console.log('Sources Count:', res1.sources.length);
  console.log('Content:\n', res1.content);

  // HARD ASSERT: Scoped user must only see their 2 projects, NOT 21 projects
  const contains21 = (res1.content || '').includes('21 công trình');
  const contains2 = (res1.content || '').includes('2 công trình');
  const containsUnauthorized = (res1.content || '').includes('CT-2026-0009') || (res1.content || '').includes('CT-2026-0001');

  console.log('\n--- VERIFICATION CHECKS ---');
  console.log('Mentions 21 projects (Leak):', contains21, '->', contains21 ? 'FAIL ❌' : 'PASS ✅');
  console.log('Mentions 2 projects (Scoped):', contains2, '->', contains2 ? 'PASS ✅' : 'FAIL ❌');
  console.log('Contains unauthorized project CT-2026-0009:', containsUnauthorized, '->', containsUnauthorized ? 'FAIL ❌' : 'PASS ✅');

  // 3. Ask "Tôi đang phụ trách những công trình nào?"
  const res2 = await executeAIChatTurn({
    messages: [{ role: 'user', content: 'Tôi đang phụ trách những công trình nào?' }],
    activeProjectId: null,
    contextOptions: {
      explicitUser: {
        id: scopedUser.id,
        role: scopedUser.role,
        email: scopedUser.email || undefined,
        name: scopedUser.name,
      }
    }
  });

  console.log('\n--- Query 2: "Tôi đang phụ trách những công trình nào?" ---');
  console.log('Success:', res2.success);
  console.log('Content:\n', res2.content);

  const containsAssigned = assignedCodes.every(code => (res2.content || '').includes(code));
  const leaksOther = (res2.content || '').includes('CT-2026-0001') || (res2.content || '').includes('CT-2026-0009');
  console.log('All assigned projects present:', containsAssigned, '->', containsAssigned ? 'PASS ✅' : 'FAIL ❌');
  console.log('Other projects leaked:', leaksOther, '->', leaksOther ? 'FAIL ❌' : 'PASS ✅');

  await prisma.$disconnect();
}

testScopedChatE2E().catch(console.error);
