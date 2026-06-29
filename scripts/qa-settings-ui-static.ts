import fs from "fs";
import path from "path";

const projectRoot = path.join(__dirname, "..");
const workspaceFile = path.join(projectRoot, "src/components/settings/settings-workspace.tsx");

console.log("--- BẮT ĐẦU KIỂM TRA UI STATIC ---");

let hasError = false;

if (fs.existsSync(workspaceFile)) {
  const content = fs.readFileSync(workspaceFile, "utf-8");
  
  if (!content.includes("disabled={true}")) {
    console.log("[FAIL] Thiếu UI lock cho unimplemented settings (disabled)");
    hasError = true;
  } else {
    console.log("[OK] Có state disabled cho các field không editable");
  }

  if (!content.includes('badge="Chưa kích hoạt"') && !content.includes('badge="Chỉ hiển thị"')) {
    console.log("[FAIL] Thiếu badge đánh dấu unimplemented");
    hasError = true;
  } else {
    console.log("[OK] Có hiển thị badge Chưa kích hoạt/Chỉ hiển thị");
  }

  if (content.includes("unlimited") || content.includes("Không giới hạn tuyệt đối")) {
     console.log("[FAIL] UI có từ khóa unlimited giả dối");
     hasError = true;
  } else {
     console.log("[OK] UI không nói sai về upload limit");
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log("--- HOÀN TẤT KIỂM TRA UI STATIC ---");
}
