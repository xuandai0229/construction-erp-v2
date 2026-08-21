import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseRealPdfBuffer } from '../src/lib/ai/documents/parsers/real-pdf-parser';

async function auditDetailed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('================================================================');
  console.log('1. DETAILED OPERATIONAL & TEMPORARY DATA COUNTS');
  console.log('================================================================');

  const models: Record<string, any> = {
    User: prisma.user,
    Project: prisma.project,
    ProjectMember: prisma.projectMember,
    DocumentFolder: prisma.documentFolder,
    Document: prisma.document,
    SiteReport: (prisma as any).siteReport,
    SiteReportLine: (prisma as any).siteReportLine,
    FieldProgressTemplate: (prisma as any).fieldProgressTemplate,
    FieldProgressItem: (prisma as any).fieldProgressItem,
    FieldProgressEntry: (prisma as any).fieldProgressEntry,
    ProjectMaterialStock: (prisma as any).projectMaterialStock,
    MaterialMovement: (prisma as any).materialMovement,
    ApprovalRequest: (prisma as any).approvalRequest,
  };

  const domainCounts: Record<string, number> = {};
  for (const [name, model] of Object.entries(models)) {
    if (model && typeof model.count === 'function') {
      domainCounts[name] = await model.count();
    } else {
      domainCounts[name] = -1;
    }
  }

  for (const [k, v] of Object.entries(domainCounts)) {
    console.log(`- ${k.padEnd(26)}: ${v}`);
  }

  console.log('\n================================================================');
  console.log('2. 21 PROJECTS OPERATIONAL DATA MATRIX');
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
          documentFolders: true,
          documents: true,
          siteReports: true,
          siteReportLines: true,
          fieldProgressEntries: true,
          projectMaterialStocks: true,
          materialMovements: true,
          approvalRequests: true,
        }
      }
    },
    orderBy: { code: 'asc' }
  });

  console.log(`Project Code | Name | Status | Members | Docs | Reports | Lines | Progress | Stocks | Moves | Approvals`);
  console.log(`-------------|------|--------|---------|------|---------|-------|----------|--------|-------|----------`);
  for (const p of projects) {
    const c = p._count;
    console.log(`${p.code.padEnd(12)} | ${p.name.slice(0, 20).padEnd(20)} | ${p.status.padEnd(10)} | ${String(c.members).padStart(7)} | ${String(c.documents).padStart(4)} | ${String(c.siteReports).padStart(7)} | ${String(c.siteReportLines).padStart(5)} | ${String(c.fieldProgressEntries).padStart(8)} | ${String(c.projectMaterialStocks).padStart(6)} | ${String(c.materialMovements).padStart(5)} | ${String(c.approvalRequests).padStart(9)}`);
  }

  console.log('\n================================================================');
  console.log('3. TEST REAL PDF PARSER ON OPERATOR TEMPORARY PDF FILES');
  console.log('================================================================');

  const samplePdf = await prisma.document.findFirst({
    where: {
      mimeType: 'application/pdf',
      originalName: { contains: 'Hop-dong-goi-thau' }
    },
    include: {
      folder: {
        include: { project: true }
      }
    }
  });

  if (samplePdf && samplePdf.storagePath) {
    const fullPath = path.join(process.cwd(), 'storage', samplePdf.storagePath);
    console.log(`Testing parsing on: ${samplePdf.originalName} at ${fullPath}`);
    const buffer = fs.readFileSync(fullPath);
    console.log(`File size: ${buffer.byteLength} bytes`);

    const parseRes = await parseRealPdfBuffer({
      buffer,
      documentId: samplePdf.id,
      documentFamilyId: `FAM-${samplePdf.id}`,
      projectId: samplePdf.folder?.project?.id || 'unknown',
      projectCode: samplePdf.folder?.project?.code || 'CT-UNKNOWN',
      title: samplePdf.displayName || samplePdf.originalName,
      version: 1,
      status: 'APPROVED',
      authorityLevel: 'CURRENT_APPROVED_CONTRACT',
    });

    console.log('Parse Result:');
    console.log(`- Page Count     : ${parseRes.pageCount}`);
    console.log(`- Total Chars    : ${parseRes.totalCharacters}`);
    console.log(`- Has Text Layer : ${parseRes.hasTextLayer}`);
    console.log(`- OCR Required   : ${parseRes.ocrRequired}`);
    console.log(`- Extraction Qual: ${parseRes.extractionQuality}`);
    console.log(`- Chunks Count   : ${parseRes.chunks.length}`);
    if (parseRes.chunks.length > 0) {
      console.log(`\nSample Chunk 1 Text:\n${parseRes.chunks[0].text.slice(0, 300)}...`);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

auditDetailed().catch(console.error);
