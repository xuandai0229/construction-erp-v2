import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import bcrypt from 'bcryptjs';

async function checkUserPw() {
  const { default: prisma } = await import('../src/lib/prisma');

  const user = await prisma.user.findFirstOrThrow({
    where: { username: 'NV-2026-0005' },
    select: { id: true, username: true, email: true, password: true, role: true }
  });

  console.log('User:', user.username, 'Role:', user.role, 'Email:', user.email);
  const match1 = await bcrypt.compare('Password123!', user.password);
  const match2 = await bcrypt.compare('admin123', user.password);
  const match3 = await bcrypt.compare('123456', user.password);
  console.log('Password123! matches:', match1);
  console.log('admin123 matches:', match2);
  console.log('123456 matches:', match3);

  await prisma.$disconnect();
}

checkUserPw().catch(console.error);
