import prisma from "../src/lib/prisma";
import { strict as assert } from "assert";

async function main() {
  console.log("=== Bắt đầu QA: Material Group Create & Filter (DB Test) ===");
  const projectId = "proj-grp-qa-" + Date.now();
  const materialIds: string[] = [];

  try {
    // 1. Tạo project test
    await prisma.project.create({
      data: {
        id: projectId,
        code: "GRP-QA-" + Date.now(),
        name: "Test Project for Group QA",
      }
    });
    console.log("  ✅ Project tạo xong");

    // 2. Tạo vật tư với group tiếng Việt có dấu
    const group1 = "QA Nhóm Vật Tư Có Dấu";
    const mat1 = await prisma.materialItem.create({
      data: {
        projectId,
        code: "QA-GRP-" + Date.now(),
        name: "Vật tư test nhóm 1",
        unit: "cái",
        group: group1,
      }
    });
    materialIds.push(mat1.id);
    assert.equal(mat1.group, group1, "Group 1 phải lưu nguyên gốc tiếng Việt có dấu");
    console.log(`  ✅ Tạo vật tư với group="${group1}" - OK`);

    // 3. Update group sang giá trị mới
    const group2 = "QA Thiết Bị Mạng";
    const updated = await prisma.materialItem.update({
      where: { id: mat1.id },
      data: { group: group2 }
    });
    assert.equal(updated.group, group2, "Group 2 phải cập nhật đúng");
    console.log(`  ✅ Sửa group thành "${group2}" - OK`);

    // 4. Verify group cũ không còn trong danh sách active
    const activeItems = await prisma.materialItem.findMany({
      where: { projectId, isActive: true },
      select: { group: true },
    });
    const activeGroups = new Set(activeItems.map(i => i.group).filter(Boolean));
    assert.ok(!activeGroups.has(group1), "Group cũ không nên còn trong active list");
    assert.ok(activeGroups.has(group2), "Group mới phải có trong active list");
    console.log("  ✅ Filter groups: group cũ biến mất, group mới xuất hiện - OK");

    // 5. Archive vật tư
    await prisma.materialItem.update({
      where: { id: mat1.id },
      data: { isActive: false }
    });
    const activeAfterArchive = await prisma.materialItem.findMany({
      where: { projectId, isActive: true },
      select: { group: true },
    });
    const activeGroupsAfterArchive = new Set(activeAfterArchive.map(i => i.group).filter(Boolean));
    assert.ok(!activeGroupsAfterArchive.has(group2), "Group archived phải biến mất khỏi active filter");
    console.log("  ✅ Archive: group biến mất khỏi active filter - OK");

    // 6. Verify tiếng Việt không bị mất dấu trong DB
    const reloaded = await prisma.materialItem.findUnique({ where: { id: mat1.id } });
    assert.ok(reloaded, "Vật tư phải tồn tại");
    assert.equal(reloaded!.group, group2, "Group phải giữ nguyên dấu tiếng Việt sau reload");
    console.log("  ✅ Tiếng Việt có dấu bảo toàn sau reload DB - OK");

    console.log("\n✅ TẤT CẢ DB ASSERTIONS ĐÃ QUA!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  } finally {
    // Rollback: xóa tất cả dữ liệu test
    for (const id of materialIds) {
      await prisma.materialItem.delete({ where: { id } }).catch(() => {});
    }
    await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
    await prisma.$disconnect();
    console.log("  🧹 Rollback dữ liệu test hoàn tất");
  }
}

main();
