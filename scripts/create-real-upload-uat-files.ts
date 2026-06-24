import fs from 'fs';
import path from 'path';

function createFiles() {
  console.log('=== CREATE REAL UPLOAD UAT FILES ===\n');

  const fixtureDir = path.join(process.cwd(), 'storage', 'uat-upload-fixtures');
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }

  // 1. Create a valid 1x1 PNG (base64 decoded)
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const pngPath = path.join(fixtureDir, 'UAT_REAL_SITE_PHOTO_001.png');
  fs.writeFileSync(pngPath, Buffer.from(pngBase64, 'base64'));
  console.log(`Created valid PNG at: ${pngPath}`);

  // 2. Create a minimal valid PDF
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000111 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
192
%%EOF`;
  const pdfPath = path.join(fixtureDir, 'UAT_REAL_REPORT_ATTACHMENT_001.pdf');
  fs.writeFileSync(pdfPath, pdfContent);
  console.log(`Created valid PDF at: ${pdfPath}`);

  // 3. Create a fake invalid image (TXT but named JPG)
  const fakeJpgPath = path.join(fixtureDir, 'UAT_FAKE_IMAGE.jpg');
  fs.writeFileSync(fakeJpgPath, 'This is actually a text file but named jpg.');
  console.log(`Created FAKE JPG at: ${fakeJpgPath}`);

  console.log('\n[!] Files created successfully.');
}

createFiles();
