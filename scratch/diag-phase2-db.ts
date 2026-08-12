import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const projects = await prisma.project.findMany({ select: { id: true, code: true, name: true } });
  console.log('PROJECTS count:', projects.length);

  for (const p of projects.slice(0, 5)) {
    const wbsCount = await prisma.wBSItem.count({ where: { projectId: p.id, deletedAt: null } });
    const templates = await prisma.fieldProgressTemplate.findMany({ where: { projectId: p.id, deletedAt: null } });
    const fpItems = await prisma.fieldProgressItem.findMany({ where: { templateId: { in: templates.map(t => t.id) } } });
    const entries = await prisma.fieldProgressEntry.findMany({ where: { projectId: p.id, deletedAt: null } });

    console.log(`\nProject ${p.code} (${p.id}):`);
    console.log(`  WBS items count: ${wbsCount}`);
    console.log(`  Templates count: ${templates.length}`);
    if (templates.length > 0) {
      console.log(`  Templates:`, templates.map(t => ({ id: t.id, name: t.name })));
    }
    console.log(`  FieldProgressItems count: ${fpItems.length}`);
    if (fpItems.length > 0) {
      console.log(`  FieldProgressItems sample:`, fpItems.slice(0, 3).map(i => ({ id: i.id, code: i.code, name: i.workContent, type: i.itemType })));
    }
    console.log(`  FieldProgressEntries count: ${entries.length}`);
  }
}

main().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
