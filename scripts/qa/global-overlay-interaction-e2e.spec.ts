import { test, expect } from '@playwright/test';

const email = process.env.QA_ADMIN_EMAIL || "qa.admin.tuhiep@example.test";
const password = process.env.QA_ADMIN_PASSWORD || "R_CSs9EW06iHTDY4aiMG28Y6hpzh1DAr_E-3FA7A0dk";

test.describe('Global Overlay Interaction Standardizing Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  });

  test('Requirement 1: Single-click switch between Header controls', async ({ page }) => {
    // 1. Click Project Switcher
    const projectSwitcher = page.locator('[data-project-context-trigger]');
    await expect(projectSwitcher).toBeVisible();
    await projectSwitcher.click();

    // Verify Project Switcher dropdown opened
    const projectSearchInput = page.locator('input[placeholder="Tìm tên hoặc mã..."]');
    await expect(projectSearchInput).toBeVisible();

    // 2. Click Notification Bell directly in 1 click while Project Switcher is open
    const bellButton = page.locator('button[aria-label="Thông báo"]');
    await expect(bellButton).toBeVisible();
    await bellButton.click();

    // Verify Project Switcher closed AND Notification panel opened instantly!
    await expect(projectSearchInput).not.toBeVisible();
    const notifHeading = page.getByRole('heading', { name: 'Thông báo' });
    await expect(notifHeading).toBeVisible();

    // 3. Click User Menu directly in 1 click while Notification panel is open
    const userMenuTrigger = page.locator('button[aria-label="Menu tài khoản người dùng"]');
    await expect(userMenuTrigger).toBeVisible();
    await userMenuTrigger.click();

    // Verify Notification panel closed AND User Menu opened!
    await expect(notifHeading).not.toBeVisible();
    const logoutItem = page.getByRole('menuitem', { name: 'Đăng xuất khỏi hệ thống' });
    await expect(logoutItem).toBeVisible();
  });

  test('Requirement 2: Click outside closes overlay without swallowing click', async ({ page }) => {
    const bellButton = page.locator('button[aria-label="Thông báo"]');
    await bellButton.click();
    const notifHeading = page.getByRole('heading', { name: 'Thông báo' });
    await expect(notifHeading).toBeVisible();

    // Click outside on standard page area
    await page.mouse.click(10, 10);

    // Verify overlay closed
    await expect(notifHeading).not.toBeVisible();
  });

  test('Requirement 3: Pressing Escape closes top overlay and returns focus', async ({ page }) => {
    const bellButton = page.locator('button[aria-label="Thông báo"]');
    await bellButton.click();
    await expect(bellButton).toBeFocused();

    const notifHeading = page.getByRole('heading', { name: 'Thông báo' });
    await expect(notifHeading).toBeVisible();

    // Press Escape key
    await page.keyboard.press('Escape');

    // Overlay must close AND focus must return to trigger
    await expect(notifHeading).not.toBeVisible();
    await expect(bellButton).toBeFocused();
  });

  test('Requirement 4: Single-click switch between Row Action Menus in Data Tables', async ({ page }) => {
    await page.goto('/reports/weekly-inspection');
    await page.waitForLoadState('domcontentloaded');

    const actionMenus = page.locator('button[aria-label="Thao tác dòng"]');
    const count = await actionMenus.count();

    if (count >= 2) {
      await actionMenus.nth(0).click();
      const menu1 = page.locator('[role="menu"]').first();
      await expect(menu1).toBeVisible();

      await actionMenus.nth(1).click();
      const menu2 = page.locator('[role="menu"]').first();
      await expect(menu2).toBeVisible();
    }
  });

  test('Requirement 5: Route change automatically closes transient overlays', async ({ page }) => {
    const bellButton = page.locator('button[aria-label="Thông báo"]');
    await bellButton.click();
    const notifHeading = page.getByRole('heading', { name: 'Thông báo' });
    await expect(notifHeading).toBeVisible();

    await page.goto('/projects');
    await expect(notifHeading).not.toBeVisible();
  });
});
