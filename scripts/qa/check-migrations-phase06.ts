import prisma from '@/lib/prisma';

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'WorkTask%';
  `;
  console.log('WorkTask tables remaining:', JSON.stringify(tables));

  const cols = await prisma.$queryRaw`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'SystemSetting' AND column_name = 'singletonKey';
  `;
  console.log('SystemSetting singletonKey column:', JSON.stringify(cols));

  const constraints = await prisma.$queryRaw`
    SELECT conname 
    FROM pg_constraint 
    WHERE conname = 'SystemSetting_singletonKey_fixed_check';
  `;
  console.log('SystemSetting constraint:', JSON.stringify(constraints));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
