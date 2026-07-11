import prisma from '../src/lib/prisma';
async function main() {
  const req = await prisma.materialRequest.findUnique({where: {requestNo: 'MR-TAYHO-2026-0001'}});
  console.log(req);
  const app = await prisma.approvalRequest.findFirst({where: {sourceId: req?.id}});
  console.log('approval:', app);
}
main().finally(() => prisma.$disconnect());
