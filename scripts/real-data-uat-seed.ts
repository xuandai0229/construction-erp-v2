import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!admin) {
    throw new Error('No admin user found to use as creator.');
  }

  console.log("Using admin user: " + admin.id + " - " + admin.email);

  // Create Project
  const projectCode = 'UAT-REAL-CT-001';
  let project = await prisma.project.findUnique({ where: { code: projectCode } });
  
  if (!project) {
    project = await prisma.project.create({
      data: {
        code: projectCode,
        name: 'UAT REAL - Nhà văn phòng 3 tầng',
        investor: 'Công ty TNHH Kiểm thử Xây dựng',
        location: 'Hà Nội',
        status: 'ACTIVE',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-12-31'),
      }
    });
    console.log("Created project: " + project.id);
  } else {
    console.log("Project already exists: " + project.id);
  }

  // Create Field Progress Template
  let template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: project.id, name: 'Bảng khối lượng chính UAT' }
  });
  
  if (!template) {
    template = await prisma.fieldProgressTemplate.create({
      data: {
        projectId: project.id,
        name: 'Bảng khối lượng chính UAT',
        status: 'ACTIVE',
        createdById: admin.id
      }
    });
  }

  // Find existing items to prevent duplicates
  const existingMong = await prisma.fieldProgressItem.findFirst({ where: { projectId: project.id, categoryName: 'Phần móng' } });

  let mong, daoMong, thepMong, beTongMong;
  let than, thepCot1, copPhaCot1, beTongCot1;
  let hoanThien, xayTuong1, tratTuong1, latNen1;

  if (!existingMong) {
    mong = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, itemType: 'GROUP', categoryName: 'Phần móng', sortOrder: 1, createdById: admin.id }
    });

    daoMong = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, parentId: mong.id, itemType: 'WORK', workContent: 'Đào đất móng', unit: 'm3', designQuantity: 120, sortOrder: 1, createdById: admin.id }
    });
    thepMong = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, parentId: mong.id, itemType: 'WORK', workContent: 'Lắp dựng cốt thép móng', unit: 'tấn', designQuantity: 12, sortOrder: 2, createdById: admin.id }
    });
    beTongMong = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, parentId: mong.id, itemType: 'WORK', workContent: 'Đổ bê tông móng', unit: 'm3', designQuantity: 80, sortOrder: 3, createdById: admin.id }
    });

    than = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, itemType: 'GROUP', categoryName: 'Phần thân', sortOrder: 2, createdById: admin.id }
    });
    thepCot1 = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, parentId: than.id, itemType: 'WORK', workContent: 'Lắp dựng cốt thép cột tầng 1', unit: 'tấn', designQuantity: 8, sortOrder: 1, createdById: admin.id }
    });
    copPhaCot1 = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, parentId: than.id, itemType: 'WORK', workContent: 'Ghép cốp pha cột tầng 1', unit: 'm2', designQuantity: 150, sortOrder: 2, createdById: admin.id }
    });
    beTongCot1 = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, parentId: than.id, itemType: 'WORK', workContent: 'Đổ bê tông cột tầng 1', unit: 'm3', designQuantity: 45, sortOrder: 3, createdById: admin.id }
    });

    hoanThien = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, itemType: 'GROUP', categoryName: 'Hoàn thiện', sortOrder: 3, createdById: admin.id }
    });
    xayTuong1 = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, parentId: hoanThien.id, itemType: 'WORK', workContent: 'Xây tường tầng 1', unit: 'm2', designQuantity: 350, sortOrder: 1, createdById: admin.id }
    });
    tratTuong1 = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, parentId: hoanThien.id, itemType: 'WORK', workContent: 'Trát tường tầng 1', unit: 'm2', designQuantity: 320, sortOrder: 2, createdById: admin.id }
    });
    latNen1 = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, parentId: hoanThien.id, itemType: 'WORK', workContent: 'Lát nền tầng 1', unit: 'm2', designQuantity: 250, sortOrder: 3, createdById: admin.id }
    });

    console.log('Created Field Progress Items.');

    // Create Field Progress Entries for 7 days
    const startDate = new Date('2026-06-01T00:00:00Z');
    
    const entriesData = [
      { itemId: daoMong.id, dayOffset: 0, qty: 25 },
      { itemId: thepMong.id, dayOffset: 0, qty: 2 },
      { itemId: daoMong.id, dayOffset: 1, qty: 35 },
      { itemId: thepMong.id, dayOffset: 1, qty: 3 },
      { itemId: daoMong.id, dayOffset: 2, qty: 30 },
      { itemId: beTongMong.id, dayOffset: 3, qty: 30 },
      { itemId: beTongMong.id, dayOffset: 4, qty: 50 },
      { itemId: thepCot1.id, dayOffset: 5, qty: 2 },
    ];

    for (const ed of entriesData) {
      const entryDate = new Date(startDate);
      entryDate.setDate(startDate.getDate() + ed.dayOffset);
      
      await prisma.fieldProgressEntry.create({
        data: {
          projectId: project.id,
          templateId: template.id,
          itemId: ed.itemId,
          entryDate: entryDate,
          quantity: ed.qty,
          status: 'APPROVED',
          createdById: admin.id,
          approvedById: admin.id,
          approvedAt: new Date()
        }
      });
    }
    console.log('Created Field Progress Entries.');
  } else {
     daoMong = await prisma.fieldProgressItem.findFirst({ where: { workContent: 'Đào đất móng', projectId: project.id } });
  }

  // Create Document Folders and Documents
  const folderNames = [
    '01_Hợp đồng',
    '02_Bản vẽ',
    '03_Dự toán',
    '04_Nghiệm thu',
    '05_Hóa đơn',
    '07_Hình ảnh hiện trường',
    '08_Báo cáo ngày'
  ];

  const folders = [];
  for (const name of folderNames) {
    let folder = await prisma.documentFolder.findFirst({ where: { projectId: project.id, name } });
    if (!folder) {
      folder = await prisma.documentFolder.create({
        data: { projectId: project.id, name }
      });
    }
    folders.push(folder);
  }

  // Files to create mock data for
  const fileData = [
    { f: '01_Hợp đồng', n: 'UAT REAL DOC - Hop dong thi cong.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '02_Bản vẽ', n: 'UAT REAL DOC - Ban ve mat bang tang 1.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '02_Bản vẽ', n: 'UAT REAL DOC - Ban ve ket cau mong.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '03_Dự toán', n: 'UAT REAL DOC - Du toan khoi luong.xlsx', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { f: '04_Nghiệm thu', n: 'UAT REAL DOC - Bien ban nghiem thu mong.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '05_Hóa đơn', n: 'UAT REAL DOC - Hoa don vat lieu dot 1.pdf', ext: 'pdf', mime: 'application/pdf' },
    { f: '07_Hình ảnh hiện trường', n: 'UAT REAL DOC - Anh mong.jpg', ext: 'jpg', mime: 'image/jpeg' },
    { f: '07_Hình ảnh hiện trường', n: 'UAT REAL DOC - Anh cot.jpg', ext: 'jpg', mime: 'image/jpeg' },
  ];

  const existingDoc = await prisma.document.findFirst({ where: { projectId: project.id, originalName: 'UAT REAL DOC - Hop dong thi cong.pdf' } });

  if (!existingDoc) {
    for (const fd of fileData) {
      const folder = folders.find(f => f.name === fd.f);
      if (folder) {
        await prisma.document.create({
          data: {
            projectId: project.id,
            folderId: folder.id,
            originalName: fd.n,
            storedName: "uat-doc-" + Date.now() + "." + fd.ext,
            mimeType: fd.mime,
            extension: fd.ext,
            size: 1024 * 500, // 500KB
            storagePath: "uat-path/" + fd.n, // Mock storage path
            uploadedById: admin.id,
            status: 'APPROVED'
          }
        });
      }
    }
    console.log('Created Documents.');
  }

  const existingReport = await prisma.siteReport.findFirst({ where: { projectId: project.id, type: 'DAILY' } });
  
  if (!existingReport && daoMong) {
    const startDate = new Date('2026-06-01T00:00:00Z');
    for (let i = 0; i < 7; i++) {
      const reportDate = new Date(startDate);
      reportDate.setDate(startDate.getDate() + i);
      
      let status = 'APPROVED';
      if (i === 4) status = 'DRAFT';
      if (i === 5) status = 'SUBMITTED';
      if (i === 6) status = 'REJECTED';

      const report = await prisma.siteReport.create({
        data: {
          projectId: project.id,
          type: 'DAILY',
          reportDate,
          status: status as any,
          createdById: admin.id,
          approvedById: status === 'APPROVED' ? admin.id : null,
          approvedAt: status === 'APPROVED' ? new Date() : null,
          rejectedReason: status === 'REJECTED' ? 'Thiếu ảnh đính kèm' : null,
          weatherCondition: 'SUNNY',
          summary: "UAT REAL DATA - Báo cáo ngày " + (i+1),
          lines: {
            create: [
              {
                projectId: project.id,
                fieldProgressItemId: daoMong.id,
                workContent: 'Đào đất móng',
                quantityToday: 10,
                quantityBefore: 0,
                quantityCumulative: 10,
              }
            ]
          }
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          projectId: project.id,
          action: 'CREATE_SITE_REPORT',
          entityType: 'SITE_REPORT',
          entityId: report.id,
        }
      });
    }
    console.log('Created Site Reports.');

    const weekStart = new Date(startDate);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day == 0 ? -6 : 1); 
    const firstDayOfWeek = new Date(weekStart.setDate(diff));
    firstDayOfWeek.setHours(0,0,0,0);
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

    await prisma.siteReport.create({
      data: {
        projectId: project.id,
        type: 'WEEKLY',
        reportDate: lastDayOfWeek,
        weekStartDate: firstDayOfWeek,
        weekEndDate: lastDayOfWeek,
        status: 'APPROVED',
        createdById: admin.id,
        approvedById: admin.id,
        approvedAt: new Date(),
        summary: 'UAT REAL DATA - Báo cáo tuần 1',
      }
    });

    console.log('Created Weekly Report.');
  }

}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
