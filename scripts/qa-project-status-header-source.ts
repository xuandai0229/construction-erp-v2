import { getGlobalProjectContext } from "../src/lib/project-context";
import { getProjectStatusMeta } from "../src/lib/project-status";

async function main() {
  console.log("=== Bắt đầu test Project Status Header Source ===");
  
  // Note: we just test the mapping function getProjectStatusMeta which is used by getGlobalProjectContext
  const statuses = [
    { input: "ACTIVE", expected: "Đang thi công" },
    { input: "PLANNING", expected: "Công tác chuẩn bị" },
    { input: "COMPLETED", expected: "Hoàn thành" },
    { input: "ON_HOLD", expected: "Tạm dừng" },
    { input: null, expected: "Chưa xác định" },
    { input: "UNKNOWN", expected: "Chưa xác định" },
  ];

  let failed = 0;
  for (const s of statuses) {
    const meta = getProjectStatusMeta(s.input as string);
    if (meta.label !== s.expected) {
      console.error(`❌ Lỗi: Status "${s.input}" => mong đợi "${s.expected}", kết quả "${meta.label}"`);
      failed++;
    } else {
      console.log(`✅ OK: Status "${s.input}" => "${meta.label}"`);
    }
  }

  if (failed > 0) {
    console.error(`\n❌ Thất bại ${failed} test cases.`);
    process.exit(1);
  } else {
    console.log(`\n✅ Tất cả test passed.`);
  }
}

main().catch(console.error);
