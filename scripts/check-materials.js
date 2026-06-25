const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.materialItem.count();
  console.log('COUNT:', count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
