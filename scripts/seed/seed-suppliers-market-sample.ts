/**
 * Seed: Dữ liệu mẫu thị trường xây dựng cho module Suppliers
 *
 * Dữ liệu MÔ PHỎNG thực tế, KHÔNG phải dữ liệu pháp lý thật.
 * - Email: domain example.local
 * - MST: dạng MST-TEST-xxx
 * - SĐT: dạng 0900 000 xxx
 *
 * Chạy: npx tsx --env-file=.env scripts/seed-suppliers-market-sample.ts
 */

import prisma from "../src/lib/prisma";

interface SeedSupplier {
  code: string;
  name: string;
  taxCode: string;
  phone: string;
  email: string;
  contactPerson: string;
  address: string;
}

const SUPPLIERS: SeedSupplier[] = [
  // ── A. Nhà cung cấp vật liệu chính ──
  {
    code: "NCC-XM-001",
    name: "Công ty TNHH Vật liệu Xây dựng An Phát",
    taxCode: "MST-TEST-001",
    phone: "0900 000 001",
    email: "ncc.xm001@example.local",
    contactPerson: "Nguyễn Văn Hùng",
    address: "Khu công nghiệp Quang Minh, Mê Linh, Hà Nội",
  },
  {
    code: "NCC-XM-002",
    name: "Công ty CP Xi măng và Bê tông Bắc Việt",
    taxCode: "MST-TEST-002",
    phone: "0900 000 002",
    email: "ncc.xm002@example.local",
    contactPerson: "Trần Minh Đức",
    address: "KCN Yên Phong, Bắc Ninh",
  },
  {
    code: "NCC-THEP-001",
    name: "Công ty TNHH Thép Minh Long",
    taxCode: "MST-TEST-003",
    phone: "0900 000 003",
    email: "ncc.thep001@example.local",
    contactPerson: "Lê Hoàng Nam",
    address: "Đường Nguyễn Văn Linh, KCN Phố Nối A, Hưng Yên",
  },
  {
    code: "NCC-THEP-002",
    name: "Công ty CP Thép Kết Cấu Đại Thành",
    taxCode: "MST-TEST-004",
    phone: "0900 000 004",
    email: "ncc.thep002@example.local",
    contactPerson: "Phạm Anh Tuấn",
    address: "KCN Đình Vũ, An Dương, Hải Phòng",
  },
  {
    code: "NCC-CATDA-001",
    name: "Công ty TNHH Cát Đá Sông Hồng",
    taxCode: "MST-TEST-005",
    phone: "0900 000 005",
    email: "ncc.catda001@example.local",
    contactPerson: "Đỗ Quốc Việt",
    address: "Bến Bãi Phù Vân, Kim Bảng, Hà Nam",
  },
  {
    code: "NCC-GACH-001",
    name: "Công ty CP Gạch Xây Dựng Đông Đô",
    taxCode: "MST-TEST-006",
    phone: "0900 000 006",
    email: "ncc.gach001@example.local",
    contactPerson: "Bùi Thanh Sơn",
    address: "Xã Liên Hà, Đan Phượng, Hà Nội",
  },
  {
    code: "NCC-BETONG-001",
    name: "Công ty TNHH Bê Tông Thương Phẩm Hà An",
    taxCode: "MST-TEST-007",
    phone: "0900 000 007",
    email: "ncc.betong001@example.local",
    contactPerson: "Hoàng Đức Long",
    address: "Trạm trộn số 3, Gia Lâm, Hà Nội",
  },

  // ── B. Nhà cung cấp vật tư hoàn thiện ──
  {
    code: "NCC-SON-001",
    name: "Công ty TNHH Sơn và Vật Tư Hoàn Thiện Việt Phát",
    taxCode: "MST-TEST-008",
    phone: "0900 000 008",
    email: "ncc.son001@example.local",
    contactPerson: "Vũ Mạnh Cường",
    address: "Số 45 Nguyễn Trãi, Thanh Xuân, Hà Nội",
  },
  {
    code: "NCC-CHONGTHAM-001",
    name: "Công ty TNHH Chống Thấm Nam Á",
    taxCode: "MST-TEST-009",
    phone: "0900 000 009",
    email: "ncc.chongtham001@example.local",
    contactPerson: "Ngô Minh Quân",
    address: "KCN Tân Bình, TP. Hồ Chí Minh",
  },
  {
    code: "NCC-GACHOP-001",
    name: "Công ty CP Gạch Ốp Lát Minh Khang",
    taxCode: "MST-TEST-010",
    phone: "0900 000 010",
    email: "ncc.gachop001@example.local",
    contactPerson: "Trịnh Văn Hải",
    address: "KCN Mỹ Phước 3, Bến Cát, Bình Dương",
  },
  {
    code: "NCC-THACHCAO-001",
    name: "Công ty TNHH Trần Vách Thạch Cao Hưng Thịnh",
    taxCode: "MST-TEST-011",
    phone: "0900 000 011",
    email: "ncc.thachcao001@example.local",
    contactPerson: "Đinh Công Thắng",
    address: "Số 12 Lê Duẩn, Hoàn Kiếm, Hà Nội",
  },
  {
    code: "NCC-CUA-001",
    name: "Công ty CP Cửa và Phụ Kiện Xây Dựng An Gia",
    taxCode: "MST-TEST-012",
    phone: "0900 000 012",
    email: "ncc.cua001@example.local",
    contactPerson: "Lý Quốc Bảo",
    address: "KCN Bắc Thăng Long, Đông Anh, Hà Nội",
  },

  // ── C. Nhà cung cấp thiết bị, máy móc, an toàn ──
  {
    code: "NCC-GIANGIAO-001",
    name: "Công ty TNHH Giàn Giáo Cốp Pha Thành Công",
    taxCode: "MST-TEST-013",
    phone: "0900 000 013",
    email: "ncc.giangiao001@example.local",
    contactPerson: "Dương Văn Trung",
    address: "Xã Đại Mạch, Đông Anh, Hà Nội",
  },
  {
    code: "NCC-MAYTHICONG-001",
    name: "Công ty CP Thiết Bị Thi Công Bắc Hà",
    taxCode: "MST-TEST-014",
    phone: "0900 000 014",
    email: "ncc.maythicong001@example.local",
    contactPerson: "Phan Đình Phong",
    address: "KCN Bình Xuyên, Vĩnh Phúc",
  },
  {
    code: "NCC-BHLD-001",
    name: "Công ty TNHH Bảo Hộ Lao Động Việt Tín",
    taxCode: "MST-TEST-015",
    phone: "0900 000 015",
    email: "ncc.bhld001@example.local",
    contactPerson: "Tạ Quang Minh",
    address: "Số 78 Trường Chinh, Đống Đa, Hà Nội",
  },
  {
    code: "NCC-DIENNUOC-001",
    name: "Công ty TNHH Vật Tư Điện Nước Phú Minh",
    taxCode: "MST-TEST-016",
    phone: "0900 000 016",
    email: "ncc.diennuoc001@example.local",
    contactPerson: "Đặng Hữu Thành",
    address: "Chợ Giời, Hai Bà Trưng, Hà Nội",
  },
  {
    code: "NCC-PCCC-001",
    name: "Công ty CP Thiết Bị PCCC An Toàn Việt",
    taxCode: "MST-TEST-017",
    phone: "0900 000 017",
    email: "ncc.pccc001@example.local",
    contactPerson: "Lương Đức Hiếu",
    address: "Số 23 Ngọc Hồi, Thanh Trì, Hà Nội",
  },

  // ── D. Dịch vụ vận chuyển, kiểm định, xử lý ──
  {
    code: "DV-VANCHUYEN-001",
    name: "Công ty TNHH Vận Tải Công Trình Minh Đức",
    taxCode: "MST-TEST-018",
    phone: "0900 000 018",
    email: "dv.vanchuyen001@example.local",
    contactPerson: "Cao Xuân Trường",
    address: "Bãi xe Văn Điển, Thanh Trì, Hà Nội",
  },
  {
    code: "DV-CAUHA-001",
    name: "Công ty CP Cẩu Hạ và Logistics Đông Bắc",
    taxCode: "MST-TEST-019",
    phone: "0900 000 019",
    email: "dv.cauha001@example.local",
    contactPerson: "Mai Hồng Sơn",
    address: "KCN VSIP, Từ Sơn, Bắc Ninh",
  },
  {
    code: "DV-THINGHIEM-001",
    name: "Trung tâm Thí Nghiệm Vật Liệu Xây Dựng Sao Việt",
    taxCode: "MST-TEST-020",
    phone: "0900 000 020",
    email: "dv.thinghiem001@example.local",
    contactPerson: "Nguyễn Thị Hương",
    address: "Số 5 Phạm Hùng, Nam Từ Liêm, Hà Nội",
  },
  {
    code: "DV-PHETHAI-001",
    name: "Công ty TNHH Thu Gom Phế Thải Xây Dựng Xanh",
    taxCode: "MST-TEST-021",
    phone: "0900 000 021",
    email: "dv.phethai001@example.local",
    contactPerson: "Hà Văn Phúc",
    address: "Bãi tập kết Sóc Sơn, Hà Nội",
  },

  // ── E. Thầu phụ thi công ──
  {
    code: "TP-XAYTHO-001",
    name: "Công ty TNHH Thầu Phụ Xây Thô Hòa Bình",
    taxCode: "MST-TEST-022",
    phone: "0900 000 022",
    email: "tp.xaytho001@example.local",
    contactPerson: "Trần Quốc Đạt",
    address: "Thị trấn Lương Sơn, Hòa Bình",
  },
  {
    code: "TP-COPPHA-001",
    name: "Đội Thi Công Cốp Pha Cốt Thép Nam Sơn",
    taxCode: "MST-TEST-023",
    phone: "0900 000 023",
    email: "tp.coppha001@example.local",
    contactPerson: "Phạm Hữu Lộc",
    address: "Xã Thanh Liệt, Thanh Trì, Hà Nội",
  },
  {
    code: "TP-MEP-001",
    name: "Công ty TNHH Cơ Điện Công Trình Tân Phát",
    taxCode: "MST-TEST-024",
    phone: "0900 000 024",
    email: "tp.mep001@example.local",
    contactPerson: "Vương Đình Khôi",
    address: "KCN Ngọc Hồi, Thanh Trì, Hà Nội",
  },
  {
    code: "TP-PCCC-001",
    name: "Công ty CP Thi Công PCCC Đại An",
    taxCode: "MST-TEST-025",
    phone: "0900 000 025",
    email: "tp.pccc001@example.local",
    contactPerson: "Lê Đình Khánh",
    address: "Số 88 Giải Phóng, Hai Bà Trưng, Hà Nội",
  },
  {
    code: "TP-NHOMKINH-001",
    name: "Công ty TNHH Nhôm Kính Mặt Dựng Á Đông",
    taxCode: "MST-TEST-026",
    phone: "0900 000 026",
    email: "tp.nhomkinh001@example.local",
    contactPerson: "Đoàn Thanh Bình",
    address: "KCN Tiên Sơn, Từ Sơn, Bắc Ninh",
  },
  {
    code: "TP-SONBA-001",
    name: "Đội Sơn Bả Hoàn Thiện Minh Tâm",
    taxCode: "MST-TEST-027",
    phone: "0900 000 027",
    email: "tp.sonba001@example.local",
    contactPerson: "Nguyễn Trung Kiên",
    address: "Xã Dương Nội, Hà Đông, Hà Nội",
  },
  {
    code: "TP-DIENLANH-001",
    name: "Công ty TNHH Điều Hòa Thông Gió An Khang",
    taxCode: "MST-TEST-028",
    phone: "0900 000 028",
    email: "tp.dienlanh001@example.local",
    contactPerson: "Trương Quốc Huy",
    address: "KCN Nhơn Trạch, Đồng Nai",
  },
  {
    code: "TP-CANHQUAN-001",
    name: "Công ty TNHH Cảnh Quan và Hạ Tầng Xanh Việt",
    taxCode: "MST-TEST-029",
    phone: "0900 000 029",
    email: "tp.canhquan001@example.local",
    contactPerson: "Hồ Sỹ Đức",
    address: "Xã Xuân Phương, Nam Từ Liêm, Hà Nội",
  },
  {
    code: "TP-VESINH-001",
    name: "Công ty TNHH Vệ Sinh Công Nghiệp Sau Xây Dựng Hưng Phát",
    taxCode: "MST-TEST-030",
    phone: "0900 000 030",
    email: "tp.vesinh001@example.local",
    contactPerson: "Chu Mạnh Hà",
    address: "Số 15 Tô Hiệu, Cầu Giấy, Hà Nội",
  },
];

