const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3001';
const storageState = process.env.PERF_STORAGE_STATE ?? 'playwright/.auth/admin.json';
const samplesPerCondition = Number(process.env.PERF_SAMPLES ?? '30');
const outputPath = process.env.PERF_OUTPUT ?? path.join(process.cwd(), 'docs/performance/.phase2b-tail-matrix.json');
const slowThresholdMs = Number(process.env.PERF_SLOW_THRESHOLD_MS ?? '500');
const selectedRoutePaths = process.env.PERF_ROUTE_PATHS?.split(',') ?? null;

const routes = [
  { route: '/projects', source: '/dashboard', selector: '[data-app-sidebar] a[href="/projects"]', destination: '/projects' },
  { route: '/documents', source: '/dashboard', selector: '[data-app-sidebar] a[href="/documents"]', destination: '/documents' },
  { route: '/hr', source: '/dashboard', selector: '[data-app-sidebar] a[href="/hr"]', destination: '/hr' },
  { route: '/materials', source: '/dashboard', selector: '[data-app-sidebar] a[href="/materials"]', destination: '/materials' },
  { route: '/settings', source: '/dashboard', selector: '[data-app-sidebar] a[href="/settings"]', destination: '/settings' },
  { route: '/approvals', source: '/dashboard', selector: '[data-app-sidebar] a[href="/approvals"]', destination: '/approvals' },
  { route: '/supervision/weekly', source: '/reports', selector: '[data-app-content] a[href="/reports/weekly-inspection"]', destination: '/reports/weekly-inspection' },
];

const conditions = [
  { name: 'fast-click', waitAfterSourceInteractiveMs: 200 },
  { name: 'normal-click', waitAfterSourceInteractiveMs: 1_000 },
  { name: 'prefetched-click', waitAfterSourceInteractiveMs: 1_500 },
];

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function summarize(samples) {
  const valid = samples.filter((sample) => !sample.error);
  const metrics = ['ttfbMs', 'primaryVisibleMs', 'interactiveMs', 'postFirstByteMs'];
  const summary = { sampleCount: samples.length, successCount: valid.length, slowSampleCount: valid.filter((sample) => sample.interactiveMs >= slowThresholdMs).length };
  for (const metric of metrics) {
    const values = valid.map((sample) => sample[metric]).filter(Number.isFinite).sort((left, right) => left - right);
    if (values.length === 0) {
      summary[metric] = null;
      continue;
    }
    const mean = values.reduce((total, value) => total + value, 0) / values.length;
    const variance = values.reduce((total, value) => total + ((value - mean) ** 2), 0) / values.length;
    summary[metric] = {
      minMs: Math.round(values[0] * 100) / 100,
      p50Ms: Math.round(percentile(values, 0.5) * 100) / 100,
      p75Ms: Math.round(percentile(values, 0.75) * 100) / 100,
      p90Ms: Math.round(percentile(values, 0.9) * 100) / 100,
      p95Ms: Math.round(percentile(values, 0.95) * 100) / 100,
      maxMs: Math.round(values.at(-1) * 100) / 100,
      standardDeviationMs: Math.round(Math.sqrt(variance) * 100) / 100,
    };
  }
  return summary;
}

async function installObserver(page) {
  await page.addInitScript(() => {
    window.__phase2bTail = { longTasks: [], layoutShift: 0, events: [] };
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') window.__phase2bTail.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
        if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) window.__phase2bTail.layoutShift += entry.value;
        if (entry.entryType === 'event') window.__phase2bTail.events.push({ name: entry.name, duration: entry.duration, startTime: entry.startTime });
      }
    });
    observer.observe({ entryTypes: ['longtask', 'layout-shift', 'event'] });
  });
}

async function waitForInteractive(page) {
  const primary = page.locator('[data-app-content] h1').first();
  await primary.waitFor({ state: 'visible', timeout: 60_000 });
  await page.waitForFunction(() => {
    const content = document.querySelector('[data-app-content]');
    if (content?.querySelector('[data-dashboard-loading]')) return false;
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    return ![...(content?.querySelectorAll('.animate-pulse') ?? [])].some(isVisible)
      && ![...document.querySelectorAll('[aria-busy="true"]')].some(isVisible);
  }, undefined, { timeout: 60_000 });
}

