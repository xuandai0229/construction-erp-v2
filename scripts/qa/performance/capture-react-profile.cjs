const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3002';
const storageState = process.env.PERF_STORAGE_STATE ?? 'playwright/.auth/admin.json';
const outputPath = path.join(process.cwd(), 'docs/performance/.phase2a1-react-profile.json');

async function waitForStable(page) {
  await page.locator('[data-app-content] h1').first().waitFor({ state: 'visible', timeout: 60_000 });
  await page.waitForFunction(() => ![...(document.querySelector('[data-app-content]')?.querySelectorAll('.animate-pulse') ?? [])].some((element) => {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }), undefined, { timeout: 60_000 });
}

async function samples(page) {
  return page.evaluate(() => window.__perfReactRenderSamples__ ?? []);
}

function summarize(entries) {
  const byId = {};
  for (const entry of entries) {
    const item = (byId[entry.id] ??= { commits: 0, mounts: 0, updates: 0, actualDurationMs: 0, maxActualDurationMs: 0 });
    item.commits += 1;
    item.mounts += entry.phase === 'mount' ? 1 : 0;
    item.updates += entry.phase === 'mount' ? 0 : 1;
    item.actualDurationMs += entry.actualDuration;
    item.maxActualDurationMs = Math.max(item.maxActualDurationMs, entry.actualDuration);
  }
  for (const item of Object.values(byId)) {
    item.actualDurationMs = Math.round(item.actualDurationMs * 100) / 100;
    item.maxActualDurationMs = Math.round(item.maxActualDurationMs * 100) / 100;
  }
  return byId;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'commit', timeout: 60_000 });
    await waitForStable(page);
    const dashboard = await samples(page);
    await page.evaluate(() => { window.__perfReactRenderSamples__ = []; });
    await page.locator('[data-app-sidebar] a[href="/projects"]').click();
    await page.waitForURL((url) => url.pathname === '/projects', { timeout: 60_000 });
    await waitForStable(page);
    const sidebarNavigation = await samples(page);
    const output = {
      baseUrl,
      dashboard: { entries: dashboard, summary: summarize(dashboard) },
      sidebarNavigation: { entries: sidebarNavigation, summary: summarize(sidebarNavigation) },
    };
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    console.log(JSON.stringify(output, null, 2));
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
