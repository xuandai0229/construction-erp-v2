import prisma from '../src/lib/prisma';

async function run() {
  const dossiers = await prisma.supervisionWeeklyDossier.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      reportNumber: true,
      weekStart: true,
      weekEnd: true,
      status: true,
      version: true,
      createdById: true,
      createdAt: true
    },
    orderBy: { version: 'desc' },
    take: 20
  });
  console.log("Total non-deleted dossiers:", dossiers.length);
  console.log(JSON.stringify(dossiers, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
