import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const viewports = [
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1536", width: 1536, height: 864 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "desktop-2560", width: 2560, height: 1440 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "tablet-820", width: 820, height: 1180 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-360", width: 360, height: 800 },
] as const;

const LONG_PROJECT_NAME = "Nhà văn phòng điều hành 5 tầng – Khu công nghiệp Từ Hiệp và hạ tầng kỹ thuật phụ trợ";

type PriorityDomItem = { projectId: string; reason: string; cta: string };

async function assertNoPageOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: element.id ? `#${element.id}` : element.dataset.dashboardCard ? `[data-dashboard-card="${element.dataset.dashboardCard}"]` : element.tagName.toLowerCase(),
          left: rect.left,
          right: rect.right,
          width: rect.width,
          visible: Boolean(rect.width && rect.height) && getComputedStyle(element).display !== "none",
        };
      })
      .filter((item) => item.visible && (item.left < -1 || item.right > viewportWidth + 1))
      .slice(0, 12);
    return { scrollWidth: root.scrollWidth, clientWidth: viewportWidth, offenders };
  });

  expect(result.scrollWidth, `Horizontal overflow; offenders: ${JSON.stringify(result.offenders)}`).toBeLessThanOrEqual(result.clientWidth);
}

async function priorityItems(list: Locator): Promise<PriorityDomItem[]> {
  return list.locator("[data-priority-project-id]").evaluateAll((elements) => elements.map((element) => ({
    projectId: element.getAttribute("data-priority-project-id") ?? "",
    reason: element.getAttribute("data-priority-reason") ?? "",
    cta: element.getAttribute("data-priority-cta") ?? "",
  })));
}

async function assertDistinctPrioritySemantics(page: Page) {
  const operational = await priorityItems(page.locator('[data-priority-list="operational"]'));
  const dataQuality = await priorityItems(page.locator('[data-priority-list="data-quality"]'));

  expect(operational).not.toEqual(dataQuality);
  if (operational.length === 5 && dataQuality.length === 5) {
    expect(operational.map((item) => item.projectId)).not.toEqual(dataQuality.map((item) => item.projectId));
  }

  for (const operationalItem of operational) {
    const duplicate = dataQuality.find((item) => item.projectId === operationalItem.projectId);
    if (!duplicate) continue;
    expect({ reason: operationalItem.reason, cta: operationalItem.cta }).not.toEqual({ reason: duplicate.reason, cta: duplicate.cta });
  }
}

async function assertBalancedRow(page: Page, rowName: string) {
  const row = page.locator(`[data-dashboard-row="${rowName}"]`);
  const cards = row.locator(":scope > [data-dashboard-card]");
  await expect(cards).toHaveCount(2);
  const boxes = await cards.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { height: rect.height, top: rect.top, bottom: rect.bottom };
  }));
  expect(Math.abs(boxes[0].height - boxes[1].height), `${rowName} card heights: ${JSON.stringify(boxes)}`).toBeLessThanOrEqual(12);
  expect(Math.abs(boxes[0].top - boxes[1].top), `${rowName} card tops: ${JSON.stringify(boxes)}`).toBeLessThanOrEqual(1);
  await expect(cards.nth(0)).toHaveAttribute("data-card-layout", "BALANCED");
  await expect(cards.nth(1)).toHaveAttribute("data-card-layout", "BALANCED");
}

