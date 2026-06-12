import prisma from '../src/lib/prisma';

async function run() {
  const res = await prisma.fieldProgressEntry.updateMany({
    where: { 
      itemId: 'cmq5zzdx00001zkwkccfbnid7'
    },
    data: { deletedAt: new Date() }
  });
  console.log('Soft deleted test entries:', res.count);
}
run();
