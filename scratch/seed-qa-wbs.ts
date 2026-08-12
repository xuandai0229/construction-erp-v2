import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedQaWbs() {
  const project = await prisma.project.findFirst({
    where: { code: { contains: 'QA' } },
  }) || await prisma.project.findFirst();

  if (!project) {
    console.error('No project found');
    return;
  }

  const adminUser = await prisma.user.findFirst({ where: { email: 'qa_freeze_admin@construction.local' } }) || await prisma.user.findFirst();

  if (!adminUser) {
    console.error('No admin user found');
    return;
  }

  console.log(`Seeding QA WBS for Project: ${project.name} (${project.code} / ${project.id})`);

  // Clear existing test WBS if any
  await prisma.wBSItem.deleteMany({ where: { projectId: project.id } });

  // 1. Seed WBSItems
  const rootWbs1 = await prisma.wBSItem.create({
    data: {
      projectId: project.id,
      code: 'WBS-01',
      name: 'Phần móng & Hạ tầng',
      unit: 'Gói',
      designQuantity: 1,
      progress: 0,
      status: 'IN_PROGRESS',
      description: 'Hạng mục móng và hạ tầng ngầm',
    },
  });

  const leafWbs1 = await prisma.wBSItem.create({
    data: {
      projectId: project.id,
      parentId: rootWbs1.id,
      code: 'WBS-01.01',
      name: 'Đào hố móng & Đổ bê tông lót',
      unit: 'm³',
      designQuantity: 150,
      progress: 0,
      status: 'IN_PROGRESS',
      description: 'Đào móng M1-M5',
    },
  });

  const leafWbs2 = await prisma.wBSItem.create({
    data: {
      projectId: project.id,
      parentId: rootWbs1.id,
      code: 'WBS-01.02',
      name: 'Gia công & Lắp dựng cốt thép móng',
      unit: 'Tấn',
      designQuantity: 25.5,
      progress: 0,
      status: 'PLANNED',
      description: 'Thép CB400-V',
    },
  });

  const rootWbs2 = await prisma.wBSItem.create({
    data: {
      projectId: project.id,
      code: 'WBS-02',
      name: 'Phần thân & Kết cấu',
      unit: 'Gói',
      designQuantity: 1,
      progress: 0,
      status: 'PLANNED',
      description: 'Kết cấu bê tông cốt thép thân',
    },
  });

  const leafWbs3 = await prisma.wBSItem.create({
    data: {
      projectId: project.id,
      parentId: rootWbs2.id,
      code: 'WBS-02.01',
      name: 'Bê tông cột tầng 1',
      unit: 'm³',
      designQuantity: 80,
      progress: 0,
      status: 'PLANNED',
      description: 'Cột C1-C12 tầng 1',
    },
  });

  console.log('Created 5 WBS Items successfully.');

  // 2. Seed FieldProgressTemplate & FieldProgressItems (for Daily Progress entry)
  let template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: project.id, deletedAt: null },
  });

  if (!template) {
    template = await prisma.fieldProgressTemplate.create({
      data: {
        projectId: project.id,
        name: 'Bảng khối lượng hiện trường QA',
        createdById: adminUser.id,
      },
    });
  }

  // Clear existing items in template
  await prisma.fieldProgressItem.deleteMany({ where: { templateId: template.id } });

  const groupItem = await prisma.fieldProgressItem.create({
    data: {
      project: { connect: { id: project.id } },
      template: { connect: { id: template.id } },
      createdBy: { connect: { id: adminUser.id } },
      itemType: 'GROUP',
      categoryName: 'Công tác móng',
      sortOrder: 1,
    },
  });

  const workItem1 = await prisma.fieldProgressItem.create({
    data: {
      project: { connect: { id: project.id } },
      template: { connect: { id: template.id } },
      createdBy: { connect: { id: adminUser.id } },
      itemType: 'WORK',
      code: 'HM-01',
      workContent: 'Đào hố móng & Đổ bê tông lót',
      unit: 'm³',
      designQuantity: 150,
      parent: { connect: { id: groupItem.id } },
      sortOrder: 2,
    },
  });

  const workItem2 = await prisma.fieldProgressItem.create({
    data: {
      project: { connect: { id: project.id } },
      template: { connect: { id: template.id } },
      createdBy: { connect: { id: adminUser.id } },
      itemType: 'WORK',
      code: 'HM-02',
      workContent: 'Gia công & Lắp dựng cốt thép móng',
      unit: 'Tấn',
      designQuantity: 25.5,
      parent: { connect: { id: groupItem.id } },
      sortOrder: 3,
    },
  });

  console.log(`Created FieldProgressTemplate (${template.id}) and items: ${workItem1.id} (${workItem1.code}), ${workItem2.id} (${workItem2.code})`);
}

seedQaWbs().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