async function assertContentRow(page: Page, rowName: string) {
  const row = page.locator(`[data-dashboard-row="${rowName}"]`);
  const cards = row.locator(":scope > [data-dashboard-card]");
  await expect(cards).toHaveCount(2);
  const result = await row.evaluate((element) => {
    const children = [...element.children] as HTMLElement[];
    return {
      alignItems: getComputedStyle(element).alignItems,
      cards: children.map((child) => ({
        top: child.getBoundingClientRect().top,
        height: child.getBoundingClientRect().height,
        className: child.className,
        layout: child.dataset.cardLayout,
      })),
    };
  });
  expect(result.alignItems).toBe("start");
  expect(Math.abs(result.cards[0].top - result.cards[1].top)).toBeLessThanOrEqual(1);
  for (const card of result.cards) {
    expect(card.layout).toBe("CONTENT");
    expect(card.className).not.toMatch(/\bh-full\b|\bmin-h-\[/);
  }
}

async function openProjectContext(page: Page, index = 0) {
  await page.locator("[data-project-context-trigger]").click();
  const options = page.locator('[data-project-context-id]:not([data-project-context-id="all"])');
  const count = await options.count();
  test.skip(count <= index, `Không có công trình thứ ${index + 1} trong phạm vi QA.`);
  const projectId = await options.nth(index).getAttribute("data-project-context-id");
  expect(projectId).toBeTruthy();
  await options.nth(index).click();
  await page.waitForURL((url) => url.searchParams.get("projectId") === projectId);
  await expect(page.locator('[data-dashboard-mode="PROJECT"]')).toBeAttached();
  return projectId!;
}

test.describe("Dashboard context and information architecture", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard?projectId=all", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('[data-dashboard-mode="PORTFOLIO"]')).toBeAttached();
  });

  test("portfolio uses separate summary and action rows with distinct semantics", async ({ page }) => {
    await expect(page.getByText("Sức khỏe dữ liệu danh mục công trình", { exact: true })).toBeVisible();
    await expect(page.getByText("Công trình cần can thiệp về tiến độ và rủi ro", { exact: true })).toBeVisible();
    await expect(page.getByText("Công trình cần hoàn thiện dữ liệu", { exact: true })).toBeVisible();
    await expect(page.getByText("Công trình cần ưu tiên", { exact: true })).toHaveCount(0);
    await assertDistinctPrioritySemantics(page);
  });

  test("switches portfolio -> project A -> project B -> portfolio and survives reload", async ({ page }) => {
    const projectA = await openProjectContext(page, 0);
    await expect(page.getByText("Tiến độ công trình", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(`[data-dashboard-project-id="${projectA}"]`)).toBeAttached();

    await page.locator("[data-project-context-trigger]").click();
    const options = page.locator('[data-project-context-id]:not([data-project-context-id="all"])');
    if (await options.count() > 1) {
      const projectB = await options.nth(1).getAttribute("data-project-context-id");
      await options.nth(1).click();
      await page.waitForURL((url) => url.searchParams.get("projectId") === projectB);
      await expect(page.locator(`[data-dashboard-project-id="${projectB}"]`)).toBeAttached();
    }

    await page.locator("[data-project-context-trigger]").click();
    await page.locator('[data-project-context-id="all"]').click();
    await page.waitForURL((url) => url.pathname === "/dashboard" && !url.searchParams.has("projectId"));
    await expect(page.locator('[data-dashboard-mode="PORTFOLIO"]')).toBeAttached();
  });

  test("project mode removes portfolio-only information architecture", async ({ page }) => {
    await openProjectContext(page, 0);
    const projectDashboard = page.locator('[data-dashboard-mode="PROJECT"]');

    await expect(projectDashboard.getByText("Tiến độ công trình", { exact: true })).toBeVisible();
    await expect(projectDashboard.getByText("Sức khỏe dữ liệu công trình", { exact: true })).toBeVisible();
    await expect(projectDashboard.getByText("Vấn đề và rủi ro cần xử lý", { exact: true })).toBeVisible();
    await expect(projectDashboard.getByText("Hành động tiếp theo", { exact: true })).toBeVisible();
    await expect(projectDashboard.getByText("Tổng công trình", { exact: true })).toHaveCount(0);
    await expect(projectDashboard.getByText("Công trình cần ưu tiên", { exact: true })).toHaveCount(0);
    await expect(projectDashboard.getByText("Tối đa 5 công trình", { exact: true })).toHaveCount(0);
    await expect(page.locator("[data-portfolio-donut]")).toHaveCount(0);
    await expect(projectDashboard.locator("[data-priority-project-id]")).toHaveCount(0);
  });

  test("balances only summary cards and lets content cards size themselves", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: "networkidle" });
    await assertBalancedRow(page, "portfolio-summary");
    await assertContentRow(page, "portfolio-lists");
    await assertNoPageOverflow(page);
  });

  test("keeps empty approval content compact", async ({ page }) => {
    const empty = page.locator('[data-dashboard-empty="approvals"]');
    test.skip(await empty.count() === 0, "QA hiện có hồ sơ chờ phê duyệt.");
    const box = await empty.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(130);
    expect(box?.height).toBeLessThanOrEqual(170);
  });

  test("keeps project action cards top-aligned without equal-height stretching", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openProjectContext(page, 0);
    await assertContentRow(page, "project-actions");
  });

  test("shows a compact hero and an explicit period on every KPI", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const hero = page.locator("[data-dashboard-hero]");
    const heroBox = await hero.boundingBox();
    expect(heroBox?.height).toBeLessThanOrEqual(140);
    const kpis = page.locator("[data-dashboard-kpis] > *");
    await expect(kpis).toHaveCount(6);
    for (let index = 0; index < 6; index += 1) {
      await expect(kpis.nth(index).locator("[data-kpi-period]")).toBeVisible();
    }
  });

  for (const viewport of viewports) {
    test(`has no page overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.reload({ waitUntil: "networkidle" });
      await assertNoPageOverflow(page);
      await expect(page.getByText("Thiếu cả kế hoạch và thực tế", { exact: true })).toBeVisible();
    });
  }

  test("keeps the required long project name available to keyboard and touch users", async ({ page }) => {
    const fixture = page.locator(`[aria-label="${LONG_PROJECT_NAME}"]`).first();
    test.skip(await fixture.count() === 0, "Fixture tên dài không tồn tại trong database QA an toàn.");
    await fixture.focus();
    await expect(page.getByRole("tooltip")).toContainText(LONG_PROJECT_NAME);
    await fixture.click();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await assertNoPageOverflow(page);
  });

  test("resizes portfolio chart after viewport changes and route round-trip without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

    await page.setViewportSize({ width: 1440, height: 900 });
    const desktopBox = await page.locator("[data-portfolio-donut]").boundingBox();
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileBox = await page.locator("[data-portfolio-donut]").boundingBox();
    await openProjectContext(page, 0);
    await page.goBack({ waitUntil: "networkidle" });
    await expect(page.locator("[data-portfolio-donut]")).toBeVisible();

    expect(desktopBox?.width).toBeGreaterThanOrEqual(160);
    expect(mobileBox?.width).toBeGreaterThanOrEqual(160);
    expect(consoleErrors.filter((message) => /width.*0|height.*0|ResizeObserver|hydration|duplicate key/i.test(message))).toEqual([]);
  });

  test("captures portfolio and project evidence at desktop, tablet, and mobile", async ({ page }) => {
    const outputDir = path.join(process.cwd(), "test-results", "dashboard-context-ia");
    fs.mkdirSync(outputDir, { recursive: true }); 

    for (const viewport of [viewports[1], viewports[6], viewports[9]]) {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard?projectId=all", { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(outputDir, `portfolio-${viewport.name}-top.png`), fullPage: false });
      await page.locator('[data-dashboard-row="portfolio-lists"]').screenshot({ path: path.join(outputDir, `portfolio-${viewport.name}-lists.png`) });
      await openProjectContext(page, 0);
      await page.screenshot({ path: path.join(outputDir, `project-${viewport.name}.png`), fullPage: true });
    }
  });
});
