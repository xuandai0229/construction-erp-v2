import { test, expect } from "@playwright/test";

const viewports = [
  { width: 1920, height: 1080, name: "1920x1080 Desktop Large" },
  { width: 1600, height: 900, name: "1600x900 Desktop Medium" },
  { width: 1536, height: 864, name: "1536x864 Laptop Standard" },
  { width: 1440, height: 900, name: "1440x900 MacBook" },
  { width: 1366, height: 768, name: "1366x768 Common Laptop" },
  { width: 1024, height: 768, name: "1024x768 Tablet Landscape" },
  { width: 768, height: 1024, name: "768x1024 Tablet Portrait" },
  { width: 390, height: 844, name: "390x844 Mobile iPhone" },
];

test.describe("Weekly Inspection - Viewport Overflow & Action Menu Regression", () => {
  for (const vp of viewports) {
    test(`No horizontal overflow on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:3000/reports/weekly-inspection", { waitUntil: "networkidle" });

      // Measure layout metrics
      const layoutMetrics = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        return { clientWidth, scrollWidth, bodyScrollWidth };
      });

      console.log(`[${vp.name}] clientWidth: ${layoutMetrics.clientWidth}, scrollWidth: ${layoutMetrics.scrollWidth}`);

      expect(layoutMetrics.scrollWidth).toBeLessThanOrEqual(layoutMetrics.clientWidth + 1);
      expect(layoutMetrics.bodyScrollWidth).toBeLessThanOrEqual(layoutMetrics.clientWidth + 1);
    });
  }

  test("ADMIN can open Create Dossier modal without raw Prisma errors", async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 864 });
    await page.goto("http://localhost:3000/reports/weekly-inspection", { waitUntil: "networkidle" });

    // Ensure page text does not contain raw Prisma errors
    const content = await page.textContent("body");
    expect(content).not.toContain("PrismaClientKnownRequestError");
    expect(content).not.toContain("Unique constraint failed");

    // Click 'Tạo hồ sơ tuần mới' button if visible
    const createBtn = page.locator("button", { hasText: "Tạo hồ sơ tuần mới" });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await expect(page.locator("text=Tạo hồ sơ kiểm tra tuần")).toBeVisible();

      // Check modal does not show Prisma error
      const modalContent = await page.textContent("body");
      expect(modalContent).not.toContain("PrismaClientKnownRequestError");
    }
  });
});
