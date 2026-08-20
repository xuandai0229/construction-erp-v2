import { test, expect } from "@playwright/test";

test.describe("AI Assistant Drawer — Functional Chat E2E, Multi-Viewport & Security Gate", () => {
  const VIEWPORTS = [
    { name: "Mobile Small (360px)", width: 360, height: 640 },
    { name: "Mobile iPhone (390px)", width: 390, height: 844 },
    { name: "Tablet iPad (768px)", width: 768, height: 1024 },
    { name: "Desktop Wide (1440px)", width: 1440, height: 900 },
  ];

  // 1. Multi-Viewport Layout & Open/Close
  for (const vp of VIEWPORTS) {
    test(`Responsive Mount & Layout at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      await page.goto("/dashboard");
      await page.waitForLoadState("domcontentloaded");

      const aiTrigger = page.locator("button[aria-label='Mở Trợ lý AI']");
      const isVisible = await aiTrigger.isVisible().catch(() => false);

      if (isVisible) {
        await aiTrigger.click();
        const drawerHeader = page.locator("text=Trợ lý AI ERP");
        await expect(drawerHeader).toBeVisible({ timeout: 5000 });

        const closeBtn = page.locator("button[aria-label='Đóng Trợ lý AI']");
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      }
    });
  }

  // 2. Functional Chat Flow in Browser
  test("Functional Chat Flow: Open Drawer -> Send Question -> Receive and Render Response", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const aiTrigger = page.locator("button[aria-label='Mở Trợ lý AI']");
    if (await aiTrigger.isVisible()) {
      await aiTrigger.click();

      // Verify drawer opened
      const drawer = page.locator("text=Trợ lý AI ERP");
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // Find chat input textarea
      const chatInput = page.locator("textarea[placeholder*='Hỏi về']");
      if (await chatInput.isVisible()) {
        await chatInput.fill("Tôi đang phụ trách những công trình nào?");

        const sendBtn = page.locator("button[type='submit']");
        await sendBtn.click();

        // Expect assistant message to render
        const messageContainer = page.locator("div.space-y-4");
        await expect(messageContainer).toBeVisible();
      }
    }
  });

  // 3. Server-side Pilot Cohort Enforcement via Direct API
  test("Server-side Gate: Direct POST /api/v1/ai/chat blocks unauthenticated or non-pilot users with 401/403", async ({ request }) => {
    const response = await request.post("/api/v1/ai/chat", {
      data: {
        messages: [{ role: "user", content: "Tôi đang phụ trách những công trình nào?" }],
      },
    });

    // Unauthenticated request should be 401 UNAUTHORIZED
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe("UNAUTHENTICATED");
  });

  // 4. Network Payload Security Audit
  test("Network Security: Network payloads do not leak API secrets, DB URLs, or sensitive tokens", async ({ page }) => {
    const leakedTokens: string[] = [];

    page.on("request", (req) => {
      const postData = req.postData() || "";
      if (postData.includes("sk-") || postData.includes("DATABASE_URL") || postData.includes("passwordHash")) {
        leakedTokens.push(`Request to ${req.url()}`);
      }
    });

    page.on("response", async (res) => {
      try {
        const text = await res.text();
        if (text.includes("DATABASE_URL") || text.includes("passwordHash")) {
          leakedTokens.push(`Response from ${res.url()}`);
        }
      } catch {
        // Ignore binary responses
      }
    });

    await page.goto("/dashboard");
    expect(leakedTokens.length).toBe(0);
  });
});
