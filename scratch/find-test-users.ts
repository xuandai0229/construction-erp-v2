import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function findUsers() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      projectMembers: {
        include: {
          project: {
            select: { id: true, code: true, name: true }
          }
        }
      }
    },
    orderBy: { role: 'asc' }
  });

  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    const assigned = u.projectMembers.map(m => m.project.code).join(', ');
    const uname = (u.username || u.name || 'UNKNOWN').padEnd(16);
    const urole = (u.role || 'UNKNOWN').padEnd(16);
    console.log(`- User: ${uname} | Role: ${urole} | ID: ${u.id} | Assigned (${u.projectMembers.length}): ${assigned || 'GLOBAL/NONE'}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

findUsers().catch(console.error);
