import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function auditDocumentInventory() {
  const { default: prisma } = await import('../src/lib/prisma');

  console.log('================================================================');
  console.log('DOCUMENT DOMAIN INVENTORY AUDIT');
  console.log('================================================================');

  const totalDocuments = await prisma.document.count({ where: { deletedAt: null } });
  const totalFolders = await prisma.documentFolder.count({ where: { deletedAt: null } });
  const siteReportAttachments = await prisma.siteReportAttachment.count();
  const supervisionAttachments = await prisma.supervisionWeeklyAttachment.count();
  const safetyFiles = await prisma.safetyWeeklyFile.count({ where: { deletedAt: null } });

  console.log(`Real Document records in DB:             ${totalDocuments}`);
  console.log(`DocumentFolder records in DB:           ${totalFolders}`);
  console.log(`SiteReportAttachment records in DB:     ${siteReportAttachments}`);
  console.log(`SupervisionWeeklyAttachment records:    ${supervisionAttachments}`);
  console.log(`SafetyWeeklyFile records in DB:         ${safetyFiles}`);

  if (totalDocuments > 0) {
    const sampleDocs = await prisma.document.findMany({
      take: 5,
      select: { id: true, projectId: true, originalName: true, documentType: true, status: true, version: true }
    });
    console.log('Sample documents:', sampleDocs);
  }

  await prisma.$disconnect();
}

auditDocumentInventory().catch(console.error);
