import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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
    if (isExecute) {
      console.log('\nExecuting deletion...');
      const docs = await prisma.document.findMany({ where: { projectId: { in: projectIds } } });
      const attachments = await prisma.siteReportAttachment.findMany({ where: { report: { projectId: { in: projectIds } } } });

      const filesToDelete: string[] = [];
      for (const d of docs) {
        if (d.storagePath) filesToDelete.push(path.join(STORAGE_ROOT, d.storagePath));
      }
      for (const a of attachments) {
        if (a.storagePath) filesToDelete.push(path.join(STORAGE_ROOT, a.storagePath));
      }

      for (const f of filesToDelete) {
        if (fs.existsSync(f) && f.includes('storage')) {
          try { fs.unlinkSync(f); } catch (e) { /* ignore */ }
        }
      }
      
      await prisma.auditLog.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.siteReportLine.deleteMany({ where: { projectId: { in: projectIds } } });
      await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
      
      console.log('Deletion completed.');
    }
  }

  if (!isExecute) {
    console.log('\nDRY RUN completed. Use --execute to apply changes.');
    return;
  }

  // 2. SEED ONE SINGLE REAL PROJECT
  console.log('\n--- SEEDING NEW REAL PROJECT: TRƯỜNG HỌC CHU VĂN AN ---');
  const project = await prisma.project.create({
    data: {
      code: 'TH-125',
      name: 'Trường học Chu Văn An',
      description: 'Xây trường học',
      investor: 'Phường Tây Hồ',
      location: 'Tây Hồ',
      status: 'ACTIVE',
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2027-06-17T23:59:59Z'),
    }
  });
  console.log(`Created Project: ${project.name} (${project.code})`);

  // Field Progress
  const template = await prisma.fieldProgressTemplate.create({
    data: {
      projectId: project.id,
      name: 'Bảng khối lượng gốc',
      status: 'ACTIVE',
      createdById: admin.id
    }
  });

  const createGroup = async (name: string, order: number) => 
    prisma.fieldProgressItem.create({ data: { projectId: project.id, templateId: template.id, itemType: 'GROUP', categoryName: name, sortOrder: order, createdById: admin.id } });
  
  const createWork = async (parent: any, name: string, unit: string, qty: number, order: number, crew: string, note: string) => 
    prisma.fieldProgressItem.create({ data: { projectId: project.id, templateId: template.id, parentId: parent.id, itemType: 'WORK', workContent: name, unit, designQuantity: qty, sortOrder: order, createdById: admin.id, constructionCrew: crew, note } });

  const g1 = await createGroup('MÓNG', 1);
  const w1_1 = await createWork(g1, 'Đào móng', 'm3', 2222, 1, 'Mũi 01', 'Đào đất móng khu nhà học chính');
  const w1_2 = await createWork(g1, 'Bê tông lót móng', 'm3', 180, 2, 'Mũi 01', 'Bê tông lót đá 4x6, M100');
  const w1_3 = await createWork(g1, 'Gia công lắp dựng cốt thép móng', 'kg', 28500, 3, 'Mũi 01', 'Cốt thép đài móng, giằng móng');
  const w1_4 = await createWork(g1, 'Lắp dựng cốp pha móng', 'm2', 920, 4, 'Mũi 01', 'Cốp pha đài móng và giằng móng');
  const w1_5 = await createWork(g1, 'Đổ bê tông móng', 'm3', 520, 5, 'Mũi 01', 'Bê tông móng khu nhà học');

  const g2 = await createGroup('KẾT CẤU TẦNG 1', 2);
  const w2_1 = await createWork(g2, 'Gia công lắp dựng cốt thép cột tầng 1', 'kg', 16800, 1, 'Mũi 02', 'Cốt thép cột khu nhà học tầng 1');
  const w2_2 = await createWork(g2, 'Lắp dựng cốp pha cột tầng 1', 'm2', 650, 2, 'Mũi 02', 'Cốp pha cột tầng 1');
  const w2_3 = await createWork(g2, 'Đổ bê tông cột tầng 1', 'm3', 135, 3, 'Mũi 02', 'Bê tông cột tầng 1');
  const w2_4 = await createWork(g2, 'Gia công lắp dựng cốt thép dầm sàn tầng 1', 'kg', 24500, 4, 'Mũi 02', 'Cốt thép dầm sàn tầng 1');
  const w2_5 = await createWork(g2, 'Đổ bê tông dầm sàn tầng 1', 'm3', 430, 5, 'Mũi 02', 'Bê tông dầm sàn tầng 1');

  const g3 = await createGroup('XÂY TƯỜNG', 3);
  const w3_1 = await createWork(g3, 'Xây tường gạch tầng 1', 'm2', 1280, 1, 'Mũi 03', 'Xây tường bao và tường ngăn tầng 1');
  const w3_2 = await createWork(g3, 'Xây tường gạch tầng 2', 'm2', 1210, 2, 'Mũi 03', 'Xây tường bao và tường ngăn tầng 2');
  const w3_3 = await createWork(g3, 'Trát tường trong nhà', 'm2', 2460, 3, 'Mũi 03', 'Trát tường trong các phòng học');
  const w3_4 = await createWork(g3, 'Trát tường ngoài nhà', 'm2', 1850, 4, 'Mũi 03', 'Trát mặt ngoài nhà học');

  const g4 = await createGroup('HOÀN THIỆN', 4);
  const w4_1 = await createWork(g4, 'Lát nền phòng học', 'm2', 1650, 1, 'Mũi 04', 'Lát gạch nền khu phòng học');
  const w4_2 = await createWork(g4, 'Ốp lát khu vệ sinh', 'm2', 420, 2, 'Mũi 04', 'Ốp lát tường và nền khu vệ sinh');
  const w4_3 = await createWork(g4, 'Sơn bả trong nhà', 'm2', 3280, 3, 'Mũi 04', 'Sơn bả hoàn thiện trong nhà');
  const w4_4 = await createWork(g4, 'Sơn ngoài nhà', 'm2', 2100, 4, 'Mũi 04', 'Sơn hoàn thiện mặt ngoài');
  const w4_5 = await createWork(g4, 'Lắp đặt cửa đi, cửa sổ', 'bộ', 145, 5, 'Mũi 04', 'Cửa nhôm kính, cửa gỗ phòng học');

  const g5 = await createGroup('HẠ TẦNG PHỤ TRỢ', 5);
  const w5_1 = await createWork(g5, 'Thi công sân bê tông', 'm2', 1250, 1, 'Mũi 05', 'Sân trường bê tông hoàn thiện');
  const w5_2 = await createWork(g5, 'Thi công rãnh thoát nước', 'md', 320, 2, 'Mũi 05', 'Rãnh thoát nước quanh công trình');
  const w5_3 = await createWork(g5, 'Lắp đặt hệ thống cấp thoát nước', 'bộ', 1, 3, 'Mũi 05', 'Hệ thống cấp thoát nước toàn công trình');
  const w5_4 = await createWork(g5, 'Lắp đặt hệ thống điện chiếu sáng', 'bộ', 1, 4, 'Mũi 05', 'Điện chiếu sáng trong nhà và ngoài sân');

  console.log('Created Field Progress Items.');

  // Create Documents Structure
  const folderNames = ['01. Hợp đồng', '02. Bản vẽ', '03. Dự toán', '04. Nghiệm thu', '05. Hóa đơn', '06. Thanh toán', '07. Hình ảnh hiện trường', '08. Báo cáo ngày'];
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
    } else {
      fs.writeFileSync(absPath, 'dummy content');
    }
    return { storageName, storagePath, size: fs.statSync(absPath).size };
  };

  const docsToCreate = [
    { f: '01. Hợp đồng', n: 'Hợp đồng thi công xây dựng Trường học Chu Văn An.pdf', ext: 'pdf' },
    { f: '02. Bản vẽ', n: 'Bản vẽ thiết kế thi công kiến trúc.pdf', ext: 'pdf' },
    { f: '02. Bản vẽ', n: 'Bản vẽ kết cấu móng và thân.pdf', ext: 'pdf' },
    { f: '03. Dự toán', n: 'Dự toán thi công công trình Trường học Chu Văn An.pdf', ext: 'pdf' },
    { f: '04. Nghiệm thu', n: 'Biên bản nghiệm thu đào móng ngày 23-06-2026.pdf', ext: 'pdf' },
    { f: '07. Hình ảnh hiện trường', n: 'Hình ảnh hiện trường thi công móng ngày 23-06-2026.jpg', ext: 'jpg' },
    { f: '08. Báo cáo ngày', n: 'Báo cáo hiện trường ngày 23-06-2026.pdf', ext: 'pdf' }
  ];

  for (const dd of docsToCreate) {
    const fData = createValidFile(dd.n, dd.ext);
    const mime = dd.ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
    await prisma.document.create({
      data: {
        projectId: project.id, folderId: folders[dd.f], originalName: dd.n,
        storedName: fData.storageName, mimeType: mime, extension: dd.ext,
        size: fData.size, storagePath: fData.storagePath, uploadedById: admin.id,
        status: 'SUBMITTED', displayName: dd.n
      }
    });
  }

  // Daily Reports & Field Progress Entries
  const dailyData = [
    {
      date: '2026-06-23',
      temp: 32, weather: 'SUNNY',
      sum: 'Thi công đào móng khu vực nhà học chính, trục A-B',
      mat: 'Xi măng PCB40: 85 bao\nCát vàng: 18 m³\nĐá 1x2: 25 m³\nThép D16, D20: sử dụng theo bản vẽ kết cấu móng',
      lab: '01 máy đào\n01 máy đầm cóc\n02 thợ trắc đạc\n08 công nhân thi công móng\n01 cán bộ kỹ thuật giám sát',
      qual: 'Cao độ đáy móng đã được kiểm tra trước khi đổ bê tông lót. Khu vực thi công đảm bảo đúng tim trục, phạm vi móng và biện pháp an toàn theo yêu cầu.',
      iss: 'Không có phát sinh lớn trong ngày. Một số vị trí đất nền ẩm cần tiếp tục theo dõi trước khi thi công cốt thép móng.',
      rec: 'Đề nghị bổ sung thép D16, D20 và xi măng PCB40 để phục vụ thi công móng các khu vực tiếp theo.',
      items: [
        { i: w1_1, q: 180, note: 'Đào móng khu nhà học chính, hoàn thành khu vực trục A-B' },
        { i: w1_2, q: 25, note: 'Đổ bê tông lót móng khu vực trục A-B' },
        { i: w1_3, q: 1250, note: 'Gia công thép đài móng M1-M4' }
      ]
    },
    {
      date: '2026-06-24',
      temp: 33, weather: 'SUNNY',
      sum: 'Tiếp tục đào móng khu vực trục C-D',
      mat: 'Thép D16: 950 kg\nThép D20: 850 kg\nVán khuôn: 85 m²\nDầu chống dính cốp pha: 12 lít',
      lab: '01 máy đào\n01 máy cắt uốn thép\n10 công nhân thép\n05 công nhân cốp pha\n01 cán bộ kỹ thuật',
      qual: 'Thép giằng móng được lắp dựng theo bản vẽ kết cấu. Các vị trí nối thép và khoảng cách đai được kiểm tra trong quá trình thi công.',
      iss: 'Không có phát sinh ảnh hưởng tiến độ.',
      rec: 'Đề nghị chuẩn bị vật tư bê tông và nhân lực để đổ bê tông móng đợt tiếp theo.',
      items: [
        { i: w1_1, q: 220, note: 'Tiếp tục đào móng khu vực trục C-D' },
        { i: w1_3, q: 1800, note: 'Lắp dựng thép giằng móng' },
        { i: w1_4, q: 85, note: 'Lắp cốp pha đài móng khu vực trục A-B' }
      ]
    },
    {
      date: '2026-06-25', temp: 32, weather: 'SUNNY',
      sum: 'Hoàn thành đào móng khu vực trục E-F',
      items: [
        { i: w1_1, q: 260, note: 'Hoàn thành đào móng khu vực trục E-F' },
        { i: w1_2, q: 35, note: 'Đổ bê tông lót phần móng đã nghiệm thu' },
        { i: w1_4, q: 110, note: 'Lắp dựng cốp pha giằng móng' }
      ]
    },
    {
      date: '2026-06-26', temp: 31, weather: 'SUNNY',
      sum: 'Đổ bê tông móng đợt 1',
      items: [
        { i: w1_3, q: 2100, note: 'Lắp dựng thép móng khu vực trục C-D' },
        { i: w1_4, q: 130, note: 'Hoàn thiện cốp pha móng trước khi nghiệm thu' },
        { i: w1_5, q: 65, note: 'Đổ bê tông móng đợt 1' }
      ]
    },
    {
      date: '2026-06-27', temp: 31, weather: 'SUNNY',
      sum: 'Đổ bê tông móng đợt 2',
      items: [
        { i: w1_5, q: 90, note: 'Đổ bê tông móng đợt 2' },
        { i: w2_1, q: 950, note: 'Gia công thép cột tầng 1 khu vực trục A-B' }
      ]
    }
  ];

  for (const d of dailyData) {
    const reportDate = new Date(`${d.date}T16:30:00Z`);
    const dateStr = reportDate.toISOString().split('T')[0].replace(/-/g, '');
    const reportNo = `BCN-${project.code}-${dateStr}`;

    for (const it of d.items) {
      await prisma.fieldProgressEntry.create({
        data: {
          projectId: project.id, templateId: template.id, itemId: it.i.id,
          entryDate: reportDate, quantity: it.q, note: it.note, status: 'SUBMITTED',
          createdById: admin.id
        }
      });
    }

    const report = await prisma.siteReport.create({
      data: {
        projectId: project.id, type: 'DAILY', reportNo, reportDate, status: 'SUBMITTED',
        createdById: admin.id, reporterName: admin.name, weatherCondition: d.weather as any, weatherTemperature: d.temp,
        summary: d.sum || `Báo cáo ngày ${d.date}`,
        materials: d.mat || null, labor: d.lab || null,
        quality: d.qual || null, issues: d.iss || null, recommendations: d.rec || null,
        lines: {
          create: d.items.map(it => ({
            projectId: project.id, fieldProgressItemId: it.i.id,
            workContent: it.i.workContent || '', quantityToday: it.q, unit: it.i.unit, note: it.note
          }))
        }
      }
    });

    await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'CREATE_SITE_REPORT', entityType: 'SITE_REPORT', entityId: report.id } });
    await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'SUBMIT_SITE_REPORT', entityType: 'SITE_REPORT', entityId: report.id } });
  }

  // Weekly Report
  const wStart = new Date('2026-06-23T00:00:00Z');
  const wEnd = new Date('2026-06-29T23:59:59Z');
  const weeklyReport = await prisma.siteReport.create({
    data: {
      projectId: project.id, type: 'WEEKLY', reportNo: `BCT-${project.code}-20260623-20260629`, reportDate: wEnd,
      weekStartDate: wStart, weekEndDate: wEnd, status: 'SUBMITTED',
      createdById: admin.id, reporterName: admin.name, weatherCondition: 'SUNNY', weatherTemperature: 32,
      summary: 'Trong tuần từ ngày 23/06/2026 đến 29/06/2026, công trường tập trung thi công các hạng mục phần móng khu nhà học chính. Các công việc chính gồm đào móng, bê tông lót móng, gia công lắp dựng cốt thép móng, lắp dựng cốp pha móng và đổ bê tông móng đợt đầu.\n\nTiến độ thi công cơ bản đáp ứng kế hoạch tuần. Công tác kiểm tra cao độ, tim trục và điều kiện thi công được thực hiện thường xuyên. Chưa ghi nhận phát sinh lớn ảnh hưởng đến tiến độ tổng thể.\n\n* Đào móng: thực hiện 660 m³\n* Bê tông lót móng: thực hiện 60 m³\n* Gia công lắp dựng cốt thép móng: thực hiện 5150 kg\n* Lắp dựng cốp pha móng: thực hiện 325 m²\n* Đổ bê tông móng: thực hiện 155 m³\n* Gia công lắp dựng cốt thép cột tầng 1: thực hiện 950 kg',
      materials: '* Xi măng PCB40: khoảng 220 bao\n* Cát vàng: khoảng 45 m³\n* Đá 1x2: khoảng 70 m³\n* Thép D16, D20: khoảng 5150 kg\n* Ván khuôn: khoảng 325 m²\n* Dầu chống dính cốp pha: khoảng 35 lít',
      labor: '* 01 máy đào\n* 01 máy đầm cóc\n* 01 máy cắt uốn thép\n* 01 máy trộn phụ trợ\n* 08-15 công nhân/ngày tùy thời điểm\n* 01 cán bộ kỹ thuật\n* 01 cán bộ an toàn\n* 01 chỉ huy trưởng công trường',
      quality: 'Các công việc phần móng được thi công theo bản vẽ thiết kế. Trước khi đổ bê tông, các khu vực móng được kiểm tra cao độ, kích thước hình học và điều kiện vệ sinh hố móng. Công tác cốt thép và cốp pha được kiểm tra trước khi chuyển bước thi công.',
      issues: 'Một số vị trí đất nền có độ ẩm cao sau mưa nhỏ đầu tuần, cần tiếp tục theo dõi trước khi thi công đại trà các khu vực còn lại. Chưa phát sinh vấn đề ảnh hưởng lớn đến tiến độ chung.',
      recommendations: '* Bổ sung thép D16, D20 phục vụ thi công phần móng còn lại.\n* Chuẩn bị thêm xi măng PCB40, đá 1x2 và cát vàng cho kế hoạch đổ bê tông tiếp theo.\n* Tăng cường kiểm tra an toàn tại khu vực hố móng.\n* Bố trí nhân công cốp pha và cốt thép ổn định trong tuần tiếp theo.',
      lines: {
        create: [
          { projectId: project.id, workContent: 'Tổng hợp công việc trong tuần 23/06-29/06', quantityToday: 1 },
        ]
      }
    }
  });

  await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'CREATE_SITE_REPORT', entityType: 'SITE_REPORT', entityId: weeklyReport.id } });
  await prisma.auditLog.create({ data: { userId: admin.id, projectId: project.id, action: 'SUBMIT_SITE_REPORT', entityType: 'SITE_REPORT', entityId: weeklyReport.id } });

  // Material Requests
  await prisma.materialRequest.create({
    data: {
      projectId: project.id, requestNo: `YC-${project.code}-001`, requestedById: admin.id,
      requestDate: new Date('2026-06-26T00:00:00Z'), neededDate: new Date('2026-06-28T00:00:00Z'),
      status: 'SUBMITTED', priority: 'HIGH', note: 'Cấp vật tư phục vụ thi công móng và cột tầng 1 khu nhà học chính.',
      items: {
        create: [
          { materialName: 'Thép D16', unit: 'kg', requestedQuantity: 3500, fieldProgressItemId: w1_3.id },
          { materialName: 'Thép D20', unit: 'kg', requestedQuantity: 2200, fieldProgressItemId: w1_3.id },
          { materialName: 'Xi măng PCB40', unit: 'bao', requestedQuantity: 450, fieldProgressItemId: w1_5.id },
          { materialName: 'Cát vàng', unit: 'm3', requestedQuantity: 65, fieldProgressItemId: w1_2.id },
          { materialName: 'Đá 1x2', unit: 'm3', requestedQuantity: 85, fieldProgressItemId: w1_5.id },
        ]
      }
    }
  });

  await prisma.materialRequest.create({
    data: {
      projectId: project.id, requestNo: `YC-${project.code}-002`, requestedById: admin.id,
      requestDate: new Date('2026-06-28T00:00:00Z'), neededDate: new Date('2026-07-02T00:00:00Z'),
      status: 'SUBMITTED', priority: 'MEDIUM', note: 'Cấp vật tư chuẩn bị cho công tác xây tường tầng 1.',
      items: {
        create: [
          { materialName: 'Gạch xây không nung', unit: 'viên', requestedQuantity: 28000, fieldProgressItemId: w3_1.id },
          { materialName: 'Xi măng xây trát', unit: 'bao', requestedQuantity: 320, fieldProgressItemId: w3_1.id },
          { materialName: 'Cát xây', unit: 'm3', requestedQuantity: 75, fieldProgressItemId: w3_1.id },
        ]
      }
    }
  });

  console.log('\n--- CHU VAN AN PROJECT FULL SEED COMPLETED SUCCESSFULLY ---');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
