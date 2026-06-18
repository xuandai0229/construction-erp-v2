import prisma from "../src/lib/prisma";
import {
  createWithUniqueMaterialRequestNo,
  MATERIAL_REQUEST_NO_PATTERN,
} from "../src/lib/material-request-number";

async function main() {
  console.log("=== QA MATERIAL REQUEST requestNo CONCURRENCY TEST ===");
  const user = await prisma.user.findFirst({ where: { deletedAt: null, isActive: true } });
  const project = await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!user || !project) {
    throw new Error("Cần ít nhất 1 user hoạt động và 1 project để chạy test.");
  }

  const createdIds: string[] = [];
  try {
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        createWithUniqueMaterialRequestNo((requestNo) =>
          prisma.materialRequest.create({
            data: {
              projectId: project.id,
              requestNo,
              requestedById: user.id,
              status: "DRAFT",
              requestDate: new Date(),
              note: "QA requestNo concurrency runtime",
            },
          })
        )
      )
    );

    createdIds.push(...results.map((request) => request.id));
    const requestNos = results.map((request) => request.requestNo);
    if (new Set(requestNos).size !== 10) {
      throw new Error("10 requestNo không duy nhất.");
    }
    if (requestNos.some((requestNo) => !MATERIAL_REQUEST_NO_PATTERN.test(requestNo))) {
      throw new Error("Có requestNo không đúng format MR-YYYYMMDD-HHmmss-XXXX.");
    }

    console.log("PASS: Tạo đồng thời 10 phiếu, requestNo đúng format và không trùng.");
  } finally {
    if (createdIds.length > 0) {
      await prisma.materialRequest.deleteMany({ where: { id: { in: createdIds } } });
    }
    const remaining = await prisma.materialRequest.count({
      where: { note: "QA requestNo concurrency runtime" },
    });
    if (remaining !== 0) {
      throw new Error(`Cleanup thất bại: còn ${remaining} phiếu concurrency test.`);
    }
    console.log("PASS: Cleanup toàn bộ dữ liệu concurrency test.");
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
