import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== Bắt đầu Test CRUD Material Requests ===");

  const user = await prisma.user.findFirst();
  if (!user) throw new Error("Cần có ít nhất 1 User để test");

  const project = await prisma.project.findFirst({
    where: {
      deletedAt: null,
      fieldProgressTemplates: { some: { deletedAt: null } },
    },
  }) ?? await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!project) throw new Error("Cần có ít nhất 1 Project active để test");

  const template = await prisma.fieldProgressTemplate.findFirst({ where: { projectId: project.id, deletedAt: null } });
  const wbsItems = template ? await prisma.fieldProgressItem.findMany({ where: { templateId: template.id, itemType: 'WORK', deletedAt: null }, take: 3 }) : [];
  
  // Cleanup old test data
  await prisma.materialRequestItem.deleteMany({
    where: {
      materialRequest: {
        OR: [
          { requestNo: { startsWith: 'TEST-MR-' } },
          { requestNo: { startsWith: 'TEST_CRUD_MR_' } },
        ],
      },
    },
  });
  await prisma.materialRequest.deleteMany({
    where: {
      OR: [
        { requestNo: { startsWith: 'TEST-MR-' } },
        { requestNo: { startsWith: 'TEST_CRUD_MR_' } },
      ],
    },
  });

  // 1. Phiếu nháp 1 vật tư.
  const req1 = await prisma.materialRequest.create({
    data: {
      projectId: project.id,
      requestNo: `TEST_CRUD_MR_DRAFT_${Date.now()}`,
      requestedById: user.id,
      requestDate: new Date(),
      neededDate: new Date(Date.now() + 86400000 * 3),
      status: "DRAFT",
      priority: "LOW",
      note: "Phiếu nháp chuẩn bị thi công",
      items: {
        create: [
          { materialName: "Gạch Tuynel", unit: "Viên", requestedQuantity: 5000, remainingQuantity: 5000, fieldProgressItemId: wbsItems[0]?.id },
        ]
      }
    }
  });

  // 2. Phiếu đã đề xuất 3 vật tư.
  const req2 = await prisma.materialRequest.create({
    data: {
      projectId: project.id,
      requestNo: `TEST_CRUD_MR_REQ_${Date.now()}`,
      requestedById: user.id,
      requestDate: new Date(),
      neededDate: new Date(Date.now() + 86400000 * 5),
      status: "REQUESTED",
      priority: "MEDIUM",
      note: "Vật tư xây móng",
      items: {
        create: [
          { materialName: "Xi măng PCB40", unit: "Bao", requestedQuantity: 200, remainingQuantity: 200, fieldProgressItemId: wbsItems[1]?.id },
          { materialName: "Cát vàng", unit: "Khối", requestedQuantity: 50, remainingQuantity: 50, fieldProgressItemId: wbsItems[2]?.id },
          { materialName: "Đá 1x2", unit: "Khối", requestedQuantity: 30, remainingQuantity: 30 },
        ]
      }
    }
  });

  // 3. Phiếu đang xử lý còn thiếu.
  const req3 = await prisma.materialRequest.create({
    data: {
      projectId: project.id,
      requestNo: `TEST_CRUD_MR_PROC_${Date.now()}`,
      requestedById: user.id,
      requestDate: new Date(),
      neededDate: new Date(Date.now() + 86400000 * 2),
      status: "PROCESSING",
      priority: "HIGH",
      note: "Đang giao dở dang",
      items: {
        create: [
          { materialName: "Thép D10", unit: "Tấn", requestedQuantity: 10, issuedQuantity: 5, receivedQuantity: 5, remainingQuantity: 5 },
          { materialName: "Thép D12", unit: "Tấn", requestedQuantity: 8, issuedQuantity: 8, receivedQuantity: 8, remainingQuantity: 0 },
        ]
      }
    }
  });

  // 4. Phiếu đã nhận đủ.
  const req4 = await prisma.materialRequest.create({
    data: {
      projectId: project.id,
      requestNo: `TEST_CRUD_MR_REC_${Date.now()}`,
      requestedById: user.id,
      requestDate: new Date(),
      neededDate: new Date(Date.now() - 86400000 * 1),
      status: "RECEIVED",
      priority: "URGENT",
      note: "Đã xong đợt 1",
      items: {
        create: [
          { materialName: "Coóng thoát nước", unit: "Ống", requestedQuantity: 50, issuedQuantity: 50, receivedQuantity: 50, remainingQuantity: 0 },
        ]
      }
    }
  });

  // 5. Phiếu hủy có lý do.
  const req5 = await prisma.materialRequest.create({
    data: {
      projectId: project.id,
      requestNo: `TEST_CRUD_MR_CANC_${Date.now()}`,
      requestedById: user.id,
      requestDate: new Date(),
      status: "CANCELLED",
      cancelReason: "Chủ đầu tư thay đổi vật liệu thi công",
      priority: "MEDIUM",
      items: {
        create: [
          { materialName: "Kính cường lực 10mm", unit: "m2", requestedQuantity: 120, remainingQuantity: 120 },
        ]
      }
    }
  });

  console.log("=> Đã tạo 5 phiếu mẫu thành công để test UAT!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
