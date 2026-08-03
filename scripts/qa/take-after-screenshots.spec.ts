import { test } from "@playwright/test";

const viewports = [
  { width: 1920, height: 1080, name: "1920x1080" },
  { width: 1536, height: 864, name: "1536x864" },
  { width: 1366, height: 768, name: "1366x768" },
  { width: 1024, height: 768, name: "1024x768" },
  { width: 390, height: 844, name: "390x844" },
];

test("Take full viewport after-fix screenshots", async ({ page }) => {
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:3000/reports/weekly-inspection", { waitUntil: "networkidle" });
    await page.screenshot({
      path: `C:/Users/admin/.gemini/antigravity/brain/0dbf49d4-0752-45d9-a912-f1c31cea75a0/after_fix_${vp.name}.png`,
      fullPage: false,
    });
  }
});
