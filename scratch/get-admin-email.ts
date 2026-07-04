import prisma from '../src/lib/prisma';
prisma.user.findFirst({where: {role: 'ADMIN'}}).then(u => {
  console.log('Email:', u?.email);
  process.exit(0);
});
