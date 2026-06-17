import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== Bắt đầu Test Tích Hợp Material Requests & Field Progress ===");

  const project = await prisma.project.findFirst({
    where: {
      deletedAt: null,
      fieldProgressTemplates: { some: { deletedAt: null } },
    },
  });
  if (!project) throw new Error("Cần có ít nhất 1 Project active có FieldProgressTemplate để test");

  const template = await prisma.fieldProgressTemplate.findFirst({ where: { projectId: project.id } });
  if (!template) {
    console.log("Không có FieldProgressTemplate, bỏ qua integration test.");
    return;
  }

  const wbsItems = await prisma.fieldProgressItem.findMany({ where: { templateId: template.id, itemType: 'WORK' } });
  if (wbsItems.length === 0) {
    console.log("Không có công việc Field Progress nào để link, bỏ qua.");
    return;
  }

  const targetWbsItem = wbsItems[0];
  
  console.log(`1. Kiểm tra sự tồn tại của công việc: ${targetWbsItem.workContent} (ID: ${targetWbsItem.id})`);

  // Ta sẽ thử tạo một Request trỏ vào wbsItem này
  const countBefore = await prisma.materialRequestItem.count({ where: { fieldProgressItemId: targetWbsItem.id } });
  
  console.log("2. Tạo Material Request Item liên kết với công việc này...");
  const user = await prisma.user.findFirst();
  const req = await prisma.materialRequest.create({
    data: {
      projectId: project.id,
      requestNo: `TEST_CRUD_INT_${Date.now()}`,
      requestedById: user!.id,
      requestDate: new Date(),
      status: "DRAFT",
      items: {
        create: [
          { materialName: "Thép", unit: "Tấn", requestedQuantity: 10, remainingQuantity: 10, fieldProgressItemId: targetWbsItem.id }
        ]
      }
    }
  });

  const countAfter = await prisma.materialRequestItem.count({ where: { fieldProgressItemId: targetWbsItem.id } });
  
  if (countAfter === countBefore + 1) {
    console.log("=> Liên kết thành công!");
  } else {
    console.log("=> Liên kết thất bại!");
  }

  console.log("3. Đảm bảo khối lượng công việc Field Progress KHÔNG thay đổi...");
  const wbsItemAfter = await prisma.fieldProgressItem.findUnique({ where: { id: targetWbsItem.id } });
  if (Number(wbsItemAfter?.designQuantity) === Number(targetWbsItem.designQuantity)) {
    console.log("=> Khối lượng thiết kế không bị thay đổi: Pass");
  } else {
    console.log("=> LỖI: Khối lượng thiết kế bị thay đổi!");
  }

  // Cleanup
  await prisma.materialRequestItem.deleteMany({ where: { materialRequestId: req.id } });
  await prisma.materialRequest.delete({ where: { id: req.id } });
  console.log("=== Hoàn tất dọn dẹp data test tích hợp ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
