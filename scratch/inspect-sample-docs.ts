import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseRealPdfBuffer } from '../src/lib/ai/documents/parsers/real-pdf-parser';

async function inspectSampleDocs() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const docs = await prisma.document.findMany({
    where: {
      folder: {
        project: {
          code: { in: ['CT-2026-0001', 'CT-2026-0002', 'CT-2026-0009'] }
        }
      }
    },
    include: {
      folder: {
        include: { project: true }
      }
    }
  });

  console.log(`Inspecting ${docs.length} documents for CT-0001, CT-0002, CT-0009:`);
  for (const doc of docs) {
    if (doc.storagePath) {
      const fullPath = path.join(process.cwd(), 'storage', doc.storagePath);
      const exists = fs.existsSync(fullPath);
      const size = exists ? fs.statSync(fullPath).size : 0;
      console.log(`- [${doc.folder?.project?.code}] ${doc.originalName} (${doc.mimeType}) -> size: ${size} bytes`);
      if (exists && doc.mimeType === 'application/pdf') {
        const buf = fs.readFileSync(fullPath);
        const parseRes = await parseRealPdfBuffer({
          buffer: buf,
          documentId: doc.id,
          projectId: doc.folder?.project?.id || '',
          projectCode: doc.folder?.project?.code || '',
          title: doc.displayName || doc.originalName,
          version: 1,
          status: 'APPROVED',
          authorityLevel: 'CURRENT_APPROVED_CONTRACT',
        });
        console.log(`  Parsed: ${parseRes.chunks.length} chunks, text: "${parseRes.chunks.map(c => c.text).join(' ').slice(0, 120)}..."`);
      }
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

inspectSampleDocs().catch(console.error);
