require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function mainSeedDashboard() {
  console.log('Seeding demo data for Executive Dashboard...');

  // 1. Ensure admin user exists
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.log('No ADMIN found. Aborting.');
    return;
  }

  // 2. Clean up old data to ensure idempotency
  console.log('Cleaning up old demo data...');
  await prisma.fieldProgressEntry.deleteMany({ where: { status: 'APPROVED' } });
  await prisma.fieldProgressItem.deleteMany();
  await prisma.fieldProgressTemplate.deleteMany();
  await prisma.wBSItem.deleteMany({ where: { code: { startsWith: 'WBS-DEMO' } } });
  await prisma.auditLog.deleteMany({ where: { entityId: 'demo-id' } });
  await prisma.paymentRequest.deleteMany({ where: { title: { in: ['Thanh toán vật tư thép đợt 2', 'Thanh toán đợt 4 - Thân tầng 1 đến tầng 3', 'Tạm ứng nhà thầu MEP'] } } });
  await prisma.contract.deleteMany({ where: { contractNo: { startsWith: 'HD-DEMO' } } });
  await prisma.approvalRequest.deleteMany({ where: { title: { in: ['Duyệt phát sinh chống thấm bổ sung khu hầm B2', 'Thanh toán đợt 4 - Thân tầng 1 đến tầng 3', 'Báo cáo có vấn đề - Tiến độ chậm', 'Yêu cầu vật tư DMVT-HNTH-2026-0002', 'Báo cáo chờ duyệt'] } } });
  await prisma.siteReport.deleteMany({ where: { title: { startsWith: 'Báo cáo ngày 2026' } } });
  await prisma.project.deleteMany({ where: { code: { startsWith: 'DEMO_CT_' } } });
  
  // 3. Create/Update Target Projects
  const projectTargets = [
    { code: 'HN-TH-2026-001', name: 'Dự án Tây Hồ', status: 'ACTIVE' },
    { code: 'HN-TQH-2026-002', name: 'Dự án Trần Quang Hiếu', status: 'ACTIVE' },
    { code: 'HN-HVP-2026-003', name: 'Dự án Hoàng Văn Phúc', status: 'ACTIVE' },
    { code: 'HN-BS-2026-004', name: 'Dự án Bim Sơn', status: 'ACTIVE' }
  ];

  const projects = [];
  for (const target of projectTargets) {
    const p = await prisma.project.upsert({
      where: { code: target.code },
      update: { name: target.name, status: target.status, updatedAt: new Date() },
      create: { code: target.code, name: target.name, status: target.status }
    });
    projects.push(p);
  }
  console.log(`Projects seeded: ${projects.length}`);

  // 4. Create Site Reports (Exactly 3, no duplicates)
  const reportData = [
    { date: new Date('2026-06-27T08:00:00Z'), proj: projects[0], status: 'APPROVED' },
    { date: new Date('2026-06-26T08:00:00Z'), proj: projects[1], status: 'REVISION_REQUESTED' },
    { date: new Date('2026-06-25T08:00:00Z'), proj: projects[2], status: 'SUBMITTED' }
  ];

  for (const r of reportData) {
    await prisma.siteReport.create({
      data: {
        projectId: r.proj.id,
        createdById: admin.id,
        reportDate: r.date,
        weatherCondition: 'SUNNY',
        title: `Báo cáo ngày ${r.date.toISOString().split('T')[0]}`,
        status: r.status,
        issues: r.status !== 'APPROVED' ? 'Vấn đề cần xử lý' : null
      }
    });
  }
  console.log(`Reports seeded: ${reportData.length}`);

  // 5. Approvals (Exactly 3)
  const approvalItems = [
    { title: 'Duyệt phát sinh chống thấm bổ sung khu hầm B2', proj: projects[0], type: 'OTHER' },
    { title: 'Thanh toán đợt 4 - Thân tầng 1 đến tầng 3', proj: projects[0], type: 'PAYMENT' },
    { title: 'Yêu cầu vật tư DMVT-HNTH-2026-0002', proj: projects[0], type: 'MATERIAL' }
  ];

  const ts = Date.now();
  for (let i = 0; i < approvalItems.length; i++) {
    await prisma.approvalRequest.create({
      data: {
        code: `APP-DEMO-${ts}-${i+1}`,
        title: approvalItems[i].title,
        type: approvalItems[i].type,
        priority: 'NORMAL',
        status: 'PENDING',
        requesterId: admin.id,
        projectId: approvalItems[i].proj.id
      }
    });
  }
  console.log(`Approval items seeded: ${approvalItems.length}`);
  
  // Note: Action items are calculated dynamically from Reports and Approvals,
  // We'll have 3 Approvals + 2 Reports (REVISION_REQUESTED and SUBMITTED) = 5 Action Items total.

  // 6. Finances (1 contract, 3 payments)
  const contract = await prisma.contract.create({
    data: {
      projectId: projects[0].id,
      contractNo: `HD-DEMO-${ts}`,
      name: 'Hợp đồng thi công chính',
      type: 'CLIENT',
      status: 'ACTIVE',
      value: 15000000000,
    }
  });

  const paymentTitles = [
    'Thanh toán vật tư thép đợt 2',
    'Thanh toán đợt 4 - Thân tầng 1 đến tầng 3',
    'Tạm ứng nhà thầu MEP'
  ];

  for (let i = 0; i < paymentTitles.length; i++) {
    await prisma.paymentRequest.create({
      data: {
        requestCode: `PAY-DEMO-${ts}-${i+1}`,
        contractId: contract.id,
        title: paymentTitles[i],
        totalAmount: 500000000 * (i + 1),
        status: 'SUBMITTED', // 'SUBMITTED' is needed to show in finance panel
        type: 'PROGRESS',
        projectId: projects[0].id,
        createdById: admin.id
      }
    });
  }
  console.log(`Finance records seeded: ${paymentTitles.length}`);

  // 7. Activity Timeline (4 activities)
  const activities = [
    { action: 'CREATE', entity: 'SiteReport', details: 'Cập nhật tiến độ', tone: 'emerald' },
    { action: 'UPLOAD', entity: 'Document', details: 'Upload tài liệu', tone: 'blue' },
    { action: 'CREATE', entity: 'SiteReport', details: 'Tạo báo cáo', tone: 'slate' },
    { action: 'APPROVE', entity: 'ApprovalRequest', details: 'Duyệt hồ sơ', tone: 'emerald' }
  ];

  for (let i = 0; i < activities.length; i++) {
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: admin.id } },
        action: activities[i].action,
        entityType: activities[i].entity,
        entityId: 'demo-id',
        afterData: activities[i].details,
        projectId: projects[0].id,
        ipAddress: '127.0.0.1'
      }
    });
  }
  console.log(`Activities seeded: ${activities.length}`);

  // 8. Progress & Health Setup
  const targetProgress = [68, 45, 28, 72];
  const targetDays = [184, 210, -5, 160]; // Note: -5 days for Hoàng Văn Phúc ensures it's Delayed/Risk
  
  for (let i = 0; i < projects.length; i++) {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Normalize time
    const endDate = new Date(today.getTime() + targetDays[i] * 24 * 60 * 60 * 1000);
    
    await prisma.project.update({
      where: { id: projects[i].id },
      data: { endDate, updatedAt: today }
    });

    const wbs = await prisma.wBSItem.create({
      data: {
        projectId: projects[i].id,
        code: `WBS-DEMO-${ts}-${i+1}`,
        name: `Hạng mục chính`,
        plannedStartDate: new Date('2026-01-01'),
        plannedEndDate: endDate,
        progress: targetProgress[i],
        status: 'IN_PROGRESS'
      }
    });

    const template = await prisma.fieldProgressTemplate.create({
      data: {
        projectId: projects[i].id,
        name: `Mẫu tiến độ - ${projects[i].code}`,
        createdById: admin.id
      }
    });

    const templateItem = await prisma.fieldProgressItem.create({
      data: {
        template: { connect: { id: template.id } },
        project: { connect: { id: projects[i].id } },
        createdBy: { connect: { id: admin.id } },
        itemType: 'WORK',
        sortOrder: 1,
        workContent: 'Hạng mục tổng hợp',
        unit: '%',
        designQuantity: 100,
        createdAt: today
      }
    });

    await prisma.fieldProgressEntry.create({
      data: {
        project: { connect: { id: projects[i].id } },
        template: { connect: { id: template.id } },
        item: { connect: { id: templateItem.id } },
        createdBy: { connect: { id: admin.id } },
        entryDate: today,
        status: 'APPROVED',
        quantity: targetProgress[i],
      }
    });
  }
  console.log(`Progress rows seeded: ${targetProgress.length}`);
  
  // Update Action Items log output based on deterministic formulas
  // Approvals (3) + Issue Reports (2) = 5
  console.log(`Action items seeded: 5`);

  console.log('Demo seed completed successfully!');
}

mainSeedDashboard().catch(e => {
  console.error(e);
}).finally(async () => {
  await prisma.$disconnect();
});
