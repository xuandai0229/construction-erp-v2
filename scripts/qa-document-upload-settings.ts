import { validateDocumentUploadPolicy } from "../src/lib/documents/validation";

function assertResult(testName: string, actual: boolean, expected: boolean) {
  if (actual === expected) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName} - Expected ${expected}, got ${actual}`);
    process.exit(1);
  }
}

async function run() {
  console.log("--- BẮT ĐẦU QA SCRIPT (PURE SERVER LOGIC) ---");

  const settings = {
    allowedExtensions: "pdf, jpg, png",
    enforceNamingConvention: true,
  };


  console.log("\n2. Kiểm tra File Extension Limit (pdf, jpg, png):");
  // File .exe -> Must fail
  let res = validateDocumentUploadPolicy({ name: "good_name.exe", size: 500 * 1024 }, settings);
  assertResult("Chặn file .exe", res.valid, false);

  // File .jpg -> Must pass
  res = validateDocumentUploadPolicy({ name: "good_name.jpg", size: 500 * 1024 }, settings);
  assertResult("Cho phép file .jpg", res.valid, true);

  // File .vbs (Danger) -> Must fail
  res = validateDocumentUploadPolicy({ name: "good_name.vbs", size: 500 * 1024 }, settings);
  assertResult("Chặn file nguy hiểm .vbs", res.valid, false);


  console.log("\n3. Kiểm tra Naming Convention:");
  // Name too short -> Must fail
  res = validateDocumentUploadPolicy({ name: "ab.pdf", size: 500 * 1024 }, settings);
  assertResult("Chặn tên file quá ngắn (ab.pdf)", res.valid, false);

  // Generic name -> Must fail
  res = validateDocumentUploadPolicy({ name: "camera_001.jpg", size: 500 * 1024 }, settings);
  assertResult("Chặn tên file chung chung (camera_001.jpg)", res.valid, false);

  // Name with traversal -> Must fail
  res = validateDocumentUploadPolicy({ name: "../hack.pdf", size: 500 * 1024 }, settings);
  assertResult("Chặn path traversal (../hack.pdf)", res.valid, false);

  // Good name -> Must pass
  res = validateDocumentUploadPolicy({ name: "ban_ve_thi_cong_tang_1.pdf", size: 500 * 1024 }, settings);
  assertResult("Cho phép tên file chuẩn (ban_ve_thi_cong_tang_1.pdf)", res.valid, true);

  console.log("\n--- HOÀN TẤT QA SCRIPT - TẤT CẢ ĐỀU PASS ---");
}

run().catch(console.error);
