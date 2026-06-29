import fs from "fs";
import path from "path";

const projectRoot = path.join(__dirname, "..");
const actionsFile = path.join(projectRoot, "src/app/(dashboard)/settings/actions.ts");

console.log("--- BẮT ĐẦU KIỂM TRA RBAC ---");

let hasError = false;

if (fs.existsSync(actionsFile)) {
  const content = fs.readFileSync(actionsFile, "utf-8");
  if (!content.includes("canManageUsers(session)")) {
    console.log("[FAIL] updateSystemSettings không check quyền cơ bản");
    hasError = true;
  }
  
  if (!content.includes("checkUpdatePermission")) {
    console.log("[FAIL] Thiếu checkUpdatePermission cho từng field theo role");
    hasError = true;
  } else if (!content.includes('role === "DIRECTOR"') || !content.includes('def.category !== "company"')) {
    console.log("[FAIL] DIRECTOR không bị giới hạn edit company");
    hasError = true;
  } else {
    console.log("[OK] Có category-level RBAC (DIRECTOR giới hạn nhóm company)");
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log("--- HOÀN TẤT KIỂM TRA RBAC ---");
}
