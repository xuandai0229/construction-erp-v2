import prisma from '../src/lib/prisma';

async function main() {
  console.log('Starting test: Create Site Report...');

  // 1. Get first active project
  const project = await prisma.project.findFirst({
    where: { status: 'ACTIVE', deletedAt: null },
  });

  if (!project) {
    console.log('No active project found. Exiting.');
    return;
  }

  console.log(`Using Project: ${project.name} (ID: ${project.id})`);

  // 2. Get first user (to act as reporter)
  const user = await prisma.user.findFirst({
    where: { isActive: true, deletedAt: null },
  });

  if (!user) {
    console.log('No active user found. Exiting.');
    return;
  }

  console.log(`Using User: ${user.name} (ID: ${user.id})`);

  // 3. Create test report
  const report = await prisma.siteReport.create({
    data: {
      projectId: project.id,
      type: 'DAILY',
      reportDate: new Date(),
      weatherCondition: 'SUNNY',
      weatherTemperature: 32,
      summary: 'Test summary from script',
      createdById: user.id,
      reporterName: user.name,
      status: 'DRAFT',
      title: 'TEST-REPORT-001',
      lines: {
        create: [
          {
            projectId: project.id,
            workContent: 'Test Work Line 1',
            workName: 'Test Work Line 1',
            quantityToday: 10,
            unit: 'm3',
            sortOrder: 0,
          },
          {
            projectId: project.id,
            workContent: 'Test Work Line 2',
            workName: 'Test Work Line 2',
            quantityToday: 5,
            unit: 'tấn',
            sortOrder: 1,
          }
        ]
      }
    },
    include: {
      lines: true
    }
  });

  console.log('\n✅ Successfully created SiteReport!');
  console.log(`Report ID: ${report.id}`);
  console.log(`Report No: ${report.reportNo}`);
  console.log(`Lines created: ${report.lines.length}`);
}

main()
  .catch((e) => {
    console.error('Error creating report:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
