import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function verifyDBReconciliation() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('================================================================');
  console.log('BUSINESS DB RECONCILIATION AUDIT (AI-02C Document Intelligence)');
  console.log('================================================================');

  const docCount = await prisma.document.count();
  const folderCount = await prisma.documentFolder.count();

  console.log('PostgreSQL Business DB Document count:', docCount);
  console.log('PostgreSQL Business DB DocumentFolder count:', folderCount);

  // Check if any QA test title entered DB
  const syntheticDoc = await prisma.document.findFirst({
    where: {
      OR: [
        { originalName: { contains: '12/2025/HĐ-XD' } },
        { displayName: { contains: '12/2025/HĐ-XD' } },
        { originalName: { contains: '01/2026/PLHĐ-CT009' } },
        { displayName: { contains: '01/2026/PLHĐ-CT009' } },
        { originalName: { contains: 'SYNTHETIC_QA' } },
        { originalName: { contains: 'DOC-QA' } },
      ]
    }
  });

  console.log('Synthetic QA document in business DB:', syntheticDoc ? 'LEAK DETECTED ❌' : 'CLEAN ✅ (0 records)');

  if (docCount === 0 && !syntheticDoc) {
    console.log('\n[PASS] Database integrity confirmed: Document Intelligence V1 operated 100% on isolated in-memory QA corpus.');
  } else {
    console.log('\n[NOTICE] Real DB records present.');
  }

  await prisma.$disconnect();
}

verifyDBReconciliation().catch(console.error);
