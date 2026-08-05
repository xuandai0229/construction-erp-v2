import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  await prisma.user.deleteMany({});
  console.log('Deleted all existing users.');

  const hashedPassword = await bcrypt.hash('xuandai0229', 10);

  const newUser = await prisma.user.create({
    data: {
      email: 'daicongtu2910@gmail.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Created new admin user:', newUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
