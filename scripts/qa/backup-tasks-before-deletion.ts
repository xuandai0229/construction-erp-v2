import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('--- TASK MODULE PRE-DELETION BACKUP ---');
  console.log('Connecting to DB:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const tasks = await prisma.workTask.findMany();
    const actions = await prisma.workTaskAction.findMany();
    const outbox = await prisma.workTaskOutboxMessage.findMany();
    const idempotency = await prisma.workTaskIdempotency.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'),
      counts: {
        WorkTask: tasks.length,
        WorkTaskAction: actions.length,
        WorkTaskOutboxMessage: outbox.length,
        WorkTaskIdempotency: idempotency.length,
      },
      data: {
        tasks,
        actions,
        outbox,
        idempotency,
      },
    };

    console.log('Records counted:');
    console.log(`- WorkTask: ${tasks.length}`);
    console.log(`- WorkTaskAction: ${actions.length}`);
    console.log(`- WorkTaskOutboxMessage: ${outbox.length}`);
    console.log(`- WorkTaskIdempotency: ${idempotency.length}`);

    const outDir = path.join(process.cwd(), 'docs', 'qa');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outPath = path.join(outDir, 'TASK_MODULE_BACKUP_MANIFEST.json');
    fs.writeFileSync(outPath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`Backup saved to ${outPath}`);
  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
