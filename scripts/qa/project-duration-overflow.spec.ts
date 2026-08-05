import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const viewports = [
  { width: 1920, height: 1080, name: "desktop-1920" },
  { width: 1600, height: 900, name: "desktop-1600" },
  { width: 1440, height: 900, name: "desktop-1440" },
  { width: 1366, height: 768, name: "desktop-1366" },
  { width: 1280, height: 800, name: "desktop-1280" },
  { width: 1024, height: 768, name: "tablet-1024" },
  { width: 768, height: 1024, name: "tablet-768" },
  { width: 430, height: 932, name: "mobile-430" },
  { width: 390, height: 844, name: "mobile-390" },
  { width: 360, height: 800, name: "mobile-360" },
];

const artifacts = "artifacts/project-duration-overflow";
fs.mkdirSync(artifacts, { recursive: true });

async function login(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill("phamanhtuan@gmail.com");
  await page.locator("#password").fill("123456");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/projects(?:\?|$)/);
}

async function assertNoHorizontalOverflow(page: Page) {
  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(result.scrollWidth, `Unexpected page overflow: ${JSON.stringify(result)}`).toBeLessThanOrEqual(result.clientWidth + 1);
}

async function expectVisibleText(page: Page, text: string | RegExp) {
  const visibleCount = await page.getByText(text).evaluateAll((nodes) => nodes.filter((node) => {
    const element = node as HTMLElement;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
  }).length);
  expect(visibleCount, `Expected visible text: ${String(text)}`).toBeGreaterThan(0);
}

async function assertDisclosure(page: Page) {
  const trigger = page.locator('[data-full-text-trigger="true"]:visible').first();
  await expect(trigger, "A long business value must have an explicit disclosure trigger").toHaveCount(1);
  const value = (await trigger.getAttribute("aria-label")) || "";
  await trigger.focus();
  const dialog = page.locator('[role="dialog"]').filter({ hasText: "Nội dung đầy đủ" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(value.slice(0, Math.min(value.length, 18)));
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

for (const viewport of viewports) {
  test(`projects, documents and selector ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await login(page);
    await page.goto("/projects", { waitUntil: "networkidle" });
    await expectVisibleText(page, "Đang thi công");
    await expectVisibleText(page, /\b(150|120|90|12)\s+(ngày|tháng)\b/i);
    await assertDisclosure(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${artifacts}/${viewport.name}-projects.png`, fullPage: true });

    const desktopRows = page.locator('tr[role="button"]');
    const mobileRows = page.locator('div[role="button"]').filter({ hasText: /CT-2026-/ });
    const row = (await desktopRows.count()) > 0 ? desktopRows.first() : mobileRows.first();
    await expect(row).toBeVisible();
    await row.click({ position: { x: 8, y: 8 } });
    await expect(page).toHaveURL(/\/projects\/[^/]+$/);
    await expectVisibleText(page, "Thời lượng thi công");
    await expectVisibleText(page, "Đang thi công");
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${artifacts}/${viewport.name}-detail.png`, fullPage: true });

    const projectId = new URL(page.url()).pathname.split("/").at(-1);
    expect(projectId).toBeTruthy();
    await page.goto("/documents", { waitUntil: "networkidle" });
    await expect(page.locator('[data-project-identity="card"]').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${artifacts}/${viewport.name}-documents.png`, fullPage: true });

    await page.goto(`/documents/${projectId}`, { waitUntil: "networkidle" });
    await expect(page.locator('[data-project-identity="full"]')).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const selector = page.locator("[data-project-context-trigger]");
    if (await selector.count()) {
      await selector.click();
      await expect(page.locator("[data-project-context-id]").first()).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.keyboard.press("Escape");
    }
    await page.screenshot({ path: `${artifacts}/${viewport.name}-selector.png`, fullPage: true });
  });
}
