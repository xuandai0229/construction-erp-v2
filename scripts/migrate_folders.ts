/**
 * Script này được dùng để migrate đổi tên các thư mục Tài liệu mặc định
 * sang chuẩn tiếng Việt có dấu.
 * 
 * HƯỚNG DẪN CHẠY:
 * 1. Đảm bảo DATABASE_URL đã được cấu hình trong môi trường.
 * 2. Cài đặt ts-node hoặc tsx (khuyên dùng tsx).
 * 3. Chạy lệnh: npx tsx scripts/migrate_folders.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LEGACY_FOLDER_MAP: Record<string, string> = {
  "01_Hợp đồng": "01. Hợp đồng pháp lý",
  "01_Hop_dong_Phap_ly": "01. Hợp đồng pháp lý",
  "02_Bản vẽ": "02. Bản vẽ thiết kế",
  "02_Ban_ve": "02. Bản vẽ thiết kế",
  "03_Dự toán": "03. Dự toán", 
  "04_Nghiệm thu": "03. Biên bản nghiệm thu",
  "05_Hóa đơn": "04. Vật tư thiết bị",
  "06_Thanh toán": "07. Thanh toán quyết toán",
  "07_Hình ảnh hiện trường": "05. Hình ảnh tiến độ",
  "08_Báo cáo ngày": "06. Báo cáo hiện trường",
};

async function main() {
  console.log("=========================================");
  console.log("Bắt đầu cập nhật tên thư mục hệ thống...");
  
  if (!process.env.DATABASE_URL) {
    console.error("LỖI: Không tìm thấy DATABASE_URL trong môi trường!");
    process.exit(1);
  }

  const folders = await prisma.documentFolder.findMany();
  let updatedCount = 0;
  
  for (const folder of folders) {
    if (LEGACY_FOLDER_MAP[folder.name]) {
      const newName = LEGACY_FOLDER_MAP[folder.name];
      console.log(`- Đang cập nhật: [${folder.name}] -> [${newName}]`);
      await prisma.documentFolder.update({
        where: { id: folder.id },
        data: { name: newName }
      });
      updatedCount++;
    }
  }
  
  console.log(`=========================================`);
  console.log(`Hoàn tất. Đã cập nhật ${updatedCount} thư mục.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
