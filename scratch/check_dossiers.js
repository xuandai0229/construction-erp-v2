const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const dossiers = await prisma.supervisionWeeklyDossier.findMany({
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
  console.log(JSON.stringify(dossiers, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
