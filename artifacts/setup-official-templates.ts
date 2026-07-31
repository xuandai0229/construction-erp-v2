import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function sha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

const targetDir = 'docs/official-templates';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const reportSource = 'artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia.docx';
const planSource = 'artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra.docx';

const reportTarget = path.join(targetDir, '01-Bao cao tu danh gia cong tac ATLĐ-PCCC-VSMT.docx');
const planTarget = path.join(targetDir, '02-Ke hoach va Ket qua kiem tra ATLĐ-PCCC-VSMT hang tuan.docx');

fs.copyFileSync(reportSource, reportTarget);
fs.copyFileSync(planSource, planTarget);

// Remove temporary restored path
fs.rmSync('artifacts/safety-inspection-template-analysis', { recursive: true, force: true });

const manifest = {
  createdDate: new Date().toISOString(),
  templates: [
    {
      id: "01-bao-cao-tu-danh-gia",
      title: "BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA AT, VSLĐ",
      filename: "01-Bao cao tu danh gia cong tac ATLĐ-PCCC-VSMT.docx",
      path: reportTarget.replace(/\\/g, '/'),
      sizeBytes: fs.statSync(reportTarget).size,
      sha256: sha256(reportTarget)
    },
    {
      id: "02-ke-hoach-kiem-tra-tuan",
      title: "KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT CÔNG TRÌNH",
      filename: "02-Ke hoach va Ket qua kiem tra ATLĐ-PCCC-VSMT hang tuan.docx",
      path: planTarget.replace(/\\/g, '/'),
      sizeBytes: fs.statSync(planTarget).size,
      sha256: sha256(planTarget)
    }
  ]
};

const manifestPath = path.join(targetDir, 'templates-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('Successfully set up docs/official-templates and templates-manifest.json:');
console.log(JSON.stringify(manifest, null, 2));
