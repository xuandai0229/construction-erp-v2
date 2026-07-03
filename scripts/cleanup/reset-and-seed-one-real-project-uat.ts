import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const args = process.argv.slice(2);
const isExecute = args.includes('--execute');
const isDryRun = args.includes('--dry-run');

if (!isExecute && !isDryRun) {
  console.error('Please specify --dry-run or --execute');
  process.exit(1);
}

const STORAGE_ROOT = path.join(process.cwd(), 'storage');
// Valid template files we found in storage
const TEMPLATE_PDF = path.join(STORAGE_ROOT, 'site-reports', 'cmqoq7ts0000hkowkkrtq9v5u', '20260622043935-29d7377a.pdf');
const TEMPLATE_JPG = path.join(STORAGE_ROOT, 'site-reports', 'cmqoq7ts0000hkowkkrtq9v5u', '20260622043934-e5dec214.jpg');

async function main() {
  console.log(`\n--- STARTING UAT DATA RESET & SEED (${isExecute ? 'EXECUTE' : 'DRY RUN'}) ---\n`);

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('No ADMIN user found.');
  console.log(`Using admin: ${admin.id}`);

  // 1. Audit and Reset
  const uatProjects = await prisma.project.findMany({
    where: {
      OR: [
        { code: { startsWith: 'UAT' } },
        { name: { contains: 'UAT' } },
        { name: { contains: 'TEST' } },
        { code: { startsWith: 'TEST' } }
      ]
    }
  });

  const projectIds = uatProjects.map(p => p.id);
  console.log(`Found ${projectIds.length} UAT projects to delete:`, uatProjects.map(p => p.code).join(', '));

  if (projectIds.length > 0) {
    const wbsCount = await prisma.wBSItem.count({ where: { projectId: { in: projectIds } } });
    const fpTemplateCount = await prisma.fieldProgressTemplate.count({ where: { projectId: { in: projectIds } } });
    const fpItemCount = await prisma.fieldProgressItem.count({ where: { projectId: { in: projectIds } } });
    const fpEntryCount = await prisma.fieldProgressEntry.count({ where: { projectId: { in: projectIds } } });
    const folderCount = await prisma.documentFolder.count({ where: { projectId: { in: projectIds } } });
    const docCount = await prisma.document.count({ where: { projectId: { in: projectIds } } });
    const dailyCount = await prisma.siteReport.count({ where: { projectId: { in: projectIds } } });
    const auditCount = await prisma.auditLog.count({ where: { projectId: { in: projectIds } } });
    const attachments = await prisma.siteReportAttachment.findMany({ where: { report: { projectId: { in: projectIds } } } });
    const photos = await prisma.siteReportPhoto.findMany({ where: { report: { projectId: { in: projectIds } } } });

    console.log(`Items to delete:`);
    console.log(` - WBS Items: ${wbsCount}`);
    console.log(` - FieldProgressTemplates: ${fpTemplateCount}`);
    console.log(` - FieldProgressItems: ${fpItemCount}`);
    console.log(` - FieldProgressEntries: ${fpEntryCount}`);
    console.log(` - DocumentFolders: ${folderCount}`);
    console.log(` - Documents: ${docCount}`);
    console.log(` - SiteReports: ${dailyCount}`);
    console.log(` - AuditLogs: ${auditCount}`);
    console.log(` - Attachments: ${attachments.length}`);
    console.log(` - Photos: ${photos.length}`);

    // Track files to delete
    const filesToDelete = [];
    const docs = await prisma.document.findMany({ where: { projectId: { in: projectIds } } });
    for (const d of docs) {
      if (d.storagePath) filesToDelete.push(path.join(STORAGE_ROOT, d.storagePath));
    }
    for (const a of attachments) {
      if (a.storagePath) filesToDelete.push(path.join(STORAGE_ROOT, a.storagePath));
    }
    for (const p of photos) {
      if (p.storageKey) filesToDelete.push(path.join(STORAGE_ROOT, p.storageKey));
    }

    console.log(` - Physical Files: ${filesToDelete.length}`);

    if (isExecute) {
      console.log('\nExecuting deletion...');
      // Clean up files safely
      for (const f of filesToDelete) {
        if (fs.existsSync(f)) {
          fs.unlinkSync(f);
        }
      }
      
      // We rely on Cascade deletes for most things, but AuditLog has SetNull for User, maybe no cascade for project
      await prisma.auditLog.deleteMany({ where: { projectId: { in: projectIds } } });
      
      // Delete projects (Cascades down to almost everything else)
      await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
      console.log('Deletion completed.');
    }
  }

  if (!isExecute) {
    console.log('\nDRY RUN completed. Use --execute to apply changes.');
    return;
  }

  // 2. SEED 1 SINGLE REAL PROJECT
  console.log('\n--- SEEDING NEW UAT PROJECT ---');
  const projectCode = 'UAT-REAL-CT-001';
  const project = await prisma.project.create({
    data: {
      code: projectCode,
      name: 'UAT REAL - Nhà văn phòng 3 tầng',
      investor: 'Công ty TNHH Kiểm thử Xây dựng',
      location: 'Hà Nội',
      status: 'ACTIVE',
      startDate: new Date('2026-06-01T00:00:00Z'),
      endDate: new Date('2026-09-30T23:59:59Z'),
    }
  });
  console.log(`Created Project: ${project.id}`);

  // Field Progress
  const template = await prisma.fieldProgressTemplate.create({
    data: {
      projectId: project.id,
      name: 'Bảng khối lượng chính',
      status: 'ACTIVE',
      createdById: admin.id
    }
  });

  const createGroup = async (name: string, order: number) => 
    prisma.fieldProgressItem.create({ data: { projectId: project.id, templateId: template.id, itemType: 'GROUP', categoryName: name, sortOrder: order, createdById: admin.id } });
  
  const createWork = async (parent: any, name: string, unit: string, qty: number, order: number) => 
    prisma.fieldProgressItem.create({ data: { projectId: project.id, templateId: template.id, parentId: parent.id, itemType: 'WORK', workContent: name, unit, designQuantity: qty, sortOrder: order, createdById: admin.id } });

  const mong = await createGroup('Phần móng', 1);
  const m1 = await createWork(mong, 'Đào đất móng', 'm3', 120, 1);
  const m2 = await createWork(mong, 'Lắp dựng cốt thép móng', 'tấn', 12, 2);
  const m3 = await createWork(mong, 'Lắp dựng cốp pha móng', 'm2', 180, 3);
  const m4 = await createWork(mong, 'Đổ bê tông móng', 'm3', 80, 4);

  const than = await createGroup('Phần thân', 2);
  const t1 = await createWork(than, 'Lắp dựng cốt thép cột tầng 1', 'tấn', 8, 1);
  const t2 = await createWork(than, 'Ghép cốp pha cột tầng 1', 'm2', 150, 2);
  const t3 = await createWork(than, 'Đổ bê tông cột tầng 1', 'm3', 45, 3);
  const t4 = await createWork(than, 'Xây tường tầng 1', 'm2', 350, 4);

  const ht = await createGroup('Hoàn thiện', 3);
  const h1 = await createWork(ht, 'Trát tường tầng 1', 'm2', 320, 1);
  const h2 = await createWork(ht, 'Lát nền tầng 1', 'm2', 250, 2);
  const h3 = await createWork(ht, 'Sơn bả tầng 1', 'm2', 300, 3);
  const h4 = await createWork(ht, 'Lắp đặt cửa tầng 1', 'bộ', 24, 4);

  console.log('Created 12 Field Progress Items');

  const startDate = new Date('2026-06-01T00:00:00Z');
  const entryData = [
    { d: 0, items: [{ i: m1, q: 25 }, { i: m2, q: 1.5 }] },
    { d: 1, items: [{ i: m1, q: 35 }, { i: m2, q: 2.5 }] },
    { d: 2, items: [{ i: m1, q: 30 }, { i: m3, q: 60 }] },
    { d: 3, items: [{ i: m3, q: 80 }, { i: m4, q: 30 }] },
    { d: 4, items: [{ i: m3, q: 40 }, { i: m4, q: 50 }] },
    { d: 5, items: [{ i: t1, q: 2 }, { i: t2, q: 45 }] },
    { d: 6, items: [{ i: t1, q: 1.5 }, { i: t2, q: 35 }] },
  ];

  for (const day of entryData) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + day.d);
    
    for (const it of day.items) {
      await prisma.fieldProgressEntry.create({
        data: {
          projectId: project.id, templateId: template.id, itemId: it.i.id,
          entryDate: d, quantity: it.q, status: 'APPROVED',
          createdById: admin.id, approvedById: admin.id, approvedAt: new Date()
        }
      });
    }
  }
  console.log('Created Field Progress Entries for 7 days');

  // Documents
  const folderNames = ['01_Hợp đồng', '02_Bản vẽ', '03_Dự toán', '04_Nghiệm thu', '05_Hóa đơn', '06_Thanh toán', '07_Hình ảnh hiện trường', '08_Báo cáo ngày'];
  const folders: any = {};
  for (const name of folderNames) {
    folders[name] = await prisma.documentFolder.create({ data: { projectId: project.id, name } });
  }

  // Ensure storage project dir exists
  const docDir = path.join(STORAGE_ROOT, 'projects', project.id, 'documents');
  fs.mkdirSync(docDir, { recursive: true });

  const createValidFile = (name: string, ext: string) => {
    const storageName = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const storagePath = path.join('projects', project.id, 'documents', storageName);
    const absPath = path.join(STORAGE_ROOT, storagePath);
    
    if (ext === 'pdf' && fs.existsSync(TEMPLATE_PDF)) {
      fs.copyFileSync(TEMPLATE_PDF, absPath);
    } else if ((ext === 'jpg' || ext === 'png') && fs.existsSync(TEMPLATE_JPG)) {
      fs.copyFileSync(TEMPLATE_JPG, absPath);
    } else if (ext === 'xlsx') {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet([['Dự toán', 'Số lượng', 'Đơn giá'], ['Móng', 100, 500000]]);
      xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
      xlsx.writeFile(wb, absPath);
    } else {
      // Fallback valid dummy
      fs.writeFileSync(absPath, 'dummy content');
    }
    
    return { storageName, storagePath, size: fs.statSync(absPath).size };
  };

  const docData = [
    { f: '01_Hợp đồng', n: 'UAT REAL DOC - Hop dong thi cong.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '01_Hợp đồng', n: 'UAT REAL DOC - Phu luc hop dong.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '02_Bản vẽ', n: 'UAT REAL DOC - Ban ve mat bang tang 1.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '02_Bản vẽ', n: 'UAT REAL DOC - Ban ve ket cau mong.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '03_Dự toán', n: 'UAT REAL DOC - Du toan khoi luong.xlsx', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { f: '04_Nghiệm thu', n: 'UAT REAL DOC - Bien ban nghiem thu mong.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '05_Hóa đơn', n: 'UAT REAL DOC - Hoa don vat lieu dot 1.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '06_Thanh toán', n: 'UAT REAL DOC - De nghi thanh toan dot 1.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '07_Hình ảnh hiện trường', n: 'UAT REAL DOC - Anh hien truong mong 01.jpg', ext: 'jpg', mime: 'image/jpeg' },
    { f: '07_Hình ảnh hiện trường', n: 'UAT REAL DOC - Anh hien truong cot 01.jpg', ext: 'jpg', mime: 'image/jpeg' },
  ];

  for (const dd of docData) {
    const fData = createValidFile(dd.n, dd.ext);
    await prisma.document.create({
      data: {
        projectId: project.id, folderId: folders[dd.f].id, originalName: dd.n,
        storedName: fData.storageName, mimeType: dd.mime, extension: dd.ext,
        size: fData.size, storagePath: fData.storagePath, uploadedById: admin.id,
        status: 'APPROVED'
      }
    });
  }
  console.log('Created 10 Documents with physical files.');

  // Daily Reports
  const dailyReports = [];
  const reportDir = path.join(STORAGE_ROOT, 'site-reports', project.id);
  fs.mkdirSync(reportDir, { recursive: true });

  const attachFile = async (reportId: string, isImage: boolean) => {
    const ext = isImage ? 'jpg' : 'pdf';
    const storageName = `attach_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const storagePath = path.join('site-reports', project.id, storageName);
    const absPath = path.join(STORAGE_ROOT, storagePath);
    if (isImage && fs.existsSync(TEMPLATE_JPG)) fs.copyFileSync(TEMPLATE_JPG, absPath);
    else if (!isImage && fs.existsSync(TEMPLATE_PDF)) fs.copyFileSync(TEMPLATE_PDF, absPath);
    else fs.writeFileSync(absPath, 'dummy');

    return prisma.siteReportAttachment.create({
      data: {
        reportId, kind: isImage ? 'PHOTO' : 'FILE', fileName: storageName,
        originalName: isImage ? 'Anh_hien_truong.jpg' : 'Tai_lieu_dinh_kem.pdf',
        mimeType: isImage ? 'image/jpeg' : 'application/pdf', sizeBytes: fs.statSync(absPath).size,
        storagePath, publicUrl: `/storage/${storagePath.replace(/\\/g, '/')}`
      }
    });
  };

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    let status = 'APPROVED';
    if (i === 4) status = 'DRAFT';
    if (i === 5) status = 'SUBMITTED';
    if (i === 6) status = 'REJECTED';

    const itemsForDay = entryData[i].items;

    const report = await prisma.siteReport.create({
      data: {
        projectId: project.id, type: 'DAILY', reportDate: d, status: status as any,
        createdById: admin.id, reporterName: admin.name, weatherCondition: 'SUNNY',
        summary: `UAT REAL DATA - Báo cáo ngày ${d.toLocaleDateString('vi-VN')}`,
        materials: 'Xi măng, Cát, Đá, Thép', labor: '20 nhân công', equipment: 'Máy xúc, Máy trộn',
        quality: 'Đạt yêu cầu', issues: 'Không có', recommendations: 'Tiếp tục',
        approvedById: status === 'APPROVED' ? admin.id : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        rejectedReason: status === 'REJECTED' ? 'Cần bổ sung ảnh hiện trường' : null,
        lines: {
          create: itemsForDay.map(it => ({
            projectId: project.id, fieldProgressItemId: it.i.id,
            workContent: it.i.workContent || '', quantityToday: it.q, unit: it.i.unit,
          }))
        }
      }
    });
    
    // Attachments for approved reports
    if (status === 'APPROVED') {
      await attachFile(report.id, true);
      await attachFile(report.id, false);
    }
    
    // Audit logs
    await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'CREATE_SITE_REPORT', entityType: 'SITE_REPORT', entityId: report.id } });
    if (status !== 'DRAFT') {
      await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'SUBMIT_SITE_REPORT', entityType: 'SITE_REPORT', entityId: report.id } });
    }
    if (status === 'APPROVED') {
      await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'APPROVE_SITE_REPORT', entityType: 'SITE_REPORT', entityId: report.id } });
    } else if (status === 'REJECTED') {
      await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'REJECT_SITE_REPORT', entityType: 'SITE_REPORT', entityId: report.id } });
    }
    
    if (status === 'APPROVED') dailyReports.push(report);
  }
  console.log('Created 7 Daily Reports with Workflows');

  // Weekly Report
  const weekEnd = new Date(startDate);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const weeklyReport = await prisma.siteReport.create({
    data: {
      projectId: project.id, type: 'WEEKLY', reportDate: weekEnd,
      weekStartDate: startDate, weekEndDate: weekEnd, status: 'APPROVED',
      createdById: admin.id, reporterName: admin.name,
      summary: 'UAT REAL DATA - Báo cáo tuần 1', issues: 'Khó khăn về thời tiết trong 1 ngày',
      recommendations: 'Tăng cường vật tư tuần tới',
      approvedById: admin.id, approvedAt: new Date(),
      lines: {
        create: [
          { projectId: project.id, workContent: 'Tổng hợp khối lượng Móng', quantityToday: 100 },
          { projectId: project.id, workContent: 'Tổng hợp khối lượng Cột', quantityToday: 50 },
        ]
      }
    }
  });

  await attachFile(weeklyReport.id, true);
  await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'CREATE_SITE_REPORT', entityType: 'SITE_REPORT', entityId: weeklyReport.id } });
  await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'SUBMIT_SITE_REPORT', entityType: 'SITE_REPORT', entityId: weeklyReport.id } });
  await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'APPROVE_SITE_REPORT', entityType: 'SITE_REPORT', entityId: weeklyReport.id } });
  console.log('Created 1 Weekly Report with History and Attachment');

  console.log('\n--- SEED COMPLETED SUCCESSFULLY ---');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
