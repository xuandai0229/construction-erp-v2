import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: 'postgresql://postgres:dev_rotated_secret_pass_2026_x7!@127.0.0.1:5432/construction_erp_v2_dev?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkProject0009() {
  const project = await prisma.project.findUnique({
    where: { code: 'CT-2026-0009' },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, role: true, email: true, username: true } },
        },
      },
      employeeProjectAssignments: {
        include: {
          employee: { select: { id: true, fullName: true, code: true, userId: true } },
          projectPersonnelRole: { select: { name: true, code: true } },
        },
      },
      fieldProgressTemplates: true,
      fieldProgressItems: true,
    },
  });

  console.log('=== PROJECT CT-2026-0009 DETAILS ===');
  console.log(JSON.stringify(project, null, 2));

  await prisma['$disconnect']();
  await pool.end();
}

checkProject0009().catch(console.error);
