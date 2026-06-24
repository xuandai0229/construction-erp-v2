import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== UAT DEMO SEED AFTER CLEAN BASELINE ===\n');

  // Ensure DB is empty of active projects
  const activeProjectsCount = await prisma.project.count({ where: { deletedAt: null } });
  if (activeProjectsCount > 0) {
    throw new Error('Active projects found. UAT Demo Seed requires an empty baseline.');
  }

  const existingUat = await prisma.project.findUnique({ where: { code: 'UAT-DEMO-001' } });
  if (existingUat) {
    throw new Error('Project code UAT-DEMO-001 already exists. UAT Demo Seed aborted.');
  }

  // Admin user
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) {
    throw new Error('No ADMIN user found.');
  }

  console.log('1. Creating UAT Demo Project...');
  const project = await prisma.project.create({
    data: {
      name: "Công trình UAT Demo - Nhà điều hành mẫu",
      code: "UAT-DEMO-001",
      investor: "Chủ đầu tư UAT Demo",
      location: "Khu vực kiểm thử nội bộ",
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31'),
      status: "ACTIVE",
      description: "Dữ liệu UAT demo do AI tạo để kiểm thử UI/UX và workflow. Không phải dữ liệu thật.",
      members: {
        create: {
          userId: adminUser.id,
          role: 'SITE_COMMANDER'
        }
      }
    }
  });

  // Log
  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'Project',
      entityId: project.id,
      projectId: project.id,
      userId: adminUser.id,
      afterData: JSON.stringify({ message: 'UAT Demo Project created' })
    }
  });

  console.log('2. Creating Document Folders...');
  const folderNames = [
    '01_Hợp đồng',
    '02_Bản vẽ',
    '03_Dự toán',
    '04_Nghiệm thu',
    '05_Hóa đơn',
    '06_Thanh toán',
    '07_Hình ảnh hiện trường',
    '08_Báo cáo ngày'
  ];

  const folders = [];
  for (const name of folderNames) {
    const f = await prisma.documentFolder.create({
      data: {
        name,
        projectId: project.id
      }
    });
    folders.push(f);
  }

  console.log('3. Creating Sample Documents...');
  const docStorageDir = path.join(process.cwd(), 'storage', 'documents', project.id);
  fs.mkdirSync(docStorageDir, { recursive: true });

  const sampleDocs = [
    { name: 'UAT_SAMPLE_Hop_dong_nguyen_tac.txt', folderId: folders[0].id, content: 'Day la file test hop dong.' },
    { name: 'UAT_SAMPLE_Ban_ve_ghi_chu.txt', folderId: folders[1].id, content: 'Day la file test ban ve.' },
    { name: 'UAT_SAMPLE_Du_toan_tom_tat.txt', folderId: folders[2].id, content: 'Day la file test du toan.' },
    { name: 'UAT_SAMPLE_Bien_ban_nghiem_thu.txt', folderId: folders[3].id, content: 'Day la file test nghiem thu.' }
  ];

  for (const sd of sampleDocs) {
    const storedName = `${Date.now()}-${sd.name}`;
    const filePath = path.join(docStorageDir, storedName);
    fs.writeFileSync(filePath, sd.content);
    const size = fs.statSync(filePath).size;

    await prisma.document.create({
      data: {
        projectId: project.id,
        folderId: sd.folderId,
        originalName: sd.name,
        storedName: storedName,
        mimeType: 'text/plain',
        extension: '.txt',
        size: size,
        storagePath: path.join('documents', project.id, storedName).replace(/\\/g, '/'),
        uploadedById: adminUser.id,
        documentType: 'OTHER',
        status: 'APPROVED',
        fileHash: 'mock-hash-' + storedName
      }
    });
  }

  console.log('4. Creating Field Progress Template & Items...');
  const fpTemplate = await prisma.fieldProgressTemplate.create({
    data: {
      projectId: project.id,
      name: 'Bảng khối lượng gốc UAT',
      createdById: adminUser.id
    }
  });

  const wbsData = [
    {
      group: 'Nhóm 1: Công tác chuẩn bị',
      items: [
        { name: 'Lắp dựng hàng rào tạm', unit: 'md', qty: 120 },
        { name: 'Dọn dẹp mặt bằng', unit: 'm2', qty: 850 },
        { name: 'Định vị tim trục', unit: 'điểm', qty: 24 },
        { name: 'Lắp đặt lán trại tạm', unit: 'm2', qty: 60 }
      ]
    },
    {
      group: 'Nhóm 2: Phần móng',
      items: [
        { name: 'Đào đất hố móng', unit: 'm3', qty: 420 },
        { name: 'Bê tông lót móng', unit: 'm3', qty: 38 },
        { name: 'Gia công lắp dựng cốt thép móng', unit: 'kg', qty: 12500 },
        { name: 'Đổ bê tông móng', unit: 'm3', qty: 165 }
      ]
    },
    {
      group: 'Nhóm 3: Phần thân tầng 1',
      items: [
        { name: 'Gia công cốt thép cột tầng 1', unit: 'kg', qty: 8200 },
        { name: 'Lắp dựng cốp pha cột tầng 1', unit: 'm2', qty: 340 },
        { name: 'Đổ bê tông cột tầng 1', unit: 'm3', qty: 78 },
        { name: 'Xây tường tầng 1', unit: 'm2', qty: 560 }
      ]
    },
    {
      group: 'Nhóm 4: Hoàn thiện mẫu',
      items: [
        { name: 'Trát tường trong nhà', unit: 'm2', qty: 620 },
        { name: 'Lát nền khu văn phòng', unit: 'm2', qty: 410 },
        { name: 'Sơn bả hoàn thiện', unit: 'm2', qty: 900 },
        { name: 'Lắp đặt cửa đi/cửa sổ', unit: 'bộ', qty: 42 }
      ]
    }
  ];

  let orderSequence = 1;
  const workItemMap: Record<string, string> = {};

  for (const g of wbsData) {
    const groupItem = await prisma.fieldProgressItem.create({
      data: {
        templateId: fpTemplate.id,
        projectId: project.id,
        categoryName: g.group,
        itemType: 'GROUP',
        sortOrder: orderSequence++,
        createdById: adminUser.id
      }
    });

    for (const item of g.items) {
      const wItem = await prisma.fieldProgressItem.create({
        data: {
          templateId: fpTemplate.id,
          projectId: project.id,
          parentId: groupItem.id,
          workContent: item.name,
          unit: item.unit,
          designQuantity: item.qty,
          itemType: 'WORK',
          sortOrder: orderSequence++,
          createdById: adminUser.id
        }
      });
      workItemMap[item.name] = wItem.id;
    }
  }

  console.log('5. Creating Field Progress Entries & Reports...');
  
  const dailyData = [
    {
      date: '2026-07-01',
      status: 'APPROVED',
      entries: [
        { name: 'Lắp dựng hàng rào tạm', qty: 30 },
        { name: 'Dọn dẹp mặt bằng', qty: 200 }
      ]
    },
    {
      date: '2026-07-02',
      status: 'APPROVED',
      entries: [
        { name: 'Lắp dựng hàng rào tạm', qty: 45 },
        { name: 'Dọn dẹp mặt bằng', qty: 300 },
        { name: 'Định vị tim trục', qty: 8 }
      ]
    },
    {
      date: '2026-07-03',
      status: 'SUBMITTED',
      entries: [
        { name: 'Định vị tim trục', qty: 10 },
        { name: 'Lắp đặt lán trại tạm', qty: 30 }
      ]
    },
    {
      date: '2026-07-04',
      status: 'DRAFT',
      entries: [
        { name: 'Đào đất hố móng', qty: 120 }
      ]
    },
    {
      date: '2026-07-05',
      status: 'REVISION_REQUESTED',
      entries: [
        { name: 'Đào đất hố móng', qty: 150 },
        { name: 'Bê tông lót móng', qty: 12 }
      ]
    }
  ];

  let rNo = 1;
  for (const day of dailyData) {
    const reportDate = new Date(day.date);
    
    // Entries
    for (const entry of day.entries) {
      const itemId = workItemMap[entry.name];
      await prisma.fieldProgressEntry.create({
        data: {
          projectId: project.id,
          templateId: fpTemplate.id,
          itemId: itemId,
          entryDate: reportDate,
          quantity: entry.qty,
          status: day.status as any,
          createdById: adminUser.id
        }
      });
    }

    // Report
    const reportNo = `BCN-UAT-${String(rNo).padStart(3, '0')}`;
    const report = await prisma.siteReport.create({
      data: {
        projectId: project.id,
        reportNo,
        reportDate: reportDate,
        type: 'DAILY',
        status: day.status as any,
        weatherCondition: 'SUNNY',
        weatherTemperature: 32,
        summary: 'Báo cáo UAT demo - kiểm thử nhập liệu hiện trường.',
        createdById: adminUser.id,
        lines: {
          create: day.entries.map((e, idx) => ({
            projectId: project.id,
            fieldProgressItemId: workItemMap[e.name],
            workName: e.name,
            sortOrder: idx + 1,
            workContent: e.name,
            unit: 'n/a', // Optional based on entry, just mock
            quantityToday: e.qty
          }))
        }
      }
    });

    rNo++;
  }

  console.log('6. Creating 1 Weekly Report...');
  await prisma.siteReport.create({
    data: {
      projectId: project.id,
      reportNo: 'BCT-UAT-001',
      reportDate: new Date('2026-07-05'),
      type: 'WEEKLY',
      status: 'APPROVED',
      summary: 'Báo cáo tuần UAT demo - tổng hợp từ 5 ngày demo (Limitation: No auto-source linkage yet).',
      createdById: adminUser.id
    }
  });

  console.log('\n[!] UAT DEMO SEED COMPLETED.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
