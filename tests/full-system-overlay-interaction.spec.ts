import { test, expect } from '@playwright/test';

test.describe('Full System Overlay Interaction & Single-Active Policy Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to /users page
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
  });

  test('Enforces Single Active Non-Modal Overlay contract between popover and action menu', async ({ page }) => {
    // 1. Locate "+N công trình khác" popover trigger if present or open action menu
    const popoverTrigger = page.locator('[data-projects-popover] button').first();
    const actionMenuTriggers = page.locator('[data-action-menu] button');

    if (await popoverTrigger.isVisible()) {
      // Click popover trigger
      await popoverTrigger.click();
      const popoverPanel = page.locator('[data-projects-popover] .z-30').first();
      await expect(popoverPanel).toBeVisible();

      // Now click an action menu trigger on another row
      await actionMenuTriggers.first().click();

      // Verify that popover closed and action menu opened
      await expect(popoverPanel).not.toBeVisible();
      const actionMenuPanel = page.locator('[data-action-menu] .z-30').first();
      await expect(actionMenuPanel).toBeVisible();
    }
  });

  test('Switching between row action menus closes the previous menu in 1 single click', async ({ page }) => {
    const actionMenuTriggers = page.locator('[data-action-menu] button');
    const triggerCount = await actionMenuTriggers.count();

    if (triggerCount >= 2) {
      // Click first action menu
      await actionMenuTriggers.nth(0).click();
      const firstMenu = page.locator('[data-action-menu] .z-30').first();
      await expect(firstMenu).toBeVisible();

      // Click second action menu trigger directly
      await actionMenuTriggers.nth(1).click();

      // First menu must be closed, second menu must be visible
      await expect(firstMenu).not.toBeVisible();
      const openMenus = page.locator('[data-action-menu] .z-30');
      await expect(openMenus).toHaveCount(1);
    }
  });

  test('Clicking outside closes active non-modal overlay without event swallowing', async ({ page }) => {
    const actionMenuTriggers = page.locator('[data-action-menu] button');
    if (await actionMenuTriggers.first().isVisible()) {
      await actionMenuTriggers.first().click();
      const menu = page.locator('[data-action-menu] .z-30').first();
      await expect(menu).toBeVisible();

      // Click on table header (outside area)
      await page.locator('th').first().click({ force: true });
      await expect(menu).not.toBeVisible();
    }
  });

  test('Pressing Escape closes active non-modal overlay', async ({ page }) => {
    const actionMenuTriggers = page.locator('[data-action-menu] button');
    if (await actionMenuTriggers.first().isVisible()) {
      await actionMenuTriggers.first().click();
      const menu = page.locator('[data-action-menu] .z-30').first();
      await expect(menu).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');
      await expect(menu).not.toBeVisible();
    }
  });

  test('Bottom row menus flip upwards (bottom-full) to prevent clipping', async ({ page }) => {
    const actionMenuPanels = page.locator('[data-action-menu]');
    const count = await actionMenuPanels.count();

    if (count > 0) {
      const lastTrigger = page.locator('[data-action-menu] button').last();
      await lastTrigger.click();

      const lastMenuPanel = page.locator('[data-action-menu] .z-30').last();
      await expect(lastMenuPanel).toBeVisible();

      // Verify class contains bottom-full
      const classAttr = await lastMenuPanel.getAttribute('class');
      expect(classAttr).toContain('bottom-full');
    }
  });
});
