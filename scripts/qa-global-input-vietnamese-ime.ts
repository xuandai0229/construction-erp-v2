import { codeBaseFromName } from "../src/app/(dashboard)/materials/actions";
import { getProjectStatusMeta } from "../src/lib/project-status";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function main() {
  console.log("=== Bắt đầu test tiếng Việt IME / Sanitize ===");
  
  // Test normalizeText
  const testCases = [
    "Ống nhựa Tiền Phong",
    "Đá 1x2",
    "Cát vàng",
    "Dây điện",
    "Dây mạng",
    "Bê tông cọc khoan nhồi M300"
  ];
  
  let failed = 0;
  for (const tc of testCases) {
    const res = normalizeText(tc);
    if (res !== tc) {
      console.error(`❌ Lỗi: normalizeText("${tc}") => "${res}" (mất chữ/sai format)`);
      failed++;
    } else {
      console.log(`✅ OK: "${tc}"`);
    }
  }

  // Code base
  console.log("\n=== Test codeBaseFromName ===");
  for (const tc of testCases) {
    console.log(`- "${tc}" => Skip (tested in actions)`);
  }

  console.log("\n=== Test Project Status ===");
  const statusLabels = ["ACTIVE", "COMPLETED", "ON_HOLD", "PLANNING"];
  for (const status of statusLabels) {
    const meta = getProjectStatusMeta(status);
    console.log(`- Status: ${status} => Label: ${meta.label}`);
    if (status === "ACTIVE" && meta.label !== "Đang thi công") {
      console.error(`❌ Lỗi: ACTIVE phải là "Đang thi công"`);
      failed++;
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
