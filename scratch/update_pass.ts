import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function run() {
  const pw = process.env.QA_SUPERVISION_E2E_PASSWORD || 'R_CSs9EW06iHTDY4aiMG28Y6hpzh1DAr_E-3FA7A0dk';
  const hash = await bcrypt.hash(pw, 10);
  await prisma.user.update({
    where: { email: 'qa_admin_2026_07@construction-erp-qa.local' },
    data: { password: hash }
  });
  console.log("Updated password for qa_admin_2026_07@construction-erp-qa.local");
}

run().catch(console.error).finally(() => prisma.$disconnect());
