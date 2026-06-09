const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.project.findFirst({where: {deletedAt: null}});
  if (!p) return console.log('No project');
  
  let t = await prisma.fieldProgressTemplate.findFirst({where: {projectId: p.id}});
  
  const item = await prisma.fieldProgressItem.create({
    data: {
      templateId: t.id,
      itemType: 'WORK',
      workContent: 'Cống hộp 2.5x2.5 (Test 218.6)',
      designQuantity: 218.6,
      unit: 'm',
      sortOrder: 999
    }
  });

  console.log('Created item:', item.id);
  
  await prisma.fieldProgressEntry.create({
    data: {
      templateId: t.id,
      itemId: item.id,
      entryDate: new Date('2026-05-10T00:00:00Z'),
      quantity: 100,
      status: 'APPROVED'
    }
  });
  
  await prisma.fieldProgressEntry.create({
    data: {
      templateId: t.id,
      itemId: item.id,
      entryDate: new Date('2026-05-13T00:00:00Z'),
      quantity: 50,
      status: 'APPROVED'
    }
  });

  await prisma.fieldProgressEntry.create({
    data: {
      templateId: t.id,
      itemId: item.id,
      entryDate: new Date('2026-05-15T00:00:00Z'),
      quantity: 68.4,
      status: 'APPROVED'
    }
  });

  console.log('Test data created successfully.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
