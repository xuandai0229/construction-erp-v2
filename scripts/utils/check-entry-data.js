const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

(async () => {
  const entry = await prisma.fieldProgressEntry.findUnique({
    where: { id: 'cmq6g8cq0000bn8wkxwihmzu6' },
    include: { item: true },
  });
  
  if (entry) {
    console.log('Entry ID:', entry.id);
    console.log('Status:', entry.status);
    console.log('Quantity (raw):', entry.quantity);
    console.log('Quantity (type):', typeof entry.quantity);
    console.log('Quantity (JSON):', JSON.stringify(entry.quantity));
    console.log('Quantity (Number):', Number(entry.quantity));
    console.log('Item ID:', entry.itemId);
    console.log('Item workContent:', entry.item?.workContent);
    console.log('Item designQuantity:', entry.item?.designQuantity);
    console.log('Item designQuantity (type):', typeof entry.item?.designQuantity);
  } else {
    console.log('Entry not found');
  }
  await prisma.$disconnect();
})();
