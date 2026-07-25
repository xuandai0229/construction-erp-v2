import prisma from '../src/lib/prisma';

async function run() {
  const user = await prisma.user.findFirst({
    where: { email: 'qa_admin_2026_07@construction-erp-qa.local' }
  });
  console.log("User active:", user?.isActive, "deletedAt:", user?.deletedAt);
  if (user && (!user.isActive || user.deletedAt !== null)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true, deletedAt: null }
    });
    console.log("Activated user!");
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