async function runSample(browser, config, condition) {
  const context = await browser.newContext({ storageState, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const responses = [];
  const consoleEvents = [];
  let clickStartedAt = 0;
  page.on('response', (response) => {
    const request = response.request();
    const isRsc = Boolean(request.headers().rsc) || response.url().includes('_rsc') || response.url().includes('?__rsc');
    if (request.resourceType() !== 'document' && !isRsc) return;
    responses.push({
      elapsedMs: Math.round((performance.now() - clickStartedAt) * 100) / 100,
      resourceType: request.resourceType(),
      isRsc,
      url: response.url(),
      status: response.status(),
      requestId: response.headers()['x-perf-request-id'] ?? null,
    });
  });
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') consoleEvents.push({ type: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: String(error) }));
  await installObserver(page);
  try {
    await page.goto(`${baseUrl}${config.source}`, { waitUntil: 'commit', timeout: 60_000 });
    await waitForInteractive(page);
    await page.waitForTimeout(condition.waitAfterSourceInteractiveMs);
    const link = page.locator(config.selector).first();
    await link.waitFor({ state: 'visible', timeout: 30_000 });
    const preClickRscResourceCount = await page.evaluate(() => performance.getEntriesByType('resource')
      .filter((entry) => entry.name.includes('_rsc') || entry.name.includes('?__rsc')).length);
    await page.evaluate(() => performance.clearResourceTimings());
    responses.length = 0;
    clickStartedAt = performance.now();
    await link.click();
    await page.waitForURL((url) => url.pathname === config.destination, { timeout: 60_000 });
    await page.locator('[data-app-content] h1').first().waitFor({ state: 'visible', timeout: 60_000 });
    const primaryVisibleMs = performance.now() - clickStartedAt;
    await waitForInteractive(page);
    const interactiveMs = performance.now() - clickStartedAt;
    const performanceData = await page.evaluate(() => ({
      observed: window.__phase2bTail,
      resources: performance.getEntriesByType('resource').map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        duration: entry.duration,
        transferSize: entry.transferSize,
      })).filter((entry) => entry.name.includes('_rsc') || entry.name.includes('?__rsc')),
    }));
    const firstRsc = responses.find((response) => response.isRsc);
    const ttfbMs = firstRsc?.elapsedMs ?? null;
    const sample = {
      route: config.route,
      condition: condition.name,
      destination: config.destination,
      ttfbMs,
      primaryVisibleMs,
      interactiveMs,
      postFirstByteMs: ttfbMs === null ? null : interactiveMs - ttfbMs,
      responseEvents: responses,
      rscRequestIds: responses.filter((response) => response.isRsc).map((response) => response.requestId).filter(Boolean),
      preClickRscResourceCount,
      rscResourceCount: performanceData.resources.length,
      rscResources: performanceData.resources,
      browserTrace: performanceData.observed,
      consoleEvents,
    };
    return sample;
  } catch (error) {
    return { route: config.route, condition: condition.name, error: String(error), responseEvents: responses, consoleEvents };
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const matrix = [];
    for (const config of routes.filter((route) => selectedRoutePaths === null || selectedRoutePaths.includes(route.route))) {
      for (const condition of conditions) {
        const samples = [];
        for (let index = 0; index < samplesPerCondition; index += 1) samples.push(await runSample(browser, config, condition));
        matrix.push({ route: config.route, condition: condition.name, samples, summary: summarize(samples) });
      }
    }
    const slowSamples = matrix.flatMap((entry) => entry.samples.filter((sample) => !sample.error && sample.interactiveMs >= slowThresholdMs));
    const result = { baseUrl, samplesPerCondition, slowThresholdMs, generatedAt: new Date().toISOString(), matrix, slowSamples };
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ outputPath, slowSampleCount: slowSamples.length, matrix: matrix.map(({ route, condition, summary }) => ({ route, condition, summary })) }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
