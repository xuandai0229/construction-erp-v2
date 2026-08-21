import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyDBReconciliation() {
  const { default: prisma } = await import('../src/lib/prisma');

  console.log('================================================================');
  console.log('PHASE 23: DATABASE INTEGRITY & RECONCILIATION VERIFICATION');
  console.log('================================================================');

  const totalProjects = await prisma.project.count({ where: { deletedAt: null } });
  const allProjects = await prisma.project.findMany({
    where: { deletedAt: null },
    orderBy: { code: 'asc' },
    select: { code: true, name: true, status: true },
  });

  console.log(`Total Active Projects in DB: ${totalProjects}`);
  console.log('First 3 Projects:', allProjects.slice(0, 3));
  console.log('Last 3 Projects:', allProjects.slice(-3));

  const syntheticCount = await prisma.project.count({
    where: { code: { startsWith: 'TEST-MOCK' } },
  });

  console.log(`Synthetic Mock Projects in DB: ${syntheticCount}`);

  if (totalProjects === 21 && syntheticCount === 0) {
    console.log('>>> BUSINESS DB INTEGRITY: CLEAN (21/21 genuine projects preserved, 0 contamination)');
  } else {
    console.error('>>> BUSINESS DB INTEGRITY: CONTAMINATED');
  }

  await prisma.$disconnect();
}

verifyDBReconciliation().catch(console.error);
