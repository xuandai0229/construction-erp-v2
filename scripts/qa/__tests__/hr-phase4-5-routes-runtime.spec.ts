import { test, expect } from "@playwright/test";

test.describe("HR Phase 4.5.2 — Routes Runtime & Navigation Integrity Suite", () => {
  test("Verify HTTP 200 status, final URL, and zero console/page errors across all 8 HR routes", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err));
    page.on("requestfailed", (req) => failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`));

    const routes = [
      { path: "/hr", expectedTitle: "Tổng quan nhân sự" },
      { path: "/hr/employees", expectedTitle: "Hồ sơ nhân viên" },
      { path: "/hr/organization", expectedTitle: "Cơ cấu tổ chức" },
      { path: "/hr/organization/positions", expectedTitle: "Danh mục chức danh" },
      { path: "/hr/organization/managers", expectedTitle: "Người quản lý đơn vị" },
      { path: "/hr/organization/chart", expectedTitle: "Sơ đồ cây tổ chức" },
      { path: "/hr/project-assignments", expectedTitle: "Quản lý điều động nhân sự công trình" },
      { path: "/hr/reports", expectedTitle: "Báo cáo và phân tích nhân sự" },
    ];

    for (const route of routes) {
      const response = await page.goto(route.path);
      expect(response).not.toBeNull();
      expect(response?.status()).toBe(200);

      // Verify final URL matches without redirect loops
      expect(page.url()).toContain(route.path);

      await page.waitForLoadState("networkidle");

      // Verify page heading
      const heading = page.locator("h1").first();
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(route.expectedTitle);
    }

    const criticalConsole = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("hydration") && !e.includes("ReactDevTools")
    );
    expect(criticalConsole).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
    expect(failedRequests).toHaveLength(0);
  });
});
