import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const row = await p.systemSetting.findUnique({
    where: { singletonKey: 'DEFAULT_SETTINGS' },
    select: { companyName: true },
  });
  console.log('DB companyName:', JSON.stringify(row));
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await p.$disconnect();
}
