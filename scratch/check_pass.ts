import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function run() {
  const user = await prisma.user.findFirst({
    where: { email: 'qa_admin_2026_07@construction-erp-qa.local' }
  });
  console.log("Found user:", user?.email, user?.role);
  if (user) {
    const pw = process.env.QA_SUPERVISION_E2E_PASSWORD || '';
    const match = await bcrypt.compare(pw, user.password);
    console.log("Password match with QA_SUPERVISION_E2E_PASSWORD:", match);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
