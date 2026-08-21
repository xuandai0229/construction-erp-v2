import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { storageProvider } from '../src/lib/storage';

async function auditTemporaryData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('================================================================');
  console.log('1. TEMPORARY DATA & DOMAIN INVENTORY AUDIT');
  console.log('================================================================');

  const counts: Record<string, number> = {
    User: await prisma.user.count(),
    Project: await prisma.project.count(),
    ProjectMember: await prisma.projectMember.count(),
    Employee: await (prisma as any).employee?.count().catch(() => 0),
    DocumentFolder: await prisma.documentFolder.count(),
    Document: await prisma.document.count(),
    DocumentVersion: await (prisma as any).documentVersion?.count().catch(() => 0),
    FieldProgressTemplate: await (prisma as any).fieldProgressTemplate?.count().catch(() => 0),
    FieldProgressItem: await (prisma as any).fieldProgressItem?.count().catch(() => 0),
    FieldProgressEntry: await (prisma as any).fieldProgressEntry?.count().catch(() => 0),
    SiteReport: await (prisma as any).siteReport?.count().catch(() => 0),
    SiteReportLine: await (prisma as any).siteReportLine?.count().catch(() => 0),
    ProjectMaterialStock: await (prisma as any).projectMaterialStock?.count().catch(() => 0),
    MaterialMovement: await (prisma as any).materialMovement?.count().catch(() => 0),
    ApprovalRequest: await (prisma as any).approvalRequest?.count().catch(() => 0),
    SafetyReport: await (prisma as any).safetyReport?.count().catch(() => 0),
    WeeklyReport: await (prisma as any).weeklyReport?.count().catch(() => 0),
  };

  for (const [k, v] of Object.entries(counts)) {
    console.log(`- ${k.padEnd(24)}: ${v}`);
  }

  console.log('\n================================================================');
  console.log('2. DOCUMENT STORAGE FUNNEL AUDIT (84 DB Rows)');
  console.log('================================================================');

  const allDocs = await prisma.document.findMany({
    include: {
      folder: {
        include: {
          project: true,
        }
      }
    }
  });

  let hasStoragePath = 0;
  let fileExists = 0;
  let fileReadable = 0;
  let supportedFormat = 0;
  let pdfCount = 0;
  let docxCount = 0;
  let xlsxCount = 0;
  let otherMime = 0;

  const storageDir = path.join(process.cwd(), 'storage');
  console.log(`Local storage directory root: ${storageDir}`);
  console.log(`Storage root exists: ${fs.existsSync(storageDir)}`);

  const docSamples: any[] = [];

  for (const doc of allDocs) {
    if (doc.storagePath) {
      hasStoragePath++;
      const fullPath = path.isAbsolute(doc.storagePath)
        ? doc.storagePath
        : path.join(process.cwd(), doc.storagePath.startsWith('storage') ? doc.storagePath : path.join('storage', doc.storagePath));

      const exists = fs.existsSync(fullPath);
      if (exists) {
        fileExists++;
        try {
          const stat = fs.statSync(fullPath);
          if (stat.size > 0) {
            fileReadable++;
          }
        } catch {
          // unreadable
        }
      }

      const mime = doc.mimeType?.toLowerCase() || '';
      const name = doc.originalName?.toLowerCase() || '';

      if (mime.includes('pdf') || name.endsWith('.pdf')) {
        pdfCount++;
        supportedFormat++;
      } else if (mime.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) {
        docxCount++;
        supportedFormat++;
      } else if (mime.includes('sheet') || mime.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
        xlsxCount++;
        supportedFormat++;
      } else {
        otherMime++;
      }

      if (docSamples.length < 10) {
        docSamples.push({
          id: doc.id,
          name: doc.originalName || doc.displayName,
          mime: doc.mimeType,
          storagePath: doc.storagePath,
          fullPath,
          exists,
          project: doc.folder?.project?.code || 'NO_PROJECT',
        });
      }
    }
  }

  console.log(`\nDOCUMENT FUNNEL RESULTS:`);
  console.log(`- DOCUMENT_ROWS        : ${allDocs.length}`);
  console.log(`- HAS_STORAGE_PATH     : ${hasStoragePath}`);
  console.log(`- FILE_EXISTS          : ${fileExists}`);
  console.log(`- FILE_READABLE        : ${fileReadable}`);
  console.log(`- SUPPORTED_FORMAT     : ${supportedFormat}`);
  console.log(`  * PDF                : ${pdfCount}`);
  console.log(`  * DOCX               : ${docxCount}`);
  console.log(`  * XLSX               : ${xlsxCount}`);
  console.log(`  * OTHER / UNKNOWN    : ${otherMime}`);

  console.log('\nSample Document Rows (first 10):');
  console.log(JSON.stringify(docSamples, null, 2));

  console.log('\n================================================================');
  console.log('3. PROJECT POPULATION AUDIT');
  console.log('================================================================');

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      _count: {
        select: {
          members: true,
          folders: true,
        }
      }
    }
  });

  console.log(`Found ${projects.length} Projects in database.`);
  for (const p of projects) {
    console.log(`- [${p.code}] ${p.name} | Status: ${p.status} | Members: ${p._count.members} | Folders: ${p._count.folders} | Start: ${p.startDate?.toISOString().slice(0, 10) || 'N/A'} | End: ${p.endDate?.toISOString().slice(0, 10) || 'N/A'}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

auditTemporaryData().catch(console.error);
