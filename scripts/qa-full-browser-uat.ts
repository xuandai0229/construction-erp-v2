import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import fs from "fs";
import path from "path";
import prisma from "../src/lib/prisma";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
const screenshotDir = path.join(process.cwd(), "docs", "qa", "screenshots", "full-project-browser-uat");
const a11yReportPath = path.join(process.cwd(), "docs", "qa", "FULL_PROJECT_BROWSER_UAT_A11Y_REPORT.txt");

async function waitForSettledPage(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);
}

async function takeScreenshot(page: Page, filename: string) {
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`Captured ${filename}`);
}

async function scanA11y(page: Page, route: string, viewport: string): Promise<any[]> {
  return page.evaluate(`(() => {
    const routeName = ${JSON.stringify(route)};
    const viewportName = ${JSON.stringify(viewport)};
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };

    const issues = [];
    const fields = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea')).filter(isVisible);

    fields.forEach((el, index) => {
      const tag = el.tagName.toLowerCase();
      const id = el.getAttribute("id");
      const name = el.getAttribute("name");
      const ariaLabel = el.getAttribute("aria-label");
      const ariaLabelledBy = el.getAttribute("aria-labelledby");
      const wrappedByLabel = Boolean(el.closest("label"));
      const hasForLabel = id ? Boolean(document.querySelector('label[for="' + CSS.escape(id) + '"]')) : false;

      if (!id && !name) {
        issues.push({ route: routeName, viewport: viewportName, issue: tag + '[' + index + '] missing id or name' });
      }

      if (!ariaLabel && !ariaLabelledBy && !wrappedByLabel && !hasForLabel) {
        issues.push({ route: routeName, viewport: viewportName, issue: tag + '[' + index + '] has no associated label' });
      }
    });

    Array.from(document.querySelectorAll("button"))
      .filter(isVisible)
      .forEach((button, index) => {
        const accessibleName =
          button.getAttribute("aria-label") ||
          button.getAttribute("title") ||
          button.textContent?.trim();

        if (!accessibleName) {
          issues.push({ route: routeName, viewport: viewportName, issue: 'button[' + index + '] has no accessible name' });
        }
      });

    return issues;
  })()`);
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const a11yIssues: any[] = [];
  const browser = await chromium.launch({ headless: true });
  
  try {
    // 1. Desktop Context
    const desktopContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await desktopContext.newPage();

    // Catch browser console logs
    page.on('console', msg => console.log(`Browser console [${msg.type()}]:`, msg.text()));

    // Login
    console.log("Navigating to login...");
    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill("admin@construction.local");
    await page.locator('input[name="password"]').fill("123456");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard|\/projects/);

    // 2. Create Project
    console.log("Creating new project...");
    await page.goto(`${baseUrl}/projects/new`, { waitUntil: "networkidle" });
    await waitForSettledPage(page);
    
    const uniqueCode = `QA_UAT_${Date.now()}`;
    await page.locator('input[name="code"]').fill(uniqueCode);
    await page.locator('input[name="name"]').fill("QA_UAT_Cải tạo tuyến thoát nước Nguyễn Trãi 2026");
    await page.locator('input[name="investor"]').fill("Ban Quản lý dự án Hạ tầng Quận Thanh Xuân");
    await page.locator('input[name="location"]').fill("Đường Nguyễn Trãi, Thanh Xuân, Hà Nội");
    await page.locator('select[name="status"]').selectOption("ACTIVE");
    await page.locator('input[name="startDate"]').fill("2026-06-01");
    await page.locator('input[name="endDate"]').fill("2026-09-30");
    await page.locator('textarea[name="description"]').fill("Dữ liệu UAT tạo bằng trình duyệt để kiểm tra đầy đủ luồng công trình, khối lượng và đề xuất vật tư.");
    
    await takeScreenshot(page, "project-create-form.png");
    
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/projects/);
    await waitForSettledPage(page);
    
    // Get project ID from database (most reliable)
    const newProject = await prisma.project.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { code: uniqueCode }
    });
    
    if (!newProject) throw new Error("Could not find newly created project in DB");
    const projectId = newProject.id;
    
    // Go to project detail just for the screenshot
    await page.goto(`${baseUrl}/projects/${projectId}`, { waitUntil: "networkidle" });
    await waitForSettledPage(page);
    await takeScreenshot(page, "project-detail-after-create.png");
    
    console.log(`Created Project ID: ${projectId}`);

    // 3. Master Data
    console.log("Navigating to Master Field Progress...");
    await page.goto(`${baseUrl}/projects/${projectId}/field-progress`, { waitUntil: "networkidle" });
    await waitForSettledPage(page);
    
    // Group 1
    await page.getByRole('button', { name: /Thêm hạng mục chính/i }).click();
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Nhập tên hạng mục...').last().fill('Công tác chuẩn bị');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);
    
    await page.getByRole('button', { name: 'Thêm công việc con' }).last().click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('Nhập tên công việc...').last().fill('Rào chắn, biển báo công trường');
    await page.getByPlaceholder('Nhập mũi...').last().fill('Mũi 1 - Đoạn đầu tuyến');
    await page.locator('td:nth-child(4) button').last().click();
    await page.getByRole('button', { name: 'bộ', exact: true }).last().click();
    await page.getByPlaceholder('0.00').last().fill('12');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Thêm công việc con' }).last().click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('Nhập tên công việc...').last().fill('Định vị tim tuyến, cao độ');
    await page.getByPlaceholder('Nhập mũi...').last().fill('Mũi khảo sát');
    await page.locator('td:nth-child(4) button').last().click();
    await page.getByRole('button', { name: 'm', exact: true }).last().click();
    await page.getByPlaceholder('0.00').last().fill('850');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);

    // Group 2
    await page.getByRole('button', { name: /Thêm hạng mục chính/i }).click();
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Nhập tên hạng mục...').last().fill('Thi công thoát nước');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);
    
    await page.getByRole('button', { name: 'Thêm công việc con' }).last().click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('Nhập tên công việc...').last().fill('Đào đất hố móng tuyến cống');
    await page.getByPlaceholder('Nhập mũi...').last().fill('Mũi 1 - Km0+000 đến Km0+300');
    await page.locator('td:nth-child(4) button').last().click();
    await page.getByRole('button', { name: 'm³', exact: true }).last().click();
    await page.getByPlaceholder('0.00').last().fill('1250');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Thêm công việc con' }).last().click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('Nhập tên công việc...').last().fill('Lắp đặt cống hộp 2,5x2,5m');
    await page.getByPlaceholder('Nhập mũi...').last().fill('Mũi 1 - Nguyễn Trãi');
    await page.locator('td:nth-child(4) button').last().click();
    await page.getByRole('button', { name: 'm', exact: true }).last().click();
    await page.getByPlaceholder('0.00').last().fill('222');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Thêm công việc con' }).last().click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('Nhập tên công việc...').last().fill('Bê tông lót móng');
    await page.getByPlaceholder('Nhập mũi...').last().fill('Mũi 2 - Km0+300 đến Km0+600');
    await page.locator('td:nth-child(4) button').last().click();
    await page.getByRole('button', { name: 'm³', exact: true }).last().click();
    await page.getByPlaceholder('0.00').last().fill('180');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);

    // Group 3
    await page.getByRole('button', { name: /Thêm hạng mục chính/i }).click();
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Nhập tên hạng mục...').last().fill('Hoàn trả mặt đường');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Thêm công việc con' }).last().click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('Nhập tên công việc...').last().fill('Đắp cát hoàn trả');
    await page.getByPlaceholder('Nhập mũi...').last().fill('Mũi hoàn trả');
    await page.locator('td:nth-child(4) button').last().click();
    await page.getByRole('button', { name: 'm³', exact: true }).last().click();
    await page.getByPlaceholder('0.00').last().fill('900');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: 'Thêm công việc con' }).last().click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('Nhập tên công việc...').last().fill('Thảm bê tông nhựa');
    await page.getByPlaceholder('Nhập mũi...').last().fill('Mũi hoàn thiện');
    await page.locator('td:nth-child(4) button').last().click();
    await page.getByRole('button', { name: 'm²', exact: true }).last().click();
    await page.getByPlaceholder('0.00').last().fill('3200');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(2000);

    await takeScreenshot(page, "master-with-data-desktop.png");
    a11yIssues.push(...await scanA11y(page, "master", "desktop-1366"));

    // 4. Daily Data
    console.log("Navigating to Daily Field Progress...");
    
    // Date: 2026-06-17
    await page.goto(`${baseUrl}/projects/${projectId}/field-progress/daily?date=2026-06-17`, { waitUntil: "networkidle" });
    await waitForSettledPage(page);
    await page.locator('tr').filter({ hasText: 'Rào chắn, biển báo công trường' }).getByPlaceholder('0').fill('4');
    await page.locator('tr').filter({ hasText: 'Định vị tim tuyến, cao độ' }).getByPlaceholder('0').fill('250');
    await page.locator('tr').filter({ hasText: 'Đào đất hố móng tuyến cống' }).getByPlaceholder('0').fill('120');
    await page.locator('tr').filter({ hasText: 'Lắp đặt cống hộp 2,5x2,5m' }).getByPlaceholder('0').fill('18');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);
    
    // Test update: '18 m' to '20 m'
    await page.locator('tr').filter({ hasText: 'Lắp đặt cống hộp 2,5x2,5m' }).getByPlaceholder('0').fill('20');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);

    // Date: 2026-06-18
    await page.goto(`${baseUrl}/projects/${projectId}/field-progress/daily?date=2026-06-18`, { waitUntil: "networkidle" });
    await waitForSettledPage(page);
    await page.locator('tr').filter({ hasText: 'Đào đất hố móng tuyến cống' }).getByPlaceholder('0').fill('180');
    await page.locator('tr').filter({ hasText: 'Lắp đặt cống hộp 2,5x2,5m' }).getByPlaceholder('0').fill('24');
    await page.locator('tr').filter({ hasText: 'Bê tông lót móng' }).getByPlaceholder('0').fill('35');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);

    // Date: 2026-06-19
    await page.goto(`${baseUrl}/projects/${projectId}/field-progress/daily?date=2026-06-19`, { waitUntil: "networkidle" });
    await waitForSettledPage(page);
    await page.locator('tr').filter({ hasText: 'Đào đất hố móng tuyến cống' }).getByPlaceholder('0').fill('150');
    await page.locator('tr').filter({ hasText: 'Bê tông lót móng' }).getByPlaceholder('0').fill('42');
    await page.locator('tr').filter({ hasText: 'Đắp cát hoàn trả' }).getByPlaceholder('0').fill('80');
    await page.getByRole('button', { name: /Lưu/i }).first().click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, "daily-with-data-desktop.png");
    a11yIssues.push(...await scanA11y(page, "daily", "desktop-1366"));

    // 5. Summary Data
    console.log("Navigating to Summary Field Progress...");
    await page.goto(`${baseUrl}/projects/${projectId}/field-progress/summary`, { waitUntil: "networkidle" });
    await waitForSettledPage(page);
    await takeScreenshot(page, "summary-with-data-desktop.png");
    a11yIssues.push(...await scanA11y(page, "summary", "desktop-1366"));

    // 6. Material Requests
    console.log("Navigating to Material Requests...");
    await page.goto(`${baseUrl}/projects/${projectId}/material-requests`, { waitUntil: "networkidle" });
    await waitForSettledPage(page);

    // Draft Request
    await page.getByRole('button', { name: /Tạo đề xuất/i }).first().click();
    await waitForSettledPage(page);
    await page.locator('input[name="neededDate"]').fill('2026-06-20');
    await page.locator('select[name="priority"]').selectOption('MEDIUM');
    await page.locator('input[name="note"]').fill('Chuẩn bị vật tư cho thi công đoạn đầu tuyến.');
    
    // Add items... this might be complex with the UI
    await page.getByPlaceholder('Tên vật tư').last().fill('Cống hộp 2,5x2,5m');
    await page.getByPlaceholder('Đơn vị').last().fill('m');
    await page.getByPlaceholder('SL').last().fill('40');
    // select related field progress
    await page.locator('select[name^="fieldProgressItemId-"]').last().selectOption({ index: 4 });

    await page.getByRole('button', { name: /Thêm dòng/i }).click();
    await page.getByPlaceholder('Tên vật tư').last().fill('Xi măng PCB40');
    await page.getByPlaceholder('Đơn vị').last().fill('tấn');
    await page.getByPlaceholder('SL').last().fill('8');
    await page.locator('select[name^="fieldProgressItemId-"]').last().selectOption({ index: 5 });
    
    await takeScreenshot(page, "material-form-desktop.png");
    // Save draft
    await page.getByRole('button', { name: /Lưu nháp/i }).click();
    try {
      await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 5000 });
    } catch (e) {
      const errText = await page.locator('.text-red-600').first().textContent().catch(() => 'Unknown');
      throw new Error(`Draft submission failed: ${errText}`);
    }
    await waitForSettledPage(page);

    // Proposed Request
    await page.getByRole('button', { name: /Tạo đề xuất/i }).first().click();
    await waitForSettledPage(page);
    await page.locator('input[name="neededDate"]').fill('2026-06-21');
    await page.locator('select[name="priority"]').selectOption('HIGH');
    await page.locator('input[name="note"]').fill('Cần cấp gấp để không dừng thi công tuyến cống.');
    
    await page.getByPlaceholder('Tên vật tư').last().fill('Cát vàng');
    await page.getByPlaceholder('Đơn vị').last().fill('m³');
    await page.getByPlaceholder('SL').last().fill('120');
    await page.locator('select[name^="fieldProgressItemId-"]').last().selectOption({ index: 6 });

    await page.getByRole('button', { name: /Thêm dòng/i }).click();
    await page.getByPlaceholder('Tên vật tư').last().fill('Đá 1x2');
    await page.getByPlaceholder('Đơn vị').last().fill('m³');
    await page.getByPlaceholder('SL').last().fill('60');
    await page.locator('select[name^="fieldProgressItemId-"]').last().selectOption({ index: 5 });

    await page.getByRole('button', { name: /Thêm dòng/i }).click();
    await page.getByPlaceholder('Tên vật tư').last().fill('Thép D16');
    await page.getByPlaceholder('Đơn vị').last().fill('kg');
    await page.getByPlaceholder('SL').last().fill('1500');
    await page.locator('select[name^="fieldProgressItemId-"]').last().selectOption({ index: 4 });

    await page.getByRole('button', { name: "Đề xuất", exact: true }).click();
    try {
      await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 5000 });
    } catch (e) {
      const errText = await page.locator('.text-red-600').first().textContent().catch(() => 'Unknown');
      throw new Error(`Proposed submission failed: ${errText}`);
    }
    await waitForSettledPage(page);

    // Emergency Request
    await page.getByRole('button', { name: /Tạo đề xuất/i }).first().click();
    await waitForSettledPage(page);
    await page.locator('input[name="neededDate"]').fill('2026-06-22');
    await page.locator('select[name="priority"]').selectOption('URGENT');
    await page.locator('input[name="note"]').fill('Vật tư phục vụ hoàn trả mặt đường.');
    
    await page.getByPlaceholder('Tên vật tư').last().fill('Bê tông nhựa C19');
    await page.getByPlaceholder('Đơn vị').last().fill('tấn');
    await page.getByPlaceholder('SL').last().fill('95');
    await page.locator('select[name^="fieldProgressItemId-"]').last().selectOption({ index: 7 });

    await page.getByRole('button', { name: /Thêm dòng/i }).click();
    await page.getByPlaceholder('Tên vật tư').last().fill('Nhũ tương bám dính');
    await page.getByPlaceholder('Đơn vị').last().fill('kg');
    await page.getByPlaceholder('SL').last().fill('350');
    await page.locator('select[name^="fieldProgressItemId-"]').last().selectOption({ index: 7 });

    await page.getByRole('button', { name: "Đề xuất", exact: true }).click();
    try {
      await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 5000 });
    } catch (e) {
      const errText = await page.locator('.text-red-600').first().textContent().catch(() => 'Unknown');
      throw new Error(`Urgent submission failed: ${errText}`);
    }
    await waitForSettledPage(page);

    const currentUrl = page.url();
    await page.goto(`${baseUrl}/projects`);
    await waitForSettledPage(page);
    await page.goto(currentUrl);
    await waitForSettledPage(page);
    // List material request screenshot
    await takeScreenshot(page, "material-list-with-data-desktop.png");
    a11yIssues.push(...await scanA11y(page, "material-list", "desktop-1366"));

    // Detail update
    // Find the emergency request detail button
    // Wait for rows to appear, then click the first one's detail button
    let rowCount = 0;
    for (let i = 0; i < 5; i++) {
      rowCount = await page.locator('button[title="Chi tiết"]').count();
      if (rowCount > 0) break;
      await page.reload();
      await waitForSettledPage(page);
    }
    console.log("Found material request rows:", rowCount);
    
    if (rowCount > 0) {
      await page.locator('button[title="Chi tiết"]').first().click();
      await waitForSettledPage(page);
    } else {
      throw new Error("No rows found after 5 reloads!");
    }
    await waitForSettledPage(page);
    
    // Fill quantities inline
    const inputs = page.locator('div[role="dialog"] td input[type="number"]');
    await inputs.nth(0).fill('50');
    await inputs.nth(1).fill('45');
    // Nhũ tương bám dính
    await inputs.nth(2).fill('350');
    await inputs.nth(3).fill('350');
    
    await page.locator('button:has-text("Cập nhật cấp/nhận")').click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, "material-detail-desktop.png");

    const storageState = await desktopContext.storageState();
    await desktopContext.close();

    // 7. Mobile Context Screenshots
    console.log("Capturing Mobile Screenshots...");
    const mobileContext = await browser.newContext({ storageState, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const mPage = await mobileContext.newPage();

    await mPage.goto(`${baseUrl}/projects/${projectId}/field-progress`, { waitUntil: "networkidle" });
    await waitForSettledPage(mPage);
    await takeScreenshot(mPage, "master-mobile-390.png");

    await mPage.goto(`${baseUrl}/projects/${projectId}/field-progress/daily?date=2026-06-19`, { waitUntil: "networkidle" });
    await waitForSettledPage(mPage);
    await takeScreenshot(mPage, "daily-mobile-390.png");

    await mPage.goto(`${baseUrl}/projects/${projectId}/field-progress/summary`, { waitUntil: "networkidle" });
    await waitForSettledPage(mPage);
    await takeScreenshot(mPage, "summary-mobile-390.png");

    await mPage.goto(`${baseUrl}/projects/${projectId}/material-requests`, { waitUntil: "networkidle" });
    await waitForSettledPage(mPage);
    await takeScreenshot(mPage, "material-mobile-list-390.png");

    await mPage.getByRole('button', { name: /Tạo mới|Tạo đề xuất/i }).first().click();
    await waitForSettledPage(mPage);
    await takeScreenshot(mPage, "material-mobile-form-390.png");

    await mobileContext.close();
    
    // Save A11y report
    const a11yText = [
      "FIELD MATERIAL FULL A11Y AUDIT (UAT)",
      `Base URL: ${baseUrl}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      a11yIssues.length === 0
        ? "PASS: No visible field id/name/label or button accessible-name issues found in audited screens."
        : "FAIL: Visible accessibility issues found:",
      ...a11yIssues.map((issue) => `- [${issue.viewport}] ${issue.route}: ${issue.issue}`),
      "",
    ].join("\n");
    
    fs.writeFileSync(a11yReportPath, a11yText, "utf8");
    console.log(`Saved A11y Report: ${a11yReportPath}`);

    console.log("✅ UAT Script Completed Successfully!");
  } catch (error) {
    console.error("❌ UAT Script Failed:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
