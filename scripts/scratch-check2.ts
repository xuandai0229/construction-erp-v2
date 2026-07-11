import prisma from '../src/lib/prisma';
async function main() {
  const reqs = await prisma.materialRequest.findMany({where: {status: 'SUBMITTED'}});
  console.log(reqs);
}
main().finally(() => prisma.$disconnect());
