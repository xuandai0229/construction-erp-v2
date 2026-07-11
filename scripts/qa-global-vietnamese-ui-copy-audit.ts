import * as fs from 'fs';
import * as path from 'path';

function walkSync(dir: string, filelist: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else {
      if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
        filelist.push(filepath);
      }
    }
  }
  return filelist;
}

const files = walkSync(path.join(process.cwd(), 'src'));

let modifiedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Global UI string replacements (Vietnamese unaccented to accented)
  content = content.replace(/"Da luu tru"/g, '"Đã lưu trữ"');
  content = content.replace(/>Da luu tru</g, '>Đã lưu trữ<');
  content = content.replace(/"Tat ca trang thai"/g, '"Tất cả trạng thái"');
  content = content.replace(/>Tat ca trang thai</g, '>Tất cả trạng thái<');
  content = content.replace(/"Chua phan loai"/g, '"Chưa phân loại"');
  content = content.replace(/>Chua phan loai</g, '>Chưa phân loại<');
  content = content.replace(/"Nhap kho"/g, '"Nhập kho"');
  content = content.replace(/>Nhap kho</g, '>Nhập kho<');
  content = content.replace(/"Xuat kho"/g, '"Xuất kho"');
  content = content.replace(/>Xuat kho</g, '>Xuất kho<');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated text in: ${file}`);
    modifiedCount++;
  }
}

console.log(`Done. Modified ${modifiedCount} files.`);
