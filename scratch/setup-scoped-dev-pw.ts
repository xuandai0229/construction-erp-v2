import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import bcrypt from 'bcryptjs';

async function setupScopedDevPassword() {
  const { default: prisma } = await import('../src/lib/prisma');

  const hashed = await bcrypt.hash('Password123!', 10);
  const updated = await prisma.user.updateMany({
    where: { username: 'NV-2026-0005' },
    data: { password: hashed }
  });

  console.log('Updated NV-2026-0005 password to Password123!:', updated.count);

  await prisma.$disconnect();
}

setupScopedDevPassword().catch(console.error);
