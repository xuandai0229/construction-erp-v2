import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Route /reports/safety/weekly-files/[id] Overlay Interaction Runtime Verification', () => {
  test.beforeEach(async ({ page, context }) => {
    try {
      const authState = JSON.parse(fs.readFileSync('playwright/.auth/admin.json', 'utf-8'));
      await context.addCookies(authState.cookies);
    } catch (e) {
      // Ignored
    }

    await page.goto('/reports/safety');
    await page.waitForLoadState('domcontentloaded');

    // Click "Mở hồ sơ" or create one
    const openBtn = page.getByRole('button', { name: 'Mở hồ sơ' }).first();
    if (await openBtn.isVisible()) {
      await openBtn.click();
    } else {
      await page.getByRole('button', { name: 'Tạo hồ sơ tuần' }).click();
      await page.getByRole('button', { name: 'Khởi tạo hồ sơ' }).click();
    }

    await page.waitForSelector('[data-weekly-file-action-trigger], [data-preview-trigger]', { timeout: 15000 });
  });

  test('Scenario A: Open 3-dots menu -> click outside -> menu closes immediately', async ({ page }) => {
    const actionTrigger = page.locator('[data-weekly-file-action-trigger]');
    await expect(actionTrigger).toBeVisible();
    await actionTrigger.click();

    const deleteItem = page.locator('[data-delete-weekly-file-action]');
    await expect(deleteItem).toBeVisible();

    await page.mouse.click(10, 10);
    await expect(deleteItem).not.toBeVisible();
  });

  test('Scenario B: Open 3-dots menu -> click "Xem trước" once -> 3-dots closes & "Xem trước" opens in 1 click', async ({ page }) => {
    const actionTrigger = page.locator('[data-weekly-file-action-trigger]');
    const previewTrigger = page.locator('[data-preview-trigger]');

    await expect(actionTrigger).toBeVisible();
    await expect(previewTrigger).toBeVisible();

    await actionTrigger.click();
    const deleteItem = page.locator('[data-delete-weekly-file-action]');
    await expect(deleteItem).toBeVisible();

    await previewTrigger.click();

    await expect(deleteItem).not.toBeVisible();
    const previewPlanItem = page.locator('[data-preview-plan], [data-preview-assessment]').first();
    await expect(previewPlanItem).toBeVisible();
  });

  test('Scenario C: Open menu -> click project switcher on header once -> menu closes & project switcher opens', async ({ page }) => {
    const previewTrigger = page.locator('[data-preview-trigger]');
    const projectSwitcher = page.locator('[data-project-context-trigger]');

    await expect(previewTrigger).toBeVisible();
    await expect(projectSwitcher).toBeVisible();

    await previewTrigger.click();
    const previewPlanItem = page.locator('[data-preview-plan], [data-preview-assessment]').first();
    await expect(previewPlanItem).toBeVisible();

    await projectSwitcher.click();

    await expect(previewPlanItem).not.toBeVisible();
    const projectSearchInput = page.locator('input[placeholder="Tìm tên hoặc mã..."]');
    await expect(projectSearchInput).toBeVisible();
  });

  test('Scenario D: Open menu -> click notification bell once -> menu closes & notification bell opens', async ({ page }) => {
    const previewTrigger = page.locator('[data-preview-trigger]');
    const bellButton = page.locator('button[aria-label="Thông báo"]');

    await expect(previewTrigger).toBeVisible();
    await expect(bellButton).toBeVisible();

    await previewTrigger.click();
    const previewPlanItem = page.locator('[data-preview-plan], [data-preview-assessment]').first();
    await expect(previewPlanItem).toBeVisible();

    await bellButton.click();

    await expect(previewPlanItem).not.toBeVisible();
    const notifHeading = page.getByRole('heading', { name: 'Thông báo' });
    await expect(notifHeading).toBeVisible();
  });

  test('Scenario E: Open 3-dots menu -> click "Xóa hồ sơ" -> opens ConfirmDialog with danger protection', async ({ page }) => {
    const actionTrigger = page.locator('[data-weekly-file-action-trigger]');
    await expect(actionTrigger).toBeVisible();
    await actionTrigger.click();

    const deleteItem = page.locator('[data-delete-weekly-file-action]');
    await expect(deleteItem).toBeVisible();

    await deleteItem.click();

    const confirmModal = page.getByRole('dialog');
    await expect(confirmModal).toBeVisible();
    await expect(page.getByText('Xóa toàn bộ hồ sơ tuần')).toBeVisible();

    await page.mouse.click(10, 10);
    await expect(confirmModal).toBeVisible();

    await page.getByRole('button', { name: 'Hủy' }).click();
    await expect(confirmModal).not.toBeVisible();
  });

  test('Scenario F: Open Preview menu -> press Escape -> menu closes & focus returns to trigger', async ({ page }) => {
    const previewTrigger = page.locator('[data-preview-trigger]');
    await expect(previewTrigger).toBeVisible();
    await previewTrigger.click();

    const previewPlanItem = page.locator('[data-preview-plan], [data-preview-assessment]').first();
    await expect(previewPlanItem).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(previewPlanItem).not.toBeVisible();
    await expect(previewTrigger).toBeFocused();
  });
});
