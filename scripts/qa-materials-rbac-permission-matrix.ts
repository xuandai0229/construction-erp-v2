import prisma from '../src/lib/prisma';
import { getMaterialPermissions } from '../src/lib/materials/materials-permissions';

const TARGET_PROJECT_ID = "cmr5p2iwm0009r4wk51lwxhjy";

async function main() {
  console.log("=== BẮT ĐẦU KIỂM TRA RBAC PERMISSION MATRIX ===");
  console.log(`ProjectId: ${TARGET_PROJECT_ID}`);
  console.log();

  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    include: {
      projectMembers: {
        where: { projectId: TARGET_PROJECT_ID, isActive: true, deletedAt: null }
      }
    }
  });

  const header = [
    "User".padEnd(20),
    "SysRole".padEnd(12),
    "ProjRole".padEnd(20),
    "View".padEnd(6),
    "Create".padEnd(8),
    "Update".padEnd(8),
    "Delete".padEnd(8),
    "Import".padEnd(8),
    "Export".padEnd(8),
    "Restore".padEnd(8) // Tied to canUpdate
  ].join(" | ");

  const sep = "".padEnd(header.length + 4, "-");
  console.log(sep);
  console.log(header);
  console.log(sep);

  for (const user of users) {
    const projMember = user.projectMembers[0];
    const projRole = projMember?.role || null;
    const perms = getMaterialPermissions(user.role, projRole);

    const row = [
      user.name?.padEnd(20).slice(0, 20) || "Unknown".padEnd(20),
      user.role.padEnd(12),
      (projRole || "N/A").padEnd(20),
      String(perms.canView).padEnd(6),
      String(perms.canCreate).padEnd(8),
      String(perms.canUpdate).padEnd(8),
      String(perms.canDelete).padEnd(8),
      String(perms.canImport).padEnd(8),
      String(perms.canExport).padEnd(8),
      String(perms.canUpdate).padEnd(8) // restoreMaterialItem uses canUpdate
    ].join(" | ");

    console.log(row);
  }
  
  console.log(sep);

  console.log("\n--- TỔNG KẾT QUYỀN (PERMISSION MAPPING) ---");
  console.log("- Xem tồn kho: Dựa trên `canView`");
  console.log("- Tạo vật tư: Dựa trên `canCreate`");
  console.log("- Sửa vật tư: Dựa trên `canUpdate`");
  console.log("- Xóa/Lưu trữ: Dựa trên `canDelete`");
  console.log("- Nhập kho: Dựa trên `canImport`");
  console.log("- Xuất kho: Dựa trên `canExport`");
  console.log("- Khôi phục vật tư: Dựa trên `canUpdate` (Hành động này khôi phục thuộc tính isActive của Master Data, nên dùng chung quyền update master data).");
  
  console.log("\n--- TRẢ LỜI: QUYỀN CỦA CHỈ HUY TRƯỞNG ---");
  console.log("Vai trò Chỉ huy trưởng (SITE_COMMANDER / CHIEF_COMMANDER) theo `materials-permissions.ts` được xếp vào nhóm `isManager`.");
  console.log("Do đó, Chỉ huy trưởng ĐƯỢC PHÉP:");
  console.log("  - Nhập kho: CÓ (`canImport: true`)");
  console.log("  - Xuất kho: CÓ (`canExport: true`)");
  console.log("  - Sửa vật tư: CÓ (`canUpdate: true`)");
  console.log("  - Xóa/Lưu trữ: CÓ (`canDelete: true`)");
  console.log("  - Khôi phục: CÓ (`canUpdate: true`)");

  console.log("\n=== KẾT THÚC ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
