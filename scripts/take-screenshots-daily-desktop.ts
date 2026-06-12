import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import prisma from '../src/lib/prisma';

const outDir = path.join(process.cwd(), 'docs/qa/screenshots/field-progress-daily-desktop-laptop-responsive-polish');

const viewports = [
  { width: 1366, height: 768, name: '1366' },
  { width: 1440, height: 900, name: '1440' },
  { width: 1536, height: 864, name: '1536' },
  { width: 1920, height: 1080, name: '1920' },
];

async function main() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const p = await prisma.project.findFirst({ where: { deletedAt: null } });
  
  for (const vp of viewports) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });
    const page = await context.newPage();

    if (p) {
      await page.goto(`http://localhost:3000/projects/${p.id}/field-progress/daily`);
      await page.waitForLoadState('networkidle');

      // 1. Toàn cảnh phần trên của màn + Card Lịch + Card Danh sách công việc
      await page.screenshot({ path: path.join(outDir, `daily-desktop-top-cards-${vp.name}.png`) });

      // 2. Bảng ở trạng thái bình thường (cuộn xuống table một chút)
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, `daily-desktop-table-normal-${vp.name}.png`) });

      // 4. Bảng khi cuộn ngang sang phải
      const tableWrapper = page.locator('.overflow-x-auto').first();
      if (await tableWrapper.isVisible()) {
        await tableWrapper.evaluate(e => { e.scrollLeft = e.scrollWidth; });
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(outDir, `daily-desktop-table-scrolled-right-${vp.name}.png`) });
        await tableWrapper.evaluate(e => { e.scrollLeft = 0; });
      }

      // 5. Trạng thái nút lưu khi có thay đổi + Dòng có cảnh báo vượt khối lượng
      const inputs = page.locator('table input[inputmode="decimal"]');
      if (await inputs.count() > 0) {
        await inputs.nth(0).fill('9999999');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
      
      await page.screenshot({ path: path.join(outDir, `daily-desktop-table-over-volume-and-save-${vp.name}.png`) });
    }
    
    await browser.close();
  }
  
  console.log('Done! Screenshots saved to', outDir);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
