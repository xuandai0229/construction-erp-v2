const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3001';
const storageState = process.env.PERF_STORAGE_STATE ?? 'playwright/.auth/admin.json';
const outputPath = path.join(process.cwd(), 'docs/performance/.phase2a1-chrome-trace-summary.json');

async function waitForStable(page) {
  await page.locator('[data-app-content] h1').first().waitFor({ state: 'visible', timeout: 60_000 });
  await page.waitForFunction(() => ![...(document.querySelector('[data-app-content]')?.querySelectorAll('.animate-pulse') ?? [])].some((element) => {
    if (!(element instanceof HTMLElement)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }), undefined, { timeout: 60_000 });
}

function summarizeTrace(trace) {
  const interesting = new Set(['RunTask', 'FunctionCall', 'EvaluateScript', 'UpdateLayoutTree', 'Layout', 'Paint', 'CompositeLayers']);
  const totals = {};
  const longTasks = [];
  for (const event of trace.traceEvents ?? []) {
    if (event.ph !== 'X' || !interesting.has(event.name) || typeof event.dur !== 'number') continue;
    const durationMs = event.dur / 1000;
    totals[event.name] = (totals[event.name] ?? 0) + durationMs;
    if (event.name === 'RunTask' && durationMs > 50) longTasks.push(durationMs);
  }
  return {
    totalsMs: Object.fromEntries(Object.entries(totals).map(([name, value]) => [name, Math.round(value * 100) / 100])),
    longTaskCount: longTasks.length,
    longestRunTaskMs: longTasks.length ? Math.round(Math.max(...longTasks) * 100) / 100 : 0,
  };
}

async function captureFlow(browser, name, perform) {
  const context = await browser.newContext({ storageState, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const chunks = [];
  const completed = new Promise((resolve) => cdp.on('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing,loading', transferMode: 'ReturnAsStream' });
  const startedAt = performance.now();
  const flowMetrics = (await perform(page)) ?? {};
  const stableMs = performance.now() - startedAt;
  await cdp.send('Tracing.end');
  const { stream } = await completed;
  while (true) {
    const chunk = await cdp.send('IO.read', { handle: stream });
    chunks.push(chunk.data);
    if (chunk.eof) break;
  }
  await cdp.send('IO.close', { handle: stream });
  await context.close();
  return {
    name,
    stableMs: Math.round(stableMs * 100) / 100,
    ...flowMetrics,
    ...summarizeTrace(JSON.parse(chunks.join(''))),
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const dashboard = await captureFlow(browser, 'dashboard-direct-cold', async (page) => {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'commit', timeout: 60_000 });
      await waitForStable(page);
    });
    const projects = await captureFlow(browser, 'projects-sidebar-click', async (page) => {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'commit', timeout: 60_000 });
      await waitForStable(page);
      const startedAt = performance.now();
      await page.locator('[data-app-sidebar] a[href="/projects"]').click();
      await waitForStable(page);
      return { clickToStableMs: Math.round((performance.now() - startedAt) * 100) / 100 };
    });
    fs.writeFileSync(outputPath, `${JSON.stringify({ baseUrl, dashboard, projects }, null, 2)}\n`);
    console.log(JSON.stringify({ baseUrl, dashboard, projects }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
