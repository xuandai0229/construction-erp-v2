import prisma from '../src/lib/prisma';
async function main() {
  const apps = await prisma.approvalRequest.findMany({where: {sourceId: 'cmr5p2j5k0027r4wk99epq5ur'}});
  console.log(apps);
}
main().finally(() => prisma.$disconnect());
