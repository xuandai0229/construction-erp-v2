import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const projectsCount = await prisma.project.count({ where: { deletedAt: null } });
  const materialsCount = await prisma.materialItem.count();
  const stocksCount = await prisma.projectMaterialStock.count();
  const movementsCount = await prisma.materialMovement.count();
  const proposalsCount = await prisma.materialProposal.count();

  console.log('=== DATABASE RECORD COUNTS ===');
  console.log({
    activeProjects: projectsCount,
    materialItems: materialsCount,
    stocks: stocksCount,
    movements: movementsCount,
    proposals: proposalsCount,
  });

  const materials = await prisma.materialItem.findMany({
    take: 10,
    include: { project: { select: { code: true, name: true } } }
  });
  console.log('=== SAMPLE MATERIALS ===', materials);

  const proposals = await prisma.materialProposal.findMany({
    take: 10,
    include: { project: { select: { code: true, name: true } } }
  });
  console.log('=== SAMPLE PROPOSALS ===', proposals.map(p => ({
    id: p.id,
    proposalNo: p.proposalNo,
    projectCode: p.project.code,
    status: p.status,
    requester: p.requesterNameSnapshot,
  })));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
