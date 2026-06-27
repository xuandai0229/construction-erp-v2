import { validateSafePath, sanitizeFileName } from "../src/lib/storage/local-storage-provider";

console.log("=== KIỂM TRA BẢO MẬT ĐƯỜNG DẪN STORAGE (UNIT TEST) ===");

// 1. Sanitize Path Traversal
const maliciousName1 = "../../secret.pdf";
const sanitized1 = sanitizeFileName(maliciousName1);
console.log(`\n[Sanitize FileName] '${maliciousName1}' -> '${sanitized1}'`);
if (sanitized1.includes("/") || sanitized1.includes("\\")) {
  console.log("=> FAIL: Vẫn còn ký tự path traversal!");
} else {
  console.log("=> PASS: Đã làm sạch ký tự độc hại.");
}

// 2. Validate Safe Path (Path Traversal attempt)
const maliciousPath1 = "../abc";
const isValid1 = validateSafePath(maliciousPath1);
console.log(`\n[Validate SafePath] Kiểm tra '${maliciousPath1}'`);
if (isValid1) {
  console.log("=> FAIL: Đáng lẽ phải block!");
} else {
  console.log("=> PASS: Bị block chính xác.");
}

// 3. Validate Safe Path (Absolute path attempt)
const maliciousPath2 = "/etc/passwd";
const isValid2 = validateSafePath(maliciousPath2);
console.log(`\n[Validate SafePath] Kiểm tra '${maliciousPath2}'`);
if (isValid2) {
  console.log("=> FAIL: Đáng lẽ phải block!");
} else {
  console.log("=> PASS: Bị block chính xác.");
}

// 4. Validate Safe Path (Null byte attempt)
const maliciousPath3 = "test\0.pdf";
const isValid3 = validateSafePath(maliciousPath3);
console.log(`\n[Validate SafePath] Kiểm tra '${maliciousPath3}'`);
if (isValid3) {
  console.log("=> FAIL: Đáng lẽ phải block!");
} else {
  console.log("=> PASS: Bị block chính xác.");
}

console.log("\n=> Các bài test bảo mật Storage hoàn tất.");
