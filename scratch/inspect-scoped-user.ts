import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspectScopedUser() {
  const { default: prisma } = await import('../src/lib/prisma');

  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      projectMembers: {
        where: { deletedAt: null, isActive: true },
        select: { project: { select: { id: true, code: true, name: true } } }
      }
    }
  });

  console.log('All Active Users and their Scoped Projects:');
  for (const u of users) {
    const projs = u.projectMembers.map(m => m.project.code);
    console.log(`- [${u.role}] ${u.email || u.username} (${u.name}): ${projs.length} projects [${projs.join(', ')}]`);
  }

  await prisma.$disconnect();
}

inspectScopedUser().catch(console.error);
