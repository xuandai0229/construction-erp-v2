import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      displayName: true,
      location: true,
      investor: true,
      members: {
        where: { role: 'CHIEF_COMMANDER', isActive: true, deletedAt: null },
        select: {
          id: true,
          role: true,
          user: { select: { id: true, name: true, email: true } }
        }
      }
    },
    orderBy: { code: 'asc' }
  });

  console.log(`TOTAL PROJECTS IN DB: ${projects.length}`);
  console.log('--------------------------------------------------');
  for (const p of projects) {
    const commander = p.members[0]?.user?.name || 'KHÔNG CÓ';
    const memberId = p.members[0]?.id || 'N/A';
    console.log(`[${p.code}] ${p.name} | Commander: ${commander} | MemberID: ${memberId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