async function seed() {
  console.log("\n==============================");
  console.log("Seed: Dữ liệu mẫu Suppliers");
  console.log("==============================\n");

  let created = 0;
  let updated = 0;
  let restored = 0;

  for (const data of SUPPLIERS) {
    const existing = await prisma.supplier.findUnique({
      where: { code: data.code },
      select: { id: true, deletedAt: true },
    });

    if (!existing) {
      await prisma.supplier.create({ data });
      created++;
      console.log(`  [+] Tạo mới: ${data.code} - ${data.name}`);
    } else {
      const updateData: Record<string, unknown> = {
        name: data.name,
        taxCode: data.taxCode,
        phone: data.phone,
        email: data.email,
        contactPerson: data.contactPerson,
        address: data.address,
      };

      if (existing.deletedAt !== null) {
        updateData.deletedAt = null;
        restored++;
        console.log(`  [↻] Khôi phục: ${data.code} - ${data.name}`);
      } else {
        updated++;
        console.log(`  [~] Cập nhật: ${data.code} - ${data.name}`);
      }

      await prisma.supplier.update({
        where: { code: data.code },
        data: updateData,
      });
    }
  }

  console.log("\n------------------------------");
  console.log(`  Tổng dòng seed: ${SUPPLIERS.length}`);
  console.log(`  Tạo mới:       ${created}`);
  console.log(`  Cập nhật:       ${updated}`);
  console.log(`  Khôi phục:      ${restored}`);
  console.log("------------------------------\n");

  // Verify
  const total = await prisma.supplier.count({ where: { deletedAt: null } });
  console.log(`Tổng supplier trong DB (active): ${total}`);

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error("Seed thất bại:", e);
  process.exit(1);
});
