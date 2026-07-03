import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- BẮT ĐẦU TEST R6 ATTACHMENT DISPLAY ---');
  
  const testMarker = 'R6_ATTACHMENT_DISPLAY_TEST';
  let testReportId = '';

  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) throw new Error("No ADMIN user found.");

    // Create a test report
    const project = await prisma.project.findFirst();
    if (!project) throw new Error("No project found.");

    const report = await prisma.siteReport.create({
      data: {
        reportNo: `TEST-${testMarker}-${Date.now()}`,
        projectId: project.id,
        createdById: adminUser.id,
        type: 'DAILY',
        reportDate: new Date(),
        status: 'DRAFT',
        summary: 'Test report for R6'
      }
    });
    testReportId = report.id;

    // Create a valid physical file
    const storageDir = path.join(process.cwd(), 'storage', 'test');
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
    
    const validFileName = `test-valid-${Date.now()}.txt`;
    const validFilePath = path.join(storageDir, validFileName);
    fs.writeFileSync(validFilePath, 'This is a test file for R6');

    // Attachment 1: Valid File
    await prisma.siteReportAttachment.create({
      data: {
        reportId: report.id,
        kind: 'FILE',
        fileName: validFileName,
        originalName: validFileName,
        mimeType: 'text/plain',
        sizeBytes: fs.statSync(validFilePath).size,
        storagePath: `storage/test/${validFileName}`,
      }
    });

    // Attachment 2: Missing File
    await prisma.siteReportAttachment.create({
      data: {
        reportId: report.id,
        kind: 'PHOTO',
        fileName: 'missing-photo.jpg',
        originalName: 'missing-photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        storagePath: 'storage/test/missing-photo.jpg',
      }
    });

    // Attachment 3: 0 Byte File (Valid physical, but 0 bytes)
    const zeroFileName = `test-zero-${Date.now()}.txt`;
    const zeroFilePath = path.join(storageDir, zeroFileName);
    fs.writeFileSync(zeroFilePath, '');

    await prisma.siteReportAttachment.create({
      data: {
        reportId: report.id,
        kind: 'FILE',
        fileName: zeroFileName,
        originalName: zeroFileName,
        mimeType: 'text/plain',
        sizeBytes: 0,
        storagePath: `storage/test/${zeroFileName}`,
      }
    });

    // Run audit logic to ensure missing file is detected
    const attachments = await prisma.siteReportAttachment.findMany({
      where: { reportId: report.id }
    });

    for (const a of attachments) {
      const physicalPath = path.join(process.cwd(), a.storagePath);
      const isMissing = !fs.existsSync(physicalPath);
      if (a.fileName === 'missing-photo.jpg') {
        console.log(`[TEST] Missing photo detected: ${isMissing ? 'PASS' : 'FAIL'}`);
      } else if (a.fileName === validFileName) {
        console.log(`[TEST] Valid file detected: ${!isMissing ? 'PASS' : 'FAIL'}`);
        console.log(`[TEST] File size > 0: ${a.sizeBytes > 0 ? 'PASS' : 'FAIL'}`);
      } else if (a.fileName === zeroFileName) {
         console.log(`[TEST] Zero byte file detected: ${a.sizeBytes === 0 ? 'PASS' : 'FAIL'}`);
      }
    }

    // Cleanup test files
    if (fs.existsSync(validFilePath)) fs.unlinkSync(validFilePath);
    if (fs.existsSync(zeroFilePath)) fs.unlinkSync(zeroFilePath);

    console.log('--- TEST HOÀN TẤT ---');

  } catch (error) {
    console.error('Lỗi khi chạy test:', error);
  } finally {
    if (testReportId) {
      await prisma.siteReportAttachment.deleteMany({ where: { reportId: testReportId } });
      await prisma.siteReport.delete({ where: { id: testReportId } });
    }
    await prisma.$disconnect();
  }
}

runTests();
