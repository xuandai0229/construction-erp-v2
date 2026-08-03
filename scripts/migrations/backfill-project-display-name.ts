import "dotenv/config";
import prisma from "../../src/lib/prisma";

export const PROPOSED_DISPLAY_NAMES: Record<string, { displayName: string; reason: string }> = {
  "CT-2026-0001": {
    displayName: "Bảo trì hạ tầng giao thông Thanh Xuân 2026–2030",
    reason: "Loại CV: Bảo trì hạ tầng GT + Địa điểm: Thanh Xuân + Giai đoạn: 2026-2030",
  },
  "CT-2026-0002": {
    displayName: "Quảng trường – công viên phía Đông hồ Hoàn Kiếm (Giai đoạn 1)",
    reason: "Tên ngắn gọn + Địa điểm: Hoàn Kiếm + Mốc: Phân kỳ 1",
  },
  "CT-2026-0003": {
    displayName: "Xây dựng trường THCS Lệ Chi",
    reason: "Loại CV: Xây dựng + Hạng mục: THCS Lệ Chi",
  },
  "CT-2026-0004": {
    displayName: "Xây dựng trường Mầm non Kim Sơn",
    reason: "Loại CV: Xây dựng + Hạng mục: MN Kim Sơn",
  },
  "CT-2026-0005": {
    displayName: "Xây dựng trường Mầm non Hoa Hồng — Yên Thường",
    reason: "Loại CV: Xây dựng + Hạng mục: MN Hoa Hồng + Khu vực: Yên Thường",
  },
  "CT-2026-0006": {
    displayName: "Hoàn thiện và thiết bị trường Mầm non Minh Khai",
    reason: "Loại CV: Hoàn thiện & thiết bị + Hạng mục: MN Minh Khai",
  },
  "CT-2026-0007": {
    displayName: "Cải tạo và thiết bị 15 trường học phường Tây Hồ",
    reason: "Loại CV: Cải tạo & thiết bị + Địa điểm: Tây Hồ + Quy mô: 15 trường",
  },
  "CT-2026-0008": {
    displayName: "Cải tạo và thiết bị 13 trường học phường Tây Hồ",
    reason: "Loại CV: Cải tạo & thiết bị + Địa điểm: Tây Hồ + Quy mô: 13 trường",
  },
  "CT-2026-0009": {
    displayName: "Trung tâm giao dịch công nghệ Võ Chí Công",
    reason: "Tên công trình + Địa điểm: Võ Chí Công",
  },
  "CT-2026-0010": {
    displayName: "Sửa chữa cống hộp thoát nước đường Nguyễn Chí Thanh",
    reason: "Loại CV: Sửa chữa cống hộp + Địa điểm: Nguyễn Chí Thanh",
  },
  "CT-2026-0011": {
    displayName: "Cải tạo đường và thoát nước phường Vĩnh Tuy",
    reason: "Loại CV: Cải tạo ĐNN & thoát nước + Địa điểm: Phường Vĩnh Tuy",
  },
  "CT-2026-0012": {
    displayName: "Cải tạo trường Mầm non 20–10 Hoàn Kiếm",
    reason: "Loại CV: Cải tạo + Hạng mục: MN 20-10 + Địa điểm: Hoàn Kiếm",
  },
  "CT-2026-0013": {
    displayName: "Cải tạo đường và thoát nước phường Láng",
    reason: "Loại CV: Cải tạo đường & thoát nước + Địa điểm: Phường Láng",
  },
  "CT-2026-0014": {
    displayName: "Tuyến đường Lạc Long Quân — Nhật Chiêu & cấp nước Hồ Tây",
    reason: "Hạng mục: Tuyến đường LLQ-Nhật Chiêu + Tuyến ống Hồ Tây",
  },
  "CT-2026-0015": {
    displayName: "Bảo trì hạ tầng giao thông Xuân Phương 2026–2028",
    reason: "Loại CV: Bảo trì hạ tầng GT + Địa điểm: Xuân Phương + Thời gian: 2026-2028",
  },
  "CT-2026-0016": {
    displayName: "Chỉnh trang hè phố Trần Nhân Tông & Cổng CV Thống Nhất",
    reason: "Loại CV: Chỉnh trang hè + Địa điểm: Trần Nhân Tông & Thống Nhất",
  },
  "CT-2026-0017": {
    displayName: "Cải tạo hạ tầng KĐT Trung Văn — 2HN",
    reason: "Loại CV: Cải tạo hạ tầng KĐT Trung Văn + Đơn vị: cty 2HN (10,525 tỷ)",
  },
  "CT-2026-0018": {
    displayName: "Cải tạo hạ tầng KĐT Trung Văn — PTN",
    reason: "Loại CV: Cải tạo hạ tầng KĐT Trung Văn + Đơn vị: PTN (3,879 tỷ)",
  },
  "CT-2026-0019": {
    displayName: "Duy tu công viên hồ Phùng Khoang 2026–2028",
    reason: "Loại CV: Duy tu CV hồ Phùng Khoang + Giai đoạn: 2026-2028",
  },
  "CT-2026-0020": {
    displayName: "Duy tu hạ tầng giao thông phường Đại Mỗ 2026",
    reason: "Loại CV: Duy tu hạ tầng GT + Địa điểm: Đại Mỗ + Năm: 2026",
  },
  "CT-2026-0021": {
    displayName: "Duy tu hè phố Dương Văn Bé",
    reason: "Loại CV: Duy tu hè + Địa điểm: Dương Văn Bé",
  },
};

