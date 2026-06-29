import fs from "fs";
import path from "path";

const projectRoot = path.join(__dirname, "..");
const registryFile = path.join(projectRoot, "src/lib/settings/settings-registry.ts");
const actionsFile = path.join(projectRoot, "src/app/(dashboard)/settings/actions.ts");

console.log("--- BẮT ĐẦU KIỂM TRA STATIC SETTINGS ---");

let hasError = false;

if (!fs.existsSync(registryFile)) {
  console.log("[FAIL] Không tìm thấy settings-registry.ts");
  hasError = true;
} else {
  const content = fs.readFileSync(registryFile, "utf-8");
  if (!content.includes("editable") || !content.includes("implemented")) {
    console.log("[FAIL] Registry metadata thiếu editable/implemented");
    hasError = true;
  } else {
    console.log("[OK] Đã tìm thấy Registry và đủ metadata");
  }
}

if (!fs.existsSync(actionsFile)) {
  console.log("[FAIL] Không tìm thấy actions.ts");
  hasError = true;
} else {
  const content = fs.readFileSync(actionsFile, "utf-8");
  if (!content.includes("SETTINGS_REGISTRY.find")) {
    console.log("[FAIL] actions.ts không check registry");
    hasError = true;
  } else {
    console.log("[OK] actions.ts có validate registry");
  }

  if (!content.includes("auditLog.create")) {
    console.log("[FAIL] Thiếu ghi log audit khi update settings");
    hasError = true;
  } else {
    console.log("[OK] Có ghi Audit Log khi đổi cài đặt");
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log("--- HOÀN TẤT KIỂM TRA STATIC ---");
}
