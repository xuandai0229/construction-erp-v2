import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== BẮT ĐẦU SEED DỮ LIỆU HỢP ĐỒNG THỊ TRƯỜNG ===");

  const project = await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!project) throw new Error("Không tìm thấy Project nào");

  const suppliers = await prisma.supplier.findMany({ where: { deletedAt: null }, take: 5 });
  
  if (suppliers.length < 2) {
    console.log("Cảnh báo: Không đủ supplier để tạo seed phong phú. Bạn nên tạo thêm supplier trước.");
  }

  const today = new Date();
  
  // Dài hạn: start 1 month ago, end 6 months from now
  const longTermStart = new Date(today);
  longTermStart.setMonth(today.getMonth() - 1);
  const longTermEnd = new Date(today);
  longTermEnd.setMonth(today.getMonth() + 6);
  const longTermSign = new Date(longTermStart);
  longTermSign.setDate(longTermStart.getDate() - 10);

  // Sắp hết hạn: start 1 month ago, end 20 days from now
  const expiringStart = new Date(today);
  expiringStart.setMonth(today.getMonth() - 1);
  const expiringEnd = new Date(today);
  expiringEnd.setDate(today.getDate() + 20);
  const expiringSign = new Date(expiringStart);
  expiringSign.setDate(expiringStart.getDate() - 5);

  // Quá hạn: start 2 months ago, end 10 days ago
  const overdueStart = new Date(today);
  overdueStart.setMonth(today.getMonth() - 2);
  const overdueEnd = new Date(today);
  overdueEnd.setDate(today.getDate() - 10);
  const overdueSign = new Date(overdueStart);
  overdueSign.setDate(overdueStart.getDate() - 7);

  // Hoàn thành: start 6 months ago, end 2 months ago
  const completedStart = new Date(today);
  completedStart.setMonth(today.getMonth() - 6);
  const completedEnd = new Date(today);
  completedEnd.setMonth(today.getMonth() - 2);
  const completedSign = new Date(completedStart);
  completedSign.setDate(completedStart.getDate() - 10);

  const contractsData = [
    {
      projectId: project.id,
      supplierId: null, // Chủ đầu tư không lấy từ supplier
      contractNo: `HDTC-${new Date().getFullYear()}/01`,
      name: "Hợp đồng thi công xây dựng chính",
      type: "CLIENT",
      status: "ACTIVE",
      value: 15000000000,
      signDate: longTermSign,
      startDate: longTermStart,
      endDate: longTermEnd,
    },
    {
      projectId: project.id,
      supplierId: suppliers[0]?.id || null,
      contractNo: `HDTP-XD-${new Date().getFullYear()}/02`,
      name: "Hợp đồng thầu phụ thi công xây thô",
      type: "SUBCONTRACTOR",
      status: "ACTIVE",
      value: 5000000000,
      signDate: expiringSign,
      startDate: expiringStart,
      endDate: expiringEnd,
    },
    {
      projectId: project.id,
      supplierId: suppliers[1]?.id || null,
      contractNo: `HDTP-MEP-${new Date().getFullYear()}/03`,
      name: "Hợp đồng thi công hệ thống Cơ điện (MEP)",
      type: "SUBCONTRACTOR",
      status: "DRAFT",
      value: 3200000000,
      signDate: null,
      startDate: null,
      endDate: null,
    },
    {
      projectId: project.id,
      supplierId: suppliers[2]?.id || suppliers[0]?.id || null,
      contractNo: `HDCC-BT-${new Date().getFullYear()}/04`,
      name: "Hợp đồng cung cấp bê tông thương phẩm",
      type: "SUPPLIER",
      status: "ACTIVE",
      value: 1200000000,
      signDate: overdueSign,
      startDate: overdueStart,
      endDate: overdueEnd,
    },
    {
      projectId: project.id,
      supplierId: suppliers[0]?.id || null, // attached to supplier for LABOR
      contractNo: `HDKN-01`,
      name: "Khoán nhân công tổ đội cốt thép",
      type: "LABOR",
      status: "COMPLETED",
      value: 850000000,
      signDate: completedSign,
      startDate: completedStart,
      endDate: completedEnd,
    }
  ];

  let createdCount = 0;
  for (const data of contractsData) {
    try {
      const contract = await prisma.contract.upsert({
        where: { contractNo: data.contractNo },
        create: data as any,
        update: {
          name: data.name,
          type: data.type as any,
          status: data.status as any,
          value: data.value,
          signDate: data.signDate,
          startDate: data.startDate,
          endDate: data.endDate,
          projectId: data.projectId,
          supplierId: data.supplierId,
          deletedAt: null,
        }
      });
      console.log(`[+] Đã upsert: ${contract.contractNo} - ${contract.name}`);
      createdCount++;
    } catch (e: any) {
      console.error(`[!] Lỗi khi upsert ${data.contractNo}: ${e.message}`);
    }
  }

  console.log(`\n=== HOÀN THÀNH. Đã xử lý ${createdCount} hợp đồng. ===`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
