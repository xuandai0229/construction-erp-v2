import prisma from '../src/lib/prisma';

async function checkUsers() {
  const users = await prisma.user.findMany({
    take: 5,
    select: { id: true, email: true, role: true, name: true }
  });
  console.log('Sample Users:', JSON.stringify(users, null, 2));
}

checkUsers().finally(() => prisma.$disconnect());
