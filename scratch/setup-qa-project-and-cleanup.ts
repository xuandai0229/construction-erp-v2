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

async function setupQaProjectAndCleanup() {
  console.log('========================================================================');
  console.log('🧹 QA PROJECT CREATION & CT-2026-0003 QA DATA CLEANUP');
  console.log('========================================================================\n');

  // 1. Audit baseline before cleanup
  const realProjects = await prisma.project.findMany({
    where: { code: { startsWith: 'CT-2026-' } },
    select: { id: true, code: true, name: true },
  });
  console.log(`Real Business Projects Count (CT-2026-*): ${realProjects.length}`);
  if (realProjects.length !== 21) {
    console.error(`ERROR: Expected 21 real projects, found ${realProjects.length}`);
  }

  const ct0003 = realProjects.find((p) => p.code === 'CT-2026-0003');
  if (!ct0003) {
    console.error('ERROR: Cannot find CT-2026-0003 project!');
    process.exit(1);
  }

  console.log(`Target CT-2026-0003 Project ID: ${ct0003.id}`);

  // 2. Perform surgical cleanup of QA-owned data from CT-2026-0003
  console.log('\nPerforming surgical cleanup of QA data from CT-2026-0003...');

  // Delete QA FieldProgressEntries created by test scripts
  const deletedEntries = await prisma.fieldProgressEntry.deleteMany({
    where: {
      projectId: ct0003.id,
      OR: [
        { note: { startsWith: 'QA_MOBILE_' } },
        { note: { startsWith: 'QA_' } },
      ],
    },
  });
  console.log(`Deleted ${deletedEntries.count} QA FieldProgressEntry records from CT-2026-0003`);

  // Delete QA FieldProgressItems
  const deletedItems = await prisma.fieldProgressItem.deleteMany({
    where: {
      template: { projectId: ct0003.id },
      code: { in: ['HM-01', 'HM-02', 'HM-03', 'QA-ITEM-01', 'QA-ITEM-02'] },
    },
  });
  console.log(`Deleted ${deletedItems.count} QA FieldProgressItem records from CT-2026-0003`);

  // Delete QA FieldProgressTemplates
  const deletedTemplates = await prisma.fieldProgressTemplate.deleteMany({
    where: {
      projectId: ct0003.id,
      name: { contains: 'QA' },
    },
  });
  console.log(`Deleted ${deletedTemplates.count} QA FieldProgressTemplate records from CT-2026-0003`);

  // Delete QA WBSItems attached to CT-2026-0003
  const deletedWbs = await prisma.wBSItem.deleteMany({
    where: {
      projectId: ct0003.id,
      code: { in: ['HM-ROOT', 'HM-01', 'HM-02', 'HM-03', 'HM-ROOT-2'] },
    },
  });
  console.log(`Deleted ${deletedWbs.count} QA WBSItem records from CT-2026-0003`);

  // Verify CT-2026-0003 is clean
  const ct0003WbsCount = await prisma.wBSItem.count({ where: { projectId: ct0003.id } });
  const ct0003ProgressCount = await prisma.fieldProgressEntry.count({ where: { projectId: ct0003.id } });
  console.log(`Post-cleanup CT-2026-0003 WBS count: ${ct0003WbsCount}`);
  console.log(`Post-cleanup CT-2026-0003 FieldProgressEntry count: ${ct0003ProgressCount}`);

  // 3. Create dedicated QA Project (QA-MOBILE-001)
  console.log('\nCreating dedicated QA Project (QA-MOBILE-001)...');

  let qaProject = await prisma.project.findFirst({ where: { code: 'QA-MOBILE-001' } });
  if (!qaProject) {
    qaProject = await prisma.project.create({
      data: {
        code: 'QA-MOBILE-001',
        name: 'QA Mobile Integration Project',
        description: 'Dedicated sandbox project for Mobile Phase 2 & Phase 3 automated integration tests',
        status: 'ACTIVE',
      },
    });
    console.log(`Created QA Project: ${qaProject.name} (${qaProject.code} / ${qaProject.id})`);
  } else {
    console.log(`QA Project already exists: ${qaProject.name} (${qaProject.code} / ${qaProject.id})`);
  }

  // Assign QA Admin User to QA Project
  const adminUser = await prisma.user.findFirst({
    where: { email: 'qa_freeze_admin@construction.local' },
  }) || await prisma.user.findFirst();

  if (adminUser) {
    const existingAssign = await prisma.projectMember.findFirst({
      where: { projectId: qaProject.id, userId: adminUser.id },
    });
    if (!existingAssign) {
      await prisma.projectMember.create({
        data: {
          projectId: qaProject.id,
          userId: adminUser.id,
          role: 'PROJECT_MANAGER',
        },
      });
      console.log(`Assigned admin user ${adminUser.email} to QA Project (${qaProject.code})`);
    }
  }

  // 4. Create QA Fixtures in QA-MOBILE-001
  console.log('\nCreating QA WBS & FieldProgress fixtures in QA-MOBILE-001...');

  // Root WBS
  let qaRootWbs = await prisma.wBSItem.findFirst({
    where: { projectId: qaProject.id, code: 'QA-WBS-ROOT' },
  });
  if (!qaRootWbs) {
    qaRootWbs = await prisma.wBSItem.create({
      data: {
        projectId: qaProject.id,
        code: 'QA-WBS-ROOT',
        name: 'Phần móng QA',
        parentId: null,
      },
    });
  }

  // Leaf WBS 1
  let qaLeafWbs1 = await prisma.wBSItem.findFirst({
    where: { projectId: qaProject.id, code: 'QA-WBS-01' },
  });
  if (!qaLeafWbs1) {
    qaLeafWbs1 = await prisma.wBSItem.create({
      data: {
        projectId: qaProject.id,
        code: 'QA-WBS-01',
        name: 'Đào hố móng & Bê tông lót QA',
        unit: 'm³',
        designQuantity: 100,
        parentId: qaRootWbs.id,
      },
    });
  }

  // FieldProgressTemplate
  let qaTemplate = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: qaProject.id, name: 'Mẫu nhật ký thi công QA' },
  });
  if (!qaTemplate) {
    qaTemplate = await prisma.fieldProgressTemplate.create({
      data: {
        project: { connect: { id: qaProject.id } },
        createdBy: { connect: { id: adminUser.id } },
        name: 'Mẫu nhật ký thi công QA',
      },
    });
  }

  // FieldProgressItem
  let qaProgressItem1 = await prisma.fieldProgressItem.findFirst({
    where: { templateId: qaTemplate.id, code: 'QA-WBS-01' },
  });
  if (!qaProgressItem1) {
    qaProgressItem1 = await prisma.fieldProgressItem.create({
      data: {
        project: { connect: { id: qaProject.id } },
        template: { connect: { id: qaTemplate.id } },
        createdBy: { connect: { id: adminUser.id } },
        code: 'QA-WBS-01',
        workContent: 'Đào hố móng & Bê tông lót QA',
        unit: 'm³',
        designQuantity: 100,
        sortOrder: 1,
      },
    });
  }

  console.log('QA Fixtures setup complete in QA-MOBILE-001!');

  // 5. Final Reconciliation Assertions
  const finalRealProjects = await prisma.project.count({
    where: { code: { startsWith: 'CT-2026-' } },
  });
  const hasQaProject = await prisma.project.findFirst({ where: { code: 'QA-MOBILE-001' } });
  const ct0003WbsFinal = await prisma.wBSItem.count({ where: { projectId: ct0003.id } });

  console.log('\n========================================================================');
  console.log('FINAL RECONCILIATION SUMMARY:');
  console.log(`- Real Business Projects (CT-2026-*): ${finalRealProjects} (Expected: 21)`);
  console.log(`- Dedicated QA Project Exists (QA-MOBILE-001): ${!!hasQaProject}`);
  console.log(`- CT-2026-0003 QA WBS Remaining: ${ct0003WbsFinal}`);
  console.log('========================================================================\n');
}

setupQaProjectAndCleanup().catch(console.error).finally(() => {
  prisma.$disconnect();
  pool.end();
});
