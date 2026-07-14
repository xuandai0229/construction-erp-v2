import { test, expect } from '@playwright/test';

test('Setup Auth', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'admin@construction.local');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  
  await page.context().storageState({ path: 'playwright/.auth/admin.json' });
});
