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

async function main() {
  console.log(`\n--- STARTING FULL CONSTRUCTION DATA RESET & SEED (${isExecute ? 'EXECUTE' : 'DRY RUN'}) ---\n`);

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('No ADMIN user found.');
  console.log(`Using admin: ${admin.id} (${admin.name})`);

  // 1. Audit and Reset ALL projects
  const allProjects = await prisma.project.findMany();
  const projectIds = allProjects.map(p => p.id);
  console.log(`Found ${projectIds.length} projects to delete.`);

  if (projectIds.length > 0) {
    const fpTemplateCount = await prisma.fieldProgressTemplate.count({ where: { projectId: { in: projectIds } } });
    const fpItemCount = await prisma.fieldProgressItem.count({ where: { projectId: { in: projectIds } } });
    const fpEntryCount = await prisma.fieldProgressEntry.count({ where: { projectId: { in: projectIds } } });
    const folderCount = await prisma.documentFolder.count({ where: { projectId: { in: projectIds } } });
    const docCount = await prisma.document.count({ where: { projectId: { in: projectIds } } });
    const dailyCount = await prisma.siteReport.count({ where: { projectId: { in: projectIds } } });
    const auditCount = await prisma.auditLog.count({ where: { projectId: { in: projectIds } } });
    const attachments = await prisma.siteReportAttachment.findMany({ where: { report: { projectId: { in: projectIds } } } });
    const docs = await prisma.document.findMany({ where: { projectId: { in: projectIds } } });

    console.log(`Items to delete:`);
    console.log(` - Projects: ${projectIds.length}`);
    console.log(` - FieldProgressTemplates: ${fpTemplateCount}`);
    console.log(` - FieldProgressItems: ${fpItemCount}`);
    console.log(` - FieldProgressEntries: ${fpEntryCount}`);
    console.log(` - DocumentFolders: ${folderCount}`);
    console.log(` - Documents: ${docCount}`);
    console.log(` - SiteReports: ${dailyCount}`);
    console.log(` - AuditLogs: ${auditCount}`);
    console.log(` - Attachments: ${attachments.length}`);

    const filesToDelete: string[] = [];
    for (const d of docs) {
      if (d.storagePath) filesToDelete.push(path.join(STORAGE_ROOT, d.storagePath));
    }
    for (const a of attachments) {
      if (a.storagePath) filesToDelete.push(path.join(STORAGE_ROOT, a.storagePath));
    }

    console.log(` - Physical Files: ${filesToDelete.length}`);

    if (isExecute) {
      console.log('\nExecuting deletion...');
      // 1. Delete physical files
      for (const f of filesToDelete) {
        if (fs.existsSync(f) && f.includes('storage')) {
          try { fs.unlinkSync(f); } catch (e) { /* ignore */ }
        }
      }
      
      // 2. Delete AuditLogs
      await prisma.auditLog.deleteMany({ where: { projectId: { in: projectIds } } });
      
      // Delete other manual orphans if schema doesn't cascade
      await prisma.siteReportLine.deleteMany({ where: { projectId: { in: projectIds } } });

      // 3. Delete projects (cascades)
      await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
      
      console.log('Deletion completed.');
    }
  }

  if (!isExecute) {
    console.log('\nDRY RUN completed. Use --execute to apply changes.');
    return;
  }

  // 2. SEED ONE SINGLE REAL PROJECT
  console.log('\n--- SEEDING NEW REAL PROJECT ---');
  const projectCode = 'TH-1234';
  const project = await prisma.project.create({
    data: {
      code: projectCode,
      name: 'Công trường Trung học A',
      investor: 'UBND Quận Tây Hồ',
      location: 'Tây Hồ, Hà Nội',
      status: 'ACTIVE',
      startDate: new Date('2026-06-01T00:00:00Z'),
      endDate: new Date('2027-04-02T23:59:59Z'),
    }
  });
  console.log(`Created Project: ${project.name} (${project.code})`);

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

  const grp1 = await createGroup('Chuẩn bị mặt bằng', 1);
  const w1 = await createWork(grp1, 'Rào chắn công trường', 'm', 180, 1);
  const w2 = await createWork(grp1, 'Dọn dẹp mặt bằng', 'm2', 1200, 2);
  const w3 = await createWork(grp1, 'Định vị tim trục', 'điểm', 36, 3);

  const grp2 = await createGroup('Phần móng', 2);
  const w4 = await createWork(grp2, 'Đào đất móng', 'm3', 420, 1);
  const w5 = await createWork(grp2, 'Lắp dựng cốt thép móng', 'tấn', 18, 2);
  const w6 = await createWork(grp2, 'Lắp dựng cốp pha móng', 'm2', 260, 3);
  const w7 = await createWork(grp2, 'Đổ bê tông lót móng', 'm3', 35, 4);
  const w8 = await createWork(grp2, 'Đổ bê tông móng', 'm3', 120, 5);

  const grp3 = await createGroup('Phần thân tầng 1', 3);
  const w9 = await createWork(grp3, 'Lắp dựng cốt thép cột tầng 1', 'tấn', 12, 1);
  const w10 = await createWork(grp3, 'Ghép cốp pha cột tầng 1', 'm2', 210, 2);
  const w11 = await createWork(grp3, 'Đổ bê tông cột tầng 1', 'm3', 65, 3);
  const w12 = await createWork(grp3, 'Xây tường tầng 1', 'm2', 480, 4);

  const grp4 = await createGroup('Hoàn thiện tầng 1', 4);
  const w13 = await createWork(grp4, 'Trát tường tầng 1', 'm2', 460, 1);
  const w14 = await createWork(grp4, 'Lát nền tầng 1', 'm2', 380, 2);
  const w15 = await createWork(grp4, 'Sơn bả tầng 1', 'm2', 520, 3);
  const w16 = await createWork(grp4, 'Lắp đặt cửa tầng 1', 'bộ', 32, 4);

  console.log('Created 4 Groups and 16 Field Progress Items');

  const startDate = new Date('2026-06-01T00:00:00Z');
  
  const dailyEntries = [
    // Tuan 1
    { d: 0, items: [{i: w1, q: 60}, {i: w2, q: 300}, {i: w3, q: 12}] },
    { d: 1, items: [{i: w1, q: 70}, {i: w2, q: 400}, {i: w3, q: 12}] },
    { d: 2, items: [{i: w1, q: 50}, {i: w2, q: 500}, {i: w3, q: 12}, {i: w4, q: 60}] },
    { d: 3, items: [{i: w4, q: 90}, {i: w5, q: 2}] },
    { d: 4, items: [{i: w4, q: 100}, {i: w5, q: 3}, {i: w6, q: 40}] },
    { d: 5, items: [{i: w4, q: 80}, {i: w5, q: 4}, {i: w6, q: 60}] },
    { d: 6, items: [{i: w4, q: 60}, {i: w5, q: 3}, {i: w6, q: 70}] },
    // Tuan 2
    { d: 7, items: [{i: w4, q: 30}, {i: w5, q: 3}, {i: w6, q: 50}] },
    { d: 8, items: [{i: w5, q: 3}, {i: w6, q: 40}, {i: w7, q: 15}] },
    { d: 9, items: [{i: w7, q: 20}, {i: w8, q: 35}] },
    { d: 10, items: [{i: w8, q: 45}, {i: w9, q: 2}] },
    { d: 11, items: [{i: w8, q: 40}, {i: w9, q: 3}, {i: w10, q: 50}] },
    { d: 12, items: [{i: w9, q: 4}, {i: w10, q: 70}] },
    { d: 13, items: [{i: w9, q: 3}, {i: w10, q: 90}, {i: w11, q: 20}] },
  ];

  for (const day of dailyEntries) {
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
  console.log('Created Field Progress Entries for 14 days');

  // Documents
  const folderNames = ['01_Hợp đồng', '02_Bản vẽ', '03_Dự toán', '04_Nghiệm thu', '05_Hóa đơn', '06_Thanh toán', '07_Hình ảnh hiện trường', '08_Báo cáo ngày'];
  const folders: Record<string, string> = {};
  for (const name of folderNames) {
    const f = await prisma.documentFolder.create({ data: { projectId: project.id, name } });
    folders[name] = f.id;
  }

  const docDir = path.join(STORAGE_ROOT, 'projects', project.id, 'documents');
  fs.mkdirSync(docDir, { recursive: true });

  const createValidFile = (name: string, ext: string) => {
    const storageName = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const storagePath = path.join('projects', project.id, 'documents', storageName);
    const absPath = path.join(STORAGE_ROOT, storagePath);
    
    if (ext === 'pdf') {
      fs.writeFileSync(absPath, '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n188\n%%EOF');
    } else if (ext === 'jpg' || ext === 'png') {
      const base64Jpg = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
      fs.writeFileSync(absPath, Buffer.from(base64Jpg, 'base64'));
    } else if (ext === 'xlsx') {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet([['STT', 'Ten', 'Don gia'], [1, 'Mock', 100]]);
      xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
      xlsx.writeFile(wb, absPath);
    } else {
      fs.writeFileSync(absPath, 'dummy content');
    }
    return { storageName, storagePath, size: fs.statSync(absPath).size };
  };

  const docData = [
    { f: '01_Hợp đồng', n: 'HD-TH1234-Hop-dong-thi-cong.pdf', ext: 'pdf' },
    { f: '01_Hợp đồng', n: 'HD-TH1234-Phu-luc-hop-dong.pdf', ext: 'pdf' },
    { f: '02_Bản vẽ', n: 'BV-TH1234-Mat-bang-tong-the.pdf', ext: 'pdf' },
    { f: '02_Bản vẽ', n: 'BV-TH1234-Ket-cau-mong.pdf', ext: 'pdf' },
    { f: '02_Bản vẽ', n: 'BV-TH1234-Mat-bang-tang-1.pdf', ext: 'pdf' },
    { f: '03_Dự toán', n: 'DT-TH1234-Du-toan-khoi-luong.xlsx', ext: 'xlsx' },
    { f: '03_Dự toán', n: 'DT-TH1234-Tong-hop-vat-tu.xlsx', ext: 'xlsx' },
    { f: '04_Nghiệm thu', n: 'NT-TH1234-Bien-ban-nghiem-thu-dao-dat.pdf', ext: 'pdf' },
    { f: '04_Nghiệm thu', n: 'NT-TH1234-Bien-ban-nghiem-thu-mong.pdf', ext: 'pdf' },
    { f: '05_Hóa đơn', n: 'HDON-TH1234-Hoa-don-vat-lieu-dot-1.pdf', ext: 'pdf' },
    { f: '05_Hóa đơn', n: 'HDON-TH1234-Hoa-don-be-tong-dot-1.pdf', ext: 'pdf' },
    { f: '06_Thanh toán', n: 'TT-TH1234-De-nghi-thanh-toan-dot-1.pdf', ext: 'pdf' },
    { f: '06_Thanh toán', n: 'TT-TH1234-Bang-xac-nhan-khoi-luong-dot-1.pdf', ext: 'pdf' },
    { f: '07_Hình ảnh hiện trường', n: 'IMG-TH1234-Hien-truong-ngay-01.jpg', ext: 'jpg' },
    { f: '07_Hình ảnh hiện trường', n: 'IMG-TH1234-Hien-truong-mong-01.jpg', ext: 'jpg' },
    { f: '08_Báo cáo ngày', n: 'BCN-TH1234-Bao-cao-ngay-2026-06-01.pdf', ext: 'pdf' },
  ];

  for (const dd of docData) {
    const fData = createValidFile(dd.n, dd.ext);
    const mime = dd.ext === 'pdf' ? 'application/pdf' : (dd.ext === 'jpg' ? 'image/jpeg' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await prisma.document.create({
      data: {
        projectId: project.id, folderId: folders[dd.f], originalName: dd.n,
        storedName: fData.storageName, mimeType: mime, extension: dd.ext,
        size: fData.size, storagePath: fData.storagePath, uploadedById: admin.id,
        status: 'APPROVED', displayName: dd.n
      }
    });
  }
  console.log(`Created ${docData.length} Documents with physical files.`);

  // Reports
  const dailyReports = [];
  const reportDir = path.join(STORAGE_ROOT, 'site-reports', project.id);
  fs.mkdirSync(reportDir, { recursive: true });

  const attachFileToReport = async (reportId: string, isImage: boolean) => {
    const ext = isImage ? 'jpg' : 'pdf';
    const fData = createValidFile(`attach.${ext}`, ext);
    // Move it to site-reports
    const finalStoragePath = path.join('site-reports', project.id, fData.storageName);
    const finalAbsPath = path.join(STORAGE_ROOT, finalStoragePath);
    fs.renameSync(path.join(STORAGE_ROOT, fData.storagePath), finalAbsPath);

    return prisma.siteReportAttachment.create({
      data: {
        reportId, kind: isImage ? 'PHOTO' : 'FILE', fileName: fData.storageName,
        originalName: isImage ? 'Anh_hien_truong.jpg' : 'Tai_lieu_dinh_kem.pdf',
        mimeType: isImage ? 'image/jpeg' : 'application/pdf', sizeBytes: fData.size,
        storagePath: finalStoragePath, publicUrl: `/storage/${finalStoragePath.replace(/\\/g, '/')}`
      }
    });
  };

  // Status Distribution: 10 APPROVED, 2 SUBMITTED, 1 DRAFT, 1 REJECTED
  // To reach exactly 14, let's distribute over 14 days
  const statusArray = ['APPROVED','APPROVED','APPROVED','APPROVED','APPROVED','APPROVED','APPROVED','APPROVED','APPROVED','APPROVED','SUBMITTED','SUBMITTED','DRAFT','REJECTED'];

  for (let i = 0; i < 14; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const status = statusArray[i];
    const itemsForDay = dailyEntries[i].items;
    
    // YYYYMMDD
    const dateStr = d.toISOString().split('T')[0].replace(/-/g, '');
    const reportNo = `BCN-TH1234-${dateStr}`;

    const report = await prisma.siteReport.create({
      data: {
        projectId: project.id, type: 'DAILY', reportNo, reportDate: d, status: status as any,
        createdById: admin.id, reporterName: admin.name, weatherCondition: 'SUNNY', weatherTemperature: 32,
        summary: `Báo cáo ngày ${d.toLocaleDateString('vi-VN')}`,
        materials: 'Đầy đủ', labor: '30 nhân công', equipment: 'Hoạt động tốt',
        quality: 'Đạt yêu cầu kỹ thuật', issues: 'Không có', recommendations: 'Tiếp tục theo kế hoạch',
        approvedById: status === 'APPROVED' ? admin.id : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        rejectedReason: status === 'REJECTED' ? 'Sai khối lượng bê tông' : null,
        lines: {
          create: itemsForDay.map(it => ({
            projectId: project.id, fieldProgressItemId: it.i.id,
            workContent: it.i.workContent || '', quantityToday: it.q, unit: it.i.unit,
          }))
        }
      }
    });
    
    // Attachments for all
    await attachFileToReport(report.id, true); // image
    if (i % 2 === 0) await attachFileToReport(report.id, false); // file on even days
    
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
  console.log('Created 14 Daily Reports with Workflows');

  // Weekly Reports
  const createWeekly = async (wStart: Date, wEnd: Date, reportNo: string, status: string, summary: string, issues: string, rec: string) => {
    const weeklyReport = await prisma.siteReport.create({
      data: {
        projectId: project.id, type: 'WEEKLY', reportNo, reportDate: wEnd,
        weekStartDate: wStart, weekEndDate: wEnd, status: status as any,
        createdById: admin.id, reporterName: admin.name,
        summary, issues, recommendations: rec,
        approvedById: status === 'APPROVED' ? admin.id : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        lines: {
          create: [
            { projectId: project.id, workContent: 'Tổng hợp công việc trong tuần', quantityToday: 1 },
          ]
        }
      }
    });

    await attachFileToReport(weeklyReport.id, true);
    await attachFileToReport(weeklyReport.id, false);
    
    await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'CREATE_SITE_REPORT', entityType: 'SITE_REPORT', entityId: weeklyReport.id } });
    await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'SUBMIT_SITE_REPORT', entityType: 'SITE_REPORT', entityId: weeklyReport.id } });
    if (status === 'APPROVED') {
      await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'APPROVE_SITE_REPORT', entityType: 'SITE_REPORT', entityId: weeklyReport.id } });
    }
  }

  const w1End = new Date(startDate); w1End.setDate(w1End.getDate() + 6);
  await createWeekly(startDate, w1End, 'BCT-TH1234-20260601-20260607', 'APPROVED',
    'Hoàn thành công tác chuẩn bị mặt bằng, rào chắn và triển khai đào đất móng.',
    'Một số khu vực mặt bằng còn vướng vật tư cũ, đã xử lý trong ngày 06/06.',
    'Tuần tiếp theo tiếp tục hoàn thiện cốp pha, cốt thép móng và bắt đầu bê tông lót.');

  const w2Start = new Date(startDate); w2Start.setDate(w2Start.getDate() + 7);
  const w2End = new Date(startDate); w2End.setDate(w2End.getDate() + 13);
  await createWeekly(w2Start, w2End, 'BCT-TH1234-20260608-20260614', 'SUBMITTED',
    'Hoàn thành bê tông lót, bê tông móng và chuyển sang thi công cốt thép/cốp pha cột tầng 1.',
    'Thời tiết nắng nóng, cần bố trí che chắn và cấp nước đầy đủ cho tổ đội.',
    'Tuần tiếp theo tiếp tục đổ bê tông cột tầng 1 và chuẩn bị xây tường tầng 1.');

  console.log('Created 2 Weekly Reports');

  console.log('\n--- FULL RESET AND SEED COMPLETED SUCCESSFULLY ---');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
