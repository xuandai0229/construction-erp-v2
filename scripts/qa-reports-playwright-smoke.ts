import { chromium } from "playwright";
import "dotenv/config";
import assert from "assert";

async function main() {
  const password = process.env.SEED_DEV_ADMIN_PASSWORD || process.env.SEED_DEV_TEST_PASSWORD;
  if (!password) {
    throw new Error("Missing SEED_DEV_ADMIN_PASSWORD or SEED_DEV_TEST_PASSWORD for Playwright smoke login.");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  try {
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', "admin@construction.local");
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");
    assert(!page.url().includes("/login"), "Login should leave the login page");

    await page.goto("http://localhost:3000/reports", { waitUntil: "networkidle" });
    await page.getByText(/Bao cao hien truong|Báo cáo hiện trường/i).first().waitFor({ timeout: 15000 });

    await page.getByRole("button", { name: /Tao bao cao moi|Tạo báo cáo mới/i }).first().click();
    await page.getByRole("dialog").waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: /Bao cao ngay|Báo cáo ngày/i }).waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: /Bao cao tuan|Báo cáo tuần/i }).click();
    await page.getByText(/Tuan bao cao|Tuần báo cáo/i).first().waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: /Bao cao ngay|Báo cáo ngày/i }).click();
    await page.getByText(/Khoi luong thuc hien hom nay|Khối lượng thực hiện hôm nay/i).first().waitFor({ timeout: 10000 });

    console.log("REPORTS_PLAYWRIGHT_SMOKE: passed");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("REPORTS_PLAYWRIGHT_SMOKE: failed", error);
  process.exit(1);
});
