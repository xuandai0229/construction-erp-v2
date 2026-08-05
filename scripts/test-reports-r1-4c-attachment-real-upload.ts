import prisma from '../src/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

async function runTest() {
  console.log('--- BẮT ĐẦU TEST UPLOAD QUA HTTP ---');
  try {
    const project = await prisma.project.findFirst({ where: { deletedAt: null } });
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    
    if (!project || !user) throw new Error("Missing project or user");

    // 1. Create a Draft report
    const report = await prisma.siteReport.create({
      data: {
        projectId: project.id,
        type: 'DAILY',
        reportDate: new Date(),
        status: 'DRAFT',
        createdById: user.id,
        reporterName: user.name,
        lines: {
          create: [{
            projectId: project.id,
            workContent: 'Test Upload R1_4C_UPLOAD_TEST',
            quantityToday: 1,
            unit: 'Lần',
            sortOrder: 0
          }]
        }
      }
    });

    console.log(`Tạo report DRAFT thành công: ${report.id}`);

    // Create fake JPG
    const photoBuffer = Buffer.from('FFD8FFE000104A46494600010101006000600000FFDB004300080606070605080707070909080A0C140D0C0B0B0C1912130F141D1A1F1E1D1A1C1C20242E2720222C231C1C2837292C30313434341F27393D38323C2E333432FFDB0043010909090C0B0C180D0D1832211C213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232FFC00011080001000103011100021101031101FFC4001F0000010501010101010100000000000000000102030405060708090A0BFFC400B5100002010303020403050504040000017D01020300041105122131410613516107227114328191A1082342B1C11552D1F02433627282090A161718191A25262728292A3435363738393A434445464748494A535455565758595A636465666768696A737475767778797A838485868788898A92939495969798999AA2A3A4A5A6A7A8A9AAB2B3B4B5B6B7B8B9BAC2C3C4C5C6C7C8C9CAD2D3D4D5D6D7D8D9DAE1E2E3E4E5E6E7E8E9EAF1F2F3F4F5F6F7F8F9FAFFC4001F0100030101010101010101010000000000000102030405060708090A0BFFC400B51100020102040403040705040400010277000102031104052131061241510761711322328108144291A1B1C109233352F0156272D10A162434E125F11718191A262728292A35363738393A434445464748494A535455565758595A636465666768696A737475767778797A82838485868788898A92939495969798999AA2A3A4A5A6A7A8A9AAB2B3B4B5B6B7B8B9BAC2C3C4C5C6C7C8C9CAD2D3D4D5D6D7D8D9DAE2E3E4E5E6E7E8E9EAF2F3F4F5F6F7F8F9FAFFDA000C03010002110311003F00F911', 'hex');

    // 2. Login to get cookie
    console.log('Logging in to get cookie...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'daicongtu2910@gmail.com', password: 'xuandai0229' })
    });
    
    if (!loginRes.ok) throw new Error("Login failed");
    
    const cookies = loginRes.headers.get('set-cookie');
    if (!cookies) throw new Error("No cookies from login");
    
    const sessionCookie = cookies.split(';')[0]; // simple extraction
    
    // 3. Upload the fake PDF using FormData
    console.log('Uploading photo...');
    const formData = new FormData();
    formData.append("kind", "FILE");
    
    // Note: Node.js 18+ FormData supports Blob/File
    const pdfBuffer = Buffer.from('255044462D312E340A25C3A4C3BCC3B6C39F0A322030206F626A0A3C3C2F4C656E6774682033203020522F46696C7465722F466C6174654465636F64653E3E0A73747265616D0A789C0300000000010A656E6473747265616D0A656E646F626A0A', 'hex'); // valid fake pdf
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append("files", blob, "test-real.pdf");

    const uploadRes = await fetch(`http://localhost:3000/api/reports/${report.id}/attachments`, {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie
      },
      body: formData
    });

    const resData = await uploadRes.json();
    console.log('Upload response status:', uploadRes.status);
    console.log('Upload response body:', resData);

    if (uploadRes.status !== 200) {
      console.error('FAIL: Upload rejected');
    } else {
      console.log('PASS: Upload accepted');
    }

    // Cleanup
    await prisma.siteReportAttachment.deleteMany({ where: { reportId: report.id } });
    await prisma.siteReportLine.deleteMany({ where: { siteReportId: report.id } });
    await prisma.siteReport.delete({ where: { id: report.id } });

  } catch (error) {
    console.error('Lỗi test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
