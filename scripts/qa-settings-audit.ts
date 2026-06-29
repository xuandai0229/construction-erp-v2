import prisma from "../src/lib/prisma";
import { DEFAULT_SYSTEM_SETTINGS } from "../src/lib/settings/settings-validation";

async function runAudit() {
  console.log("--- BẮT ĐẦU KIỂM TRA DỮ LIỆU SETTINGS ---");

  try {
    const settings = await prisma.systemSetting.findMany();
    console.log(`[OK] Tổng số record cài đặt trong DB: ${settings.length}`);

    if (settings.length === 0) {
      console.log("[INFO] Chưa có record nào trong DB. Sẽ dùng default nếu gọi qua helper.");
    } else {
      const setting = settings[0];
      let hasError = false;
      
      // Check invalid values based on DEFAULT
      for (const [key, defaultVal] of Object.entries(DEFAULT_SYSTEM_SETTINGS)) {
        const val = (setting as any)[key];
        if (val === undefined || val === null) {
          console.log(`[WARN] Setting key '${key}' có giá trị null/undefined trong DB.`);
        } else if (typeof val !== typeof defaultVal && key !== "contractValueThreshold") {
          console.log(`[WARN] Setting key '${key}' sai kiểu dữ liệu. DB: ${typeof val}, Default: ${typeof defaultVal}`);
        }
      }

      if (settings.length > 1) {
        console.log(`[WARN] Có ${settings.length} records. Chỉ nên có 1 record.`);
        hasError = true;
      }
      
      if (!hasError) {
        console.log("[OK] Tính toàn vẹn của record cấu hình đảm bảo.");
      }
    }
    console.log("--- HOÀN TẤT KIỂM TRA DỮ LIỆU ---");
  } catch (error: any) {
    console.error("[FAIL] Lỗi khi audit settings:", error.message);
    process.exit(1);
  }
}

runAudit();
