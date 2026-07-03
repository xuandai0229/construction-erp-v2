import prisma from '../src/lib/prisma';

async function main() {
  console.log('=== REPAIR UAT DEMO REPORT LINE UNITS ===\n');

  const uatProject = await prisma.project.findUnique({ where: { code: 'UAT-DEMO-001' } });
  if (!uatProject) {
    console.error('UAT-DEMO-001 project not found.');
    return;
  }

  const pid = uatProject.id;

  const lines = await prisma.siteReportLine.findMany({
    where: { siteReport: { projectId: pid } }
  });

  let updatedCount = 0;

  for (const line of lines) {
    if (line.unit === 'n/a' || !line.unit) {
      if (line.fieldProgressItemId) {
        const fpItem = await prisma.fieldProgressItem.findUnique({ where: { id: line.fieldProgressItemId } });
        if (fpItem && fpItem.unit) {
          await prisma.siteReportLine.update({
            where: { id: line.id },
            data: { unit: fpItem.unit }
          });
          updatedCount++;
        }
      }
    }
  }

  console.log(`[!] Updated ${updatedCount} report lines with proper unit.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
