import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import prisma from '../src/lib/prisma';

const outDir = path.join(process.cwd(), 'docs/qa/screenshots/field-progress-summary-desktop-laptop-polish');

const viewports = [
  { width: 1366, height: 768, name: '1366' },
  { width: 1440, height: 900, name: '1440' },
  { width: 1536, height: 864, name: '1536' },
  { width: 1920, height: 1080, name: '1920' },
  { width: 390, height: 844, name: '390' },
];

async function main() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const p = await prisma.project.findFirst({ where: { deletedAt: null } });
  if (!p) {
    console.log('No project found');
    return;
  }

  for (const vp of viewports) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });
    const page = await context.newPage();

    await page.goto(`http://localhost:3000/projects/${p.id}/field-progress/summary`);
    await page.waitForLoadState('networkidle');

    if (vp.name === '390') {
      // Mobile regression check
      await page.screenshot({ path: path.join(outDir, `summary-mobile-regression-390.png`) });
    } else {
      // 1. Top of page
      await page.screenshot({ path: path.join(outDir, `summary-desktop-top-${vp.name}.png`) });

      // 2. Scroll down to see table body
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, `summary-desktop-table-${vp.name}.png`) });

      // 3. Try clicking "Xem chi tiết theo ngày" toggle if at 1366
      if (vp.name === '1366') {
        const toggleBtn = page.locator('button[aria-label="Xem bảng chi tiết theo ngày"]').first();
        if (await toggleBtn.isVisible()) {
          await toggleBtn.click();
          await page.waitForTimeout(300);

          // scroll right to see day columns
          const tableWrapper = page.locator('.overflow-x-auto').first();
          if (await tableWrapper.isVisible()) {
            await tableWrapper.evaluate(el => el.scrollLeft = 500);
            await page.waitForTimeout(200);
          }
          await page.screenshot({ path: path.join(outDir, `summary-desktop-table-scrolled-${vp.name}.png`) });

          // toggle back off
          const hideBtn = page.locator('button[aria-label="Ẩn cột ngày phát sinh"]').first();
          if (await hideBtn.isVisible()) {
            await hideBtn.click();
            await page.waitForTimeout(200);
          }
        }

        // 4. Click "Xem" detail button (use aria-label to avoid ambiguity)
        await page.evaluate(() => window.scrollTo(0, 300));
        await page.waitForTimeout(200);
        const detailBtn = page.locator('button[aria-label^="Xem chi tiết công việc"]').first();
        if (await detailBtn.isVisible()) {
          await detailBtn.click();
          await page.waitForTimeout(400);
          await page.screenshot({ path: path.join(outDir, `summary-detail-drawer-${vp.name}.png`) });

          // close it
          const closeBtn = page.locator('button[aria-label="Đóng chi tiết"]').first();
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(200);
          }
        }
      }
    }

    // A11y audit
    if (vp.name === '1366') {
      const a11yErrors = await page.evaluate(() => {
        const errors: string[] = [];
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(el => {
          if (!el.id) errors.push(`Missing id on <${el.tagName.toLowerCase()} name="${el.getAttribute('name')}">`);
          if (!el.getAttribute('name')) errors.push(`Missing name on #${el.id}`);
          if (!el.getAttribute('aria-label') && !document.querySelector(`label[for="${el.id}"]`)) {
            errors.push(`Missing label for #${el.id}`);
          }
        });
        return errors;
      });

      fs.writeFileSync(
        path.join(outDir, 'a11y-audit-desktop.txt'),
        a11yErrors.length === 0
          ? 'No Accessibility Errors Found (Desktop). 100% Passed.'
          : a11yErrors.join('\n')
      );
    }

    await browser.close();
  }

  console.log('Done! Screenshots saved to', outDir);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
