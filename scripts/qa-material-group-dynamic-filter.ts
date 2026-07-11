import prisma from "../src/lib/prisma";
import { strict as assert } from "assert";

async function main() {
  console.log("=== Bắt đầu QA: Nhóm vật tư ===");
  const projectId = "proj-test-" + Date.now();
  let materialId = "";

  try {
    // 1. Tạo project
    await prisma.project.create({
      data: {
        id: projectId,
        code: "TEST-" + Date.now(),
        name: "Test Project",
      }
    });

    // 2. Tạo vật tư với group mới
    const group1 = "Nhóm Ống nhựa QA";
    const material = await prisma.materialItem.create({
      data: {
        projectId,
        code: "TEST-MAT-" + Date.now(),
        name: "Test Material",
        unit: "cái",
        group: group1,
      }
    });
    materialId = material.id;

    assert.equal(material.group, group1, "Group name must match perfectly");

    // 3. Sửa nhóm vật tư
    const group2 = "Nhóm Thiết bị điện QA";
    const updated = await prisma.materialItem.update({
      where: { id: material.id },
      data: { group: group2 }
    });
    
    assert.equal(updated.group, group2, "Group name must update perfectly");

    // 4. Archive
    const archived = await prisma.materialItem.update({
      where: { id: material.id },
      data: { isActive: false }
    });
    
    assert.equal(archived.isActive, false, "Must archive properly");

    console.log("✅ Tất cả assertions đã qua!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    if (materialId) await prisma.materialItem.delete({ where: { id: materialId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  }
}
main();
