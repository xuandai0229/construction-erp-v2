import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const active = await prisma.project.count({ where: { deletedAt: null } });
  const deleted = await prisma.project.count({ where: { deletedAt: { not: null } } });
  const allProjects = await prisma.project.findMany({
    where: { deletedAt: null },
    select: { id: true, code: true, name: true, investor: true }
  });
  console.log('Active Projects:', active);
  console.log('Deleted Projects:', deleted);
  console.log('--- Projects List ---');
  allProjects.forEach((p: any) => console.log(`[${p.code}] ${p.name} (Investor: ${p.investor})`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
