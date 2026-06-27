import * as fs from 'fs';
import * as path from 'path';

function checkFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let hasNumberType = false;
  let missingInputMode = false;

  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('type="number"')) {
      hasNumberType = true;
      // check if surrounding lines have inputMode="decimal"
      let found = false;
      for (let j = Math.max(0, i - 10); j <= Math.min(lines.length - 1, i + 10); j++) {
        if (lines[j].includes('inputMode="decimal"')) {
          found = true;
          break;
        }
      }
      if (!found) {
        missingInputMode = true;
        console.error(`- Thiếu inputMode="decimal" ở ${filePath}:${i+1}`);
      }
    }
  });

  if (hasNumberType && !missingInputMode) {
    console.log(`- ${path.basename(filePath)}: OK (đã có inputMode="decimal" ở tất cả input số)`);
  }
}

function main() {
  console.log("=== KIỂM TRA UI STATIC: THUỘC TÍNH SỐ LƯỢNG ===\n");
  checkFile('./src/components/materials/transaction-form-dialog.tsx');
  checkFile('./src/components/materials/material-form-dialog.tsx');
  checkFile('./src/components/material-request/material-request-form.tsx');
  checkFile('./src/components/material-request/material-request-detail.tsx');
  console.log("\n=> Hoàn tất kiểm tra.");
}

main();