async function main() {
  const isApply = process.argv.includes("--apply");
  const projects = await prisma.project.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      displayName: true,
      location: true,
      investor: true,
    },
  });

  const displayMap = new Map<string, string[]>();

  // Check conflicts first
  const rows = projects.map((p) => {
    const proposal = PROPOSED_DISPLAY_NAMES[p.code];
    const targetName = proposal?.displayName || p.displayName || p.name;
    const existing = displayMap.get(targetName) || [];
    existing.push(p.code);
    displayMap.set(targetName, existing);
    return {
      project: p,
      targetName,
      reason: proposal?.reason || "Giữ nguyên tên hiện tại",
    };
  });

  const conflicts = new Set<string>();
  for (const [name, codes] of displayMap.entries()) {
    if (codes.length > 1) {
      codes.forEach((c) => conflicts.add(c));
    }
  }

  console.log("\n==================================================");
  console.log(`MODE: ${isApply ? "APPLY (GHI VÀO DATABASE)" : "DRY-RUN (CHỈ XUẤT BẢNG KIỂM TRA)"}`);
  console.log("==================================================\n");

  console.log("| Code | Tên pháp lý | Tên hiển thị đề xuất | Dữ liệu dùng để rút gọn | Xung đột |");
  console.log("| --- | --- | --- | --- | --- |");

  for (const r of rows) {
    const hasConflict = conflicts.has(r.project.code);
    const legalTrunc = r.project.name.length > 40 ? r.project.name.slice(0, 37) + "..." : r.project.name;
    console.log(`| ${r.project.code} | ${legalTrunc} | ${r.targetName} | ${r.reason} | ${hasConflict ? "CÓ XUNG ĐỘT" : "Không"} |`);
  }

  if (conflicts.size > 0) {
    console.error(`\n[LỖI]: Có ${conflicts.size} project bị trùng tên hiển thị! Không thể apply.`);
    process.exit(1);
  }

  if (!isApply) {
    console.log("\n[DRY-RUN]: Hoàn tất kiểm tra 21 project. Không có xung đột. Hãy chạy với --apply để ghi vào database.");
    return;
  }

  console.log("\n[APPLY]: Bắt đầu cập nhật database...");
  for (const r of rows) {
    await prisma.project.update({
      where: { id: r.project.id },
      data: { displayName: r.targetName },
    });
  }

  console.log(`[SUCCESS]: Đã cập nhật thành công ${rows.length}/${projects.length} project display names!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
