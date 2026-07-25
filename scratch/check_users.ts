import prisma from '../src/lib/prisma';

async function run() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, name: true }
  });
  console.log("Users:", users);
}

run().catch(console.error).finally(() => prisma.$disconnect());
