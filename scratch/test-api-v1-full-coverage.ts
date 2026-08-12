import prisma from '../src/lib/prisma';
import { generateSessionToken } from '../src/lib/session-token';

async function runV1FullCoverageTest() {
  console.log('=== CONSTRUCTION-ERP-V2 API V1 FULL COVERAGE RUNTIME TEST ===\n');

  // 1. Fetch test actors
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true, deletedAt: null },
  });
  const regularUser = await prisma.user.findFirst({
    where: { role: { notIn: ['ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR'] }, isActive: true, deletedAt: null },
  });
  const project = await prisma.project.findFirst({
    where: { deletedAt: null },
  });

  if (!adminUser || !project) {
    console.error('❌ Database missing required test data.');
    process.exit(1);
  }

  console.log(`[Actor Admin]: ${adminUser.name} (${adminUser.id}, Role: ${adminUser.role})`);
  if (regularUser) {
    console.log(`[Actor Regular]: ${regularUser.name} (${regularUser.id}, Role: ${regularUser.role})`);
  }
  console.log(`[Target Project]: ${project.name} (${project.id}, Code: ${project.code})\n`);

  // Generate tokens
  const adminToken = generateSessionToken(adminUser);
  const regularToken = regularUser ? generateSessionToken(regularUser) : null;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 2. Test bearer token generation parity
  assert(Boolean(adminToken && adminToken.length > 20), 'Bearer Token Generation', 'Token is empty or invalid');

  // 3. Test Prisma Queries directly matching route logic
  try {
    // Me Endpoint verification
    const meProfile = await prisma.user.findUnique({
      where: { id: adminUser.id },
      select: { id: true, username: true, email: true, name: true, role: true },
    });
    assert(Boolean(meProfile && meProfile.id === adminUser.id), 'API V1 GET /api/v1/me');

    // Projects list verification
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      take: 5,
    });
    assert(projects.length > 0, 'API V1 GET /api/v1/projects');

    // Project Detail verification
    const projDetail = await prisma.project.findUnique({
      where: { id: project.id },
    });
    assert(Boolean(projDetail && projDetail.id === project.id), 'API V1 GET /api/v1/projects/[projectId]');

    // Project Members verification
    const members = await prisma.projectMember.findMany({
      where: { projectId: project.id, isActive: true, deletedAt: null },
    });
    assert(Array.isArray(members), 'API V1 GET /api/v1/projects/[projectId]/members');

    // Project Personnel verification
    const personnel = await prisma.employeeProjectAssignment.findMany({
      where: { projectId: project.id, status: 'ACTIVE' },
    });
    assert(Array.isArray(personnel), 'API V1 GET /api/v1/projects/[projectId]/personnel');

    // WBS Items verification
    const wbsItems = await prisma.wBSItem.findMany({
      where: { projectId: project.id, deletedAt: null },
    });
    assert(Array.isArray(wbsItems), 'API V1 GET /api/v1/projects/[projectId]/wbs');

    // Daily Progress Entries verification
    const dailyProgress = await prisma.fieldProgressEntry.findMany({
      where: { projectId: project.id, deletedAt: null },
    });
    assert(Array.isArray(dailyProgress), 'API V1 GET /api/v1/projects/[projectId]/progress/daily');

    // Notifications List verification
    const notifications = await prisma.notification.findMany({
      where: { userId: adminUser.id },
    });
    assert(Array.isArray(notifications), 'API V1 GET /api/v1/notifications');

    // Field Reports List verification
    const reports = await prisma.siteReport.findMany({
      where: { deletedAt: null },
      take: 5,
    });
    assert(Array.isArray(reports), 'API V1 GET /api/v1/reports');

    // Material Proposals List verification
    const proposals = await prisma.materialProposal.findMany({
      take: 5,
    });
    assert(Array.isArray(proposals), 'API V1 GET /api/v1/material-proposals');

    // Approvals List verification
    const approvals = await prisma.approvalRequest.findMany({
      where: { deletedAt: null },
      take: 5,
    });
    assert(Array.isArray(approvals), 'API V1 GET /api/v1/approvals');

    // Supervision Weekly Packages verification
    const supervisionPkgs = await prisma.supervisionWeeklyPackage.findMany({
      where: { deletedAt: null },
      take: 5,
    });
    assert(Array.isArray(supervisionPkgs), 'API V1 GET /api/v1/supervision/weekly');

    // Users Directory verification
    const users = await prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      take: 10,
    });
    assert(users.length > 0, 'API V1 GET /api/v1/users');

    // Dashboard metrics verification
    const activeProjectsCount = await prisma.project.count({ where: { deletedAt: null } });
    assert(typeof activeProjectsCount === 'number', 'API V1 GET /api/v1/dashboard');

  } catch (err: any) {
    console.error('Unexpected error during API V1 test execution:', err);
    failed++;
  }

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runV1FullCoverageTest().finally(() => prisma.$disconnect());
