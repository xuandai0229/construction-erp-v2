import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { assertSafeQaDatabase } from './assert-safe-qa-database';
import { createSafeQaPrismaClient } from './create-safe-qa-prisma-client';

async function run() {
  // 1. Safety check
  const safeTarget = assertSafeQaDatabase();
  console.log(`Safety check passed. Bootstrapping QA database: ${safeTarget.database}`);

  const qaDatabaseUrl = process.env.QA_DATABASE_URL!;
  const { prisma, close } = createSafeQaPrismaClient(qaDatabaseUrl);

  try {
    // 2. Setup Credentials
    let email = process.env.QA_ADMIN_EMAIL;
    let password = process.env.QA_ADMIN_PASSWORD;

    const secretsDir = path.join(process.cwd(), 'test-results/ui-ux-phase-3/.secrets');
    fs.mkdirSync(secretsDir, { recursive: true });
    const secretsPath = path.join(secretsDir, 'qa-credentials.json');

    if (!email || !password) {
      if (fs.existsSync(secretsPath)) {
        const saved = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
        email = saved.email;
        password = saved.password;
        console.log(`Using existing generated QA credentials from ${secretsPath}`);
      } else {
        email = 'qa_admin_2026_07@construction-erp-qa.local';
        password = crypto.randomBytes(16).toString('hex') + 'A1!';
        fs.writeFileSync(secretsPath, JSON.stringify({ email, password }, null, 2), 'utf-8');
        console.log(`Generated new QA credentials and saved to ${secretsPath}`);
      }
    }

    // Set env variables for Playwright global setup to read
    process.env.QA_ADMIN_EMAIL = email;
    process.env.QA_ADMIN_PASSWORD = password;

    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Seed QA Admin User
    const adminUser = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        name: 'QA Admin User 2026_07',
        role: 'ADMIN',
        isActive: true,
        deletedAt: null,
      },
      create: {
        email,
        password: hashedPassword,
        name: 'QA Admin User 2026_07',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`QA Admin User ensured: ${adminUser.id} (${email})`);

    // 4. Seed QA Project
    const projectCode = 'QA_PROJ_2026_07';
    const project = await prisma.project.upsert({
      where: { code: projectCode },
      update: {
        name: 'Công trình Thử nghiệm QA (QA_UI_UX_2026_07)',
        status: 'ACTIVE',
        deletedAt: null,
      },
      create: {
        code: projectCode,
        name: 'Công trình Thử nghiệm QA (QA_UI_UX_2026_07)',
        status: 'ACTIVE',
      },
    });
    console.log(`QA Project ensured: ${project.id} (${projectCode})`);

    // 5. Seed Project Membership for QA Admin
    const membership = await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: adminUser.id,
        },
      },
      update: {
        role: 'PROJECT_MANAGER',
        isActive: true,
        deletedAt: null,
      },
      create: {
        projectId: project.id,
        userId: adminUser.id,
        role: 'PROJECT_MANAGER',
        isActive: true,
      },
    });
    console.log(`QA Project Member membership ensured: ${membership.id}`);

    // 6. Seed WBS Items
    const wbs1 = await prisma.wBSItem.upsert({
      where: {
        projectId_code: {
          projectId: project.id,
          code: 'WBS_QA_01',
        },
      },
      update: {
        name: 'Hạng mục Phần thô (QA_UI_UX_2026_07)',
        status: 'IN_PROGRESS',
        deletedAt: null,
      },
      create: {
        projectId: project.id,
        code: 'WBS_QA_01',
        name: 'Hạng mục Phần thô (QA_UI_UX_2026_07)',
        status: 'IN_PROGRESS',
      },
    });

    const wbs2 = await prisma.wBSItem.upsert({
      where: {
        projectId_code: {
          projectId: project.id,
          code: 'WBS_QA_02',
        },
      },
      update: {
        name: 'Hạng mục Hoàn thiện (QA_UI_UX_2026_07)',
        status: 'PLANNED',
        deletedAt: null,
      },
      create: {
        projectId: project.id,
        code: 'WBS_QA_02',
        name: 'Hạng mục Hoàn thiện (QA_UI_UX_2026_07)',
        status: 'PLANNED',
      },
    });

    // 7. Seed Materials
    const mat1 = await prisma.materialItem.upsert({
      where: {
        projectId_code: {
          projectId: project.id,
          code: 'MAT_QA_01',
        },
      },
      update: {
        name: 'Xi măng PCB40 Hoàng Thạch (QA_UI_UX_2026_07)',
        unit: 'Tấn',
        group: 'Xi măng',
        isActive: true,
      },
      create: {
        projectId: project.id,
        code: 'MAT_QA_01',
        name: 'Xi măng PCB40 Hoàng Thạch (QA_UI_UX_2026_07)',
        unit: 'Tấn',
        group: 'Xi măng',
        isActive: true,
      },
    });

    const mat2 = await prisma.materialItem.upsert({
      where: {
        projectId_code: {
          projectId: project.id,
          code: 'MAT_QA_02',
        },
      },
      update: {
        name: 'Cát vàng xây dựng (QA_UI_UX_2026_07)',
        unit: 'm3',
        group: 'Cát',
        isActive: true,
      },
      create: {
        projectId: project.id,
        code: 'MAT_QA_02',
        name: 'Cát vàng xây dựng (QA_UI_UX_2026_07)',
        unit: 'm3',
        group: 'Cát',
        isActive: true,
      },
    });

    const mat3 = await prisma.materialItem.upsert({
      where: {
        projectId_code: {
          projectId: project.id,
          code: 'MAT_QA_03',
        },
      },
      update: {
        name: 'Thép cuộn Hòa Phát D6 (QA_UI_UX_2026_07)',
        unit: 'Kg',
        group: 'Sắt thép',
        isActive: true,
      },
      create: {
        projectId: project.id,
        code: 'MAT_QA_03',
        name: 'Thép cuộn Hòa Phát D6 (QA_UI_UX_2026_07)',
        unit: 'Kg',
        group: 'Sắt thép',
        isActive: true,
      },
    });

    // 8. Write generated manifest
    const manifestDir = path.join(process.cwd(), 'test-results/ui-ux-phase-3');
    fs.mkdirSync(manifestDir, { recursive: true });
    const manifestPath = path.join(manifestDir, 'qa-fixture-manifest.json');

    const manifestData = {
      timestamp: new Date().toISOString(),
      marker: 'QA_UI_UX_2026_07',
      adminUser: {
        id: adminUser.id,
        email,
      },
      project: {
        id: project.id,
        code: projectCode,
        name: project.name,
      },
      wbsItems: [
        { id: wbs1.id, code: wbs1.code, name: wbs1.name },
        { id: wbs2.id, code: wbs2.code, name: wbs2.name },
      ],
      materials: [
        { id: mat1.id, code: mat1.code, name: mat1.name },
        { id: mat2.id, code: mat2.code, name: mat2.name },
        { id: mat3.id, code: mat3.code, name: mat3.name },
      ]
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf-8');
    console.log(`Saved QA fixture manifest to ${manifestPath}`);

  } finally {
    await close();
  }
}

void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "unknown QA database bootstrapping failure");
  process.exitCode = 1;
});
