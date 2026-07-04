
import { getProjectWorkItems } from "../src/app/(dashboard)/reports/actions";

import prisma from "../src/lib/prisma";

// We need to mock getSession to make getProjectWorkItems work, because we are running via CLI.
jest = typeof jest !== "undefined" ? jest : { mock: () => {} };

async function main() {
  console.log("=== BẮT ĐẦU KIỂM TRA DỮ LIỆU WORKPICKER ===");
  
  const projectCode = "CT-TAYHO-2026-001";
  console.log(`Đang tìm công trình: ${projectCode}`);
  const project = await prisma.project.findFirst({ where: { code: projectCode } });
  if (!project) {
    console.error(`LỖI: Không tìm thấy công trình với code ${projectCode}`);
    return;
  }
  const projectId = project.id;
  console.log(`Kiểm tra công trình: ${projectId}`);
  
  const templates = await prisma.fieldProgressTemplate.count({
    where: { projectId, deletedAt: null }
  });
  console.log(`Số bảng khối lượng gốc (templates): ${templates}`);
  
  const totalItems = await prisma.fieldProgressItem.count({
    where: { projectId, deletedAt: null, itemType: "WORK" }
  });
  console.log(`Tổng số công việc (itemType: WORK): ${totalItems}`);

  if (totalItems < 20) {
    console.error("LỖI: Số lượng công việc ít hơn 20 (Dữ liệu seed không đúng)");
  }
  
  // Since we can't easily run the Next.js server action from CLI without mocking cookies/session
  // we will duplicate the logic of getProjectWorkItems here to test the raw query.
  
  const richFieldItems = await prisma.fieldProgressItem.findMany({
    where: { projectId, deletedAt: null, itemType: "WORK" },
    select: {
      id: true,
      code: true,
      categoryName: true,
      workContent: true,
      designQuantity: true,
      unit: true,
      status: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  
  console.log(`\n=== KẾT QUẢ QUERY ==="`);
  console.log(`Số lượng item lấy được qua API query: ${richFieldItems.length}`);
  
  if (richFieldItems.length > 0) {
    console.log(`\n=== 3 ITEM MẪU ===`);
    richFieldItems.slice(0, 3).forEach(item => {
      console.log(`- [${item.code || 'NO_CODE'}] ${item.workContent} | ${item.designQuantity} ${item.unit} | ${item.categoryName}`);
    });
  } else {
    console.error("LỖI: Query trả về rỗng!");
  }
  
  console.log("\n=== HOÀN TẤT KIỂM TRA ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
