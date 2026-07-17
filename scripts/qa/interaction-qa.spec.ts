import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load dynamic project ID from QA manifest if exists
let dynamicProjectId = '';
try {
  const manifestPath = path.join(process.cwd(), 'test-results/ui-ux-phase-3/qa-fixture-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    dynamicProjectId = manifest.project?.id || '';
  }
} catch (e) {
  console.warn('Could not read qa-fixture-manifest.json in interaction tests', e);
}

test.describe('Interaction Tests - Desktop Viewport (1440x900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    const authPath = path.join(process.cwd(), 'playwright', '.auth', 'admin.json');
    if (!fs.existsSync(authPath)) {
      test.skip(true, "Authentication storage state 'admin.json' is missing. QA environment is not ready.");
    }
  });

  test('Global Search Modal Interaction (Desktop)', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'load' });

    // 1. Trigger visible
    const searchTrigger = page.getByRole('button', { name: /Tìm kiếm/i });
    await expect(searchTrigger).toBeVisible();

    // 2. Open search
    await searchTrigger.click();

    // 3. Search dialog visible
    const searchDialog = page.locator('input[placeholder*="Tìm công trình, báo cáo"]').locator('xpath=./ancestor::div[contains(@class, "fixed")]').first();
    await expect(searchDialog).toBeVisible();

    // 4. Input receives focus
    const searchInput = page.getByPlaceholder("Tìm công trình, báo cáo, hồ sơ, thông báo...");
    await expect(searchInput).toBeFocused();

    // 5. Escape closes
    await page.keyboard.press('Escape');
    await expect(searchDialog).not.toBeVisible();
  });

  test('Project Switcher Interaction (Desktop)', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'load' });

    // 1. Trigger visible
    const switcherTrigger = page.getByRole('button', { name: /Toàn hệ thống|Đang xem công trình/i });
    await expect(switcherTrigger).toBeVisible();

    // 2. Popover opens
    await switcherTrigger.click();

    // 3. List renders
    const searchInput = page.getByPlaceholder("Tìm tên hoặc mã...");
    await expect(searchInput).toBeVisible();
    
    const allSystemButton = page.getByRole('button', { name: /Toàn hệ thống/i }).last();
    await expect(allSystemButton).toBeVisible();

    // 4. Escape closes
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });

  test('Materials Filters and Catalog View (Desktop)', async ({ page }) => {
    const targetUrl = dynamicProjectId ? `/materials?projectId=${dynamicProjectId}&tab=catalog` : '/materials';
    await page.goto(targetUrl, { waitUntil: 'load' });

    // 1. Search input always visible
    const searchInput = page.locator('#materials-catalog-search');
    await expect(searchInput).toBeVisible();

    // 2. Advanced filter toggle button visible
    const filterToggle = page.getByRole('button', { name: /bộ lọc nâng cao/i });
    await expect(filterToggle).toBeVisible();

    // Scope testing to materials-advanced-filters or parent container
    const filterContainer = page.locator('[data-testid="materials-advanced-filters"], div.grid.grid-cols-1:has(select)').first();

    // 3. Select filters inside the container are hidden initially (container not visible or count 0)
    await expect(filterContainer.locator('select')).toHaveCount(0);

    // 4. Click opens panel
    await filterToggle.click();

    // 5. Three main filters appear inside the container
    await expect(filterContainer.locator('select')).toHaveCount(3);
    
    // 6. Click again closes panel
    await filterToggle.click();
    await expect(filterContainer.locator('select')).toHaveCount(0);
  });

  test('Help Popover Overlay Interaction (Desktop)', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'load' });

    // 1. Trigger visible
    const helpTrigger = page.getByRole('button', { name: /Trợ giúp/i });
    await expect(helpTrigger).toBeVisible();

    // 2. Open popover
    await helpTrigger.click();

    // 3. Popover visible & doesn't overflow page
    const popoverHeading = page.getByRole('heading', { name: /Hướng dẫn nhanh/i });
    await expect(popoverHeading).toBeVisible();

    const popover = page.locator('div:has-text("Hướng dẫn nhanh")').locator('xpath=./ancestor::div[contains(@class, "fixed") or contains(@class, "absolute")]').first();
    const popoverBox = await popover.boundingBox();
    const viewport = page.viewportSize();
    if (popoverBox && viewport) {
      expect(popoverBox.x + popoverBox.width).toBeLessThanOrEqual(viewport.width);
      expect(popoverBox.y + popoverBox.height).toBeLessThanOrEqual(viewport.height);
    }

    // 4. Click outside closes
    await page.mouse.click(10, 10);
    await expect(popoverHeading).not.toBeVisible();
  });
});

test.describe('Interaction Tests - Mobile Viewport (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    const authPath = path.join(process.cwd(), 'playwright', '.auth', 'admin.json');
    if (!fs.existsSync(authPath)) {
      test.skip(true, "Authentication storage state 'admin.json' is missing. QA environment is not ready.");
    }
  });

  test('Global Search Modal Interaction (Mobile)', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'load' });

    // 1. Trigger visible
    const searchTrigger = page.getByRole('button', { name: /Tìm kiếm/i });
    await expect(searchTrigger).toBeVisible();

    // 2. Open search
    await searchTrigger.click();

    // 3. Search dialog visible
    const searchDialog = page.locator('input[placeholder*="Tìm công trình, báo cáo"]').locator('xpath=./ancestor::div[contains(@class, "fixed")]').first();
    await expect(searchDialog).toBeVisible();

    // 4. Input receives focus
    const searchInput = page.getByPlaceholder("Tìm công trình, báo cáo, hồ sơ, thông báo...");
    await expect(searchInput).toBeFocused();

    // 5. Escape closes
    await page.keyboard.press('Escape');
    await expect(searchDialog).not.toBeVisible();
  });

  test('Materials Filters and Catalog View (Mobile)', async ({ page }) => {
    const targetUrl = dynamicProjectId ? `/materials?projectId=${dynamicProjectId}&tab=catalog` : '/materials';
    await page.goto(targetUrl, { waitUntil: 'load' });

    // 1. Search input always visible
    const searchInput = page.locator('#materials-catalog-search');
    await expect(searchInput).toBeVisible();

    // 2. Advanced filter toggle button visible
    const filterToggle = page.getByRole('button', { name: /bộ lọc nâng cao/i });
    await expect(filterToggle).toBeVisible();

    // Scope testing to materials-advanced-filters or parent container
    const filterContainer = page.locator('[data-testid="materials-advanced-filters"], div.grid.grid-cols-1:has(select)').first();

    // 3. Select filters inside the container are hidden initially
    await expect(filterContainer.locator('select')).toHaveCount(0);

    // 4. Click opens panel
    await filterToggle.click();

    // 5. Three main filters appear inside the container
    await expect(filterContainer.locator('select')).toHaveCount(3);
    
    // 6. Click again closes panel
    await filterToggle.click();
    await expect(filterContainer.locator('select')).toHaveCount(0);
  });
});

test.describe('Mutation Tests Guard', () => {
  test('Mutation Forms Guard', async ({ page }) => {
    test.skip(true, "Mutation verification is deferred until QA fixture creation and cleanup are proven.");
  });
});
