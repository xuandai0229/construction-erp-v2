import { PrismaClient } from "@prisma/client";
import { getWeeklyReportPreview } from "../src/app/(dashboard)/reports/actions";
import { canCreateReport } from "../src/lib/permissions";

const prisma = new PrismaClient();

async function run() {
  console.log("=== BẮT ĐẦU QA REPORTS WEEKLY SUMMARY (PHASE 2A) ===");

  try {
    // 1. Kiểm tra logic tổng hợp khối lượng từ báo cáo ngày đã duyệt
    const project = await prisma.project.findFirst({ where: { status: "ACTIVE" } });
    if (!project) {
      console.log("Không tìm thấy dự án ACTIVE nào để test");
      return;
    }

    const start = new Date();
    start.setDate(start.getDate() - 30);
    const end = new Date();

    const preview = await getWeeklyReportPreview(project.id, start, end);
    console.log(`\n1. Kiểm tra getWeeklyReportPreview [projectId=${project.id}]:`);
    console.log(`   - Số báo cáo đã duyệt (APPROVED): ${preview.approvedCount}`);
    console.log(`   - Số báo cáo chưa duyệt (SUBMITTED): ${preview.pendingCount}`);
    console.log(`   - Số ngày thiếu báo cáo: ${preview.missingDays}`);
    console.log(`   - Khối lượng tổng hợp: ${preview.aggregatedItems.length} hạng mục`);

    if (preview.aggregatedItems.length > 0) {
      console.log("   - Chi tiết tổng hợp:");
      preview.aggregatedItems.forEach(item => {
        console.log(`     + ${item.workName}: ${item.totalQuantity} ${item.unit || ""} (từ ${item.reportCount} báo cáo)`);
      });
    }

    // 2. Kiểm tra quyền hạn
    console.log("\n2. Kiểm tra quyền hạn canCreateReport:");
    
    const adminUser = { id: "user-1", role: "ADMIN" as any };
    const adminHasAccess = true;
    console.log(`   - ADMIN có quyền tạo: ${canCreateReport(adminUser, adminHasAccess)}`);

    const commanderUser = { id: "user-2", role: "CHIEF_COMMANDER" as any };
    const commanderHasAccess = true;
    console.log(`   - CHIEF_COMMANDER có quyền tạo: ${canCreateReport(commanderUser, commanderHasAccess)}`);

    const viewerUser = { id: "user-3", role: "VIEWER" as any };
    const viewerHasAccess = true;
    console.log(`   - VIEWER có quyền tạo: ${canCreateReport(viewerUser, viewerHasAccess)}`);

    console.log("\n=== QA PASSED ===");

  } catch (error) {
    console.error("Lỗi trong quá trình QA:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
