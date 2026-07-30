import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function test() {
  const result = await prisma.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY finished_at ASC`;
  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

test().catch(console.error);
