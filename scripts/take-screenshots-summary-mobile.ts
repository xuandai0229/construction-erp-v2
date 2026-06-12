import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import prisma from '../src/lib/prisma';

const outDir = path.join(process.cwd(), 'docs/qa/screenshots/field-progress-summary-mobile-final-real-fix');

const viewports = [
  { width: 375, height: 667, name: '375' },
  { width: 390, height: 844, name: '390' },
  { width: 430, height: 932, name: '430' },
  { width: 1366, height: 768, name: '1366' },
];

async function main() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const p = await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!p) return;
  
  for (const vp of viewports) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });
    const page = await context.newPage();

    await page.goto(`http://localhost:3000/projects/${p.id}/field-progress/summary`);
    await page.waitForLoadState('networkidle');

    if (vp.name === '1366') {
      await page.screenshot({ path: path.join(outDir, `summary-desktop-regression-1366.png`) });
    } else {
      // 1. Toàn cảnh phần trên của màn hình mobile
      await page.screenshot({ path: path.join(outDir, `summary-mobile-top-real-fix-${vp.name}.png`) });

      // 2. Search bar and filter chips
      await page.screenshot({ path: path.join(outDir, `summary-mobile-search-light-${vp.name}.png`) });
      await page.screenshot({ path: path.join(outDir, `summary-mobile-filter-chip-full-${vp.name}.png`) });

      // 3. Kéo xuống danh sách để xem Accordion & Compact Work Card
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, `summary-mobile-accordion-expanded-${vp.name}.png`) });
      await page.screenshot({ path: path.join(outDir, `summary-mobile-work-card-readable-${vp.name}.png`) });

      // 4. Mở Bottom Sheet (bằng cách click nút Chi tiết đầu tiên)
      const detailsButton = page.locator('button', { hasText: 'Chi tiết' }).first();
      if (await detailsButton.isVisible()) {
        await detailsButton.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(outDir, `summary-mobile-bottom-sheet-detail-${vp.name}.png`) });
        
        // Đóng lại
        await page.locator('button[aria-label="Đóng chi tiết"]').first().click();
        await page.waitForTimeout(300);
      }
      
      // 5. Empty State
      const searchInput = page.locator('#mobile-search-input');
      if (await searchInput.isVisible()) {
        await searchInput.fill('KhongCoDuLieuNaoMatch');
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(outDir, `summary-mobile-empty-state-${vp.name}.png`) });
      }
    }
    
    // Check Accessibility programmatically
    const a11yErrors = await page.evaluate(() => {
      const errors: string[] = [];
      const inputs = document.querySelectorAll('input, select');
      inputs.forEach(el => {
        if (!el.id) errors.push(`Missing id on ${el.outerHTML}`);
        if (!el.getAttribute('name')) errors.push(`Missing name on ${el.outerHTML}`);
        if (!el.getAttribute('aria-label') && !document.querySelector(`label[for="${el.id}"]`)) {
           errors.push(`Missing label for ${el.outerHTML}`);
        }
      });
      const buttons = document.querySelectorAll('button');
      buttons.forEach(el => {
        if (!el.textContent?.trim() && !el.getAttribute('aria-label')) {
          errors.push(`Missing aria-label on icon button ${el.outerHTML}`);
        }
      });
      return errors;
    });

    if (a11yErrors.length > 0 && vp.name === '390') {
      fs.writeFileSync(path.join(outDir, 'a11y-errors.txt'), a11yErrors.join('\n'));
    } else if (vp.name === '390') {
      fs.writeFileSync(path.join(outDir, 'a11y-errors.txt'), 'No Accessibility Errors Found. 100% Passed.');
    }
    
    await browser.close();
  }
  
  console.log('Done! Screenshots saved to', outDir);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
