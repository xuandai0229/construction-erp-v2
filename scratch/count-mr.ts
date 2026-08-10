import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/construction_erp?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const reqCount = await prisma.materialRequest.count();
  const itemCount = await prisma.materialRequestItem.count();
  const approvalCount = await prisma.approvalRequest.count({ where: { sourceType: 'MATERIAL_REQUEST' } });
  const movementCount = await prisma.materialMovement.count({ where: { materialRequestItemId: { not: null } } });
  
  console.log('--- DB COUNTS BEFORE DECOMMISSION ---');
  console.log('MaterialRequest:', reqCount);
  console.log('MaterialRequestItem:', itemCount);
  console.log('ApprovalRequest (MATERIAL_REQUEST):', approvalCount);
  console.log('MaterialMovement (linked to MaterialRequestItem):', movementCount);

  if (reqCount > 0 || itemCount > 0) {
    const requests = await prisma.materialRequest.findMany({
      include: { items: true }
    });
    console.log('BACKUP DATA SAMPLE:', JSON.stringify(requests, null, 2));
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
