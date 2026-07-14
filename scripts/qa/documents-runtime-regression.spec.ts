import { test, expect } from '@playwright/test';

test.describe('Documents Runtime Regression', () => {
  test('Route should return HTTP 200 and not crash into Error Boundary', async ({ page }) => {
    // 0. Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123'); // assuming this is a dummy test environment password
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 1. Go to projects list to find a project ID
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    
    // Find a valid project link
    const projectLink = page.locator('a[href^="/projects/"]').first();
    const href = await projectLink.getAttribute('href');
    if (!href) throw new Error("No project found");
    const projectId = href.split('/').pop();
    
    // 2. Navigate to documents route
    console.log(`Navigating to /documents/${projectId}...`);
    const response = await page.goto(`/documents/${projectId}`);
    
    // Check HTTP status
    expect(response?.status()).toBe(200);
    
    // Check for Error Boundary "Đã xảy ra lỗi khi tải dữ liệu"
    const errorText = await page.locator('text="Đã xảy ra lỗi khi tải dữ liệu"').count();
    const referenceText = await page.locator('text="ERR-PAGE-UNAVAILABLE"').count();
    
    if (errorText > 0 || referenceText > 0) {
      console.error("PAGE CRASHED INTO ERROR BOUNDARY!");
      
      // Let's print out browser console logs if we can capture them? 
      // Playwright can capture console, but we'll see it if it failed.
      throw new Error("Documents route crashed into Error Boundary (ERR-PAGE-UNAVAILABLE)");
    }
    
    // Check that primary content is there
    const header = page.locator('h1', { hasText: 'Tài liệu công trình' });
    await expect(header).toBeVisible({ timeout: 5000 });
    
    console.log("Documents route loaded successfully.");
  });
});
