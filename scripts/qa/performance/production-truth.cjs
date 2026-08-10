const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3001';
const storageState = process.env.PERF_STORAGE_STATE ?? 'playwright/.auth/admin.json';
const samplesPerCondition = Number(process.env.PERF_SAMPLES ?? '10');
const selectedModes = (process.env.PERF_MODES ?? 'direct-cold,shell-warm,prefetched-click').split(',');
const selectedRouteKeys = process.env.PERF_ROUTE_KEYS?.split(',') ?? null;
const outputPath = process.env.PERF_OUTPUT ?? path.join(
  process.cwd(),
  'docs/performance/.phase2a1-production-ux.json',
);

const routes = [
  { key: 'root', path: '/', clickPath: null },
  { key: 'dashboard', path: '/dashboard', clickPath: '/dashboard' },
  { key: 'projects', path: '/projects', clickPath: '/projects' },
  { key: 'documents', path: '/documents', clickPath: '/documents' },
  { key: 'reports', path: '/reports', clickPath: '/reports' },
  { key: 'hr', path: '/hr', clickPath: '/hr' },
  { key: 'materials', path: '/materials', clickPath: '/materials' },
  { key: 'approvals', path: '/approvals', clickPath: '/approvals' },
  { key: 'settings', path: '/settings', clickPath: '/settings' },
  // The public compatibility path redirects to this UI route. The click is made
  // from the report workspace card rather than inventing a non-existent sidebar link.
  { key: 'supervision-weekly', path: '/supervision/weekly', clickPath: '/reports/weekly-inspection', clickSource: '/reports' },
];

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function summarize(samples) {
  const valid = samples.filter((sample) => !sample.error);
  const metrics = ['ttfbMs', 'primaryVisibleMs', 'interactiveMs', 'networkIdleMs'];
  const result = { sampleCount: samples.length, successCount: valid.length };

  for (const metric of metrics) {
    const values = valid.map((sample) => sample[metric]).filter((value) => Number.isFinite(value));
    result[metric] = values.length === 0 ? null : {
      minMs: Math.round(Math.min(...values) * 100) / 100,
      p50Ms: Math.round(percentile(values, 0.5) * 100) / 100,
      p95Ms: Math.round(percentile(values, 0.95) * 100) / 100,
      maxMs: Math.round(Math.max(...values) * 100) / 100,
    };
  }

  return result;
}

async function installWebVitalsObserver(page) {
  await page.addInitScript(() => {
    window.__performanceTruth = { longTasks: [], lcp: [], cls: 0, events: [] };
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') window.__performanceTruth.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
        if (entry.entryType === 'largest-contentful-paint') window.__performanceTruth.lcp.push({ startTime: entry.startTime, size: entry.size });
        if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) window.__performanceTruth.cls += entry.value;
        if (entry.entryType === 'event') window.__performanceTruth.events.push({ name: entry.name, startTime: entry.startTime, duration: entry.duration });
      }
    });
    observer.observe({ entryTypes: ['longtask', 'largest-contentful-paint', 'layout-shift', 'event'] });
  });
}

async function waitForInteractive(page, startedAt) {
  const primary = page.locator('[data-app-content] h1').first();
  await primary.waitFor({ state: 'visible', timeout: 60_000 });
  const primaryVisibleMs = performance.now() - startedAt;
  await page.waitForFunction(() => {
    const isElementVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const content = document.querySelector('[data-app-content]');
    const heading = content?.querySelector('h1');
    const hasVisibleSkeleton = [...(content?.querySelectorAll('.animate-pulse') ?? [])].some(isElementVisible);
    const hasVisibleBusy = [...document.querySelectorAll('[aria-busy="true"]')].some(isElementVisible);
    return Boolean(heading && isElementVisible(heading) && !hasVisibleSkeleton && !hasVisibleBusy);
  }, undefined, { timeout: 60_000 });
  return { primaryVisibleMs, interactiveMs: performance.now() - startedAt };
}

async function collectTiming(page, startedAt, responseEvents) {
  const networkIdleStartedAt = performance.now();
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);
  const networkIdleMs = performance.now() - startedAt;
  const resourceTiming = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => ({
    name: entry.name,
    initiatorType: entry.initiatorType,
    duration: entry.duration,
  })).filter((entry) => entry.name.includes('_rsc') || entry.name.includes('?__rsc') || entry.name.includes('?_rsc')));
  const navigationTiming = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0];
    return entry ? {
      type: entry.type,
      redirectCount: entry.redirectCount,
      redirectStart: entry.redirectStart,
      redirectEnd: entry.redirectEnd,
      responseStart: entry.responseStart,
      responseEnd: entry.responseEnd,
      domContentLoadedEventEnd: entry.domContentLoadedEventEnd,
      loadEventEnd: entry.loadEventEnd,
    } : null;
  });
  const webVitals = await page.evaluate(() => window.__performanceTruth ?? null);
  const documentEvents = responseEvents.filter((event) => event.resourceType === 'document');
  const ttfbEvent = documentEvents.at(0) ?? responseEvents.find((event) => event.isRscRequest);

  return {
    ttfbMs: ttfbEvent?.elapsedMs ?? null,
    networkIdleMs,
    navigationTiming,
    documentEvents,
    rscResourceCount: resourceTiming.length,
    webVitals,
    waitedForNetworkIdleMs: performance.now() - networkIdleStartedAt,
  };
}

async function runNavigation(context, route, mode) {
  const page = await context.newPage();
  const responseEvents = [];
  const consoleEvents = [];
  let startedAt = 0;

  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') consoleEvents.push({ type: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: String(error) }));
  page.on('response', async (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    const isRscRequest = Boolean(request.headers().rsc);
    if (resourceType !== 'document' && !isRscRequest && !response.url().includes('_rsc') && !response.url().includes('?__rsc') && !response.url().includes('?_rsc')) return;
    responseEvents.push({
      elapsedMs: Math.round((performance.now() - startedAt) * 100) / 100,
      url: response.url(),
      status: response.status(),
      resourceType,
      isRscRequest,
      requestId: response.headers()['x-perf-request-id'] ?? null,
    });
  });
  await installWebVitalsObserver(page);

  try {
    if (mode === 'direct-cold') {
      startedAt = performance.now();
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'commit', timeout: 60_000 });
    } else if (mode === 'shell-warm') {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'commit', timeout: 60_000 });
      await waitForInteractive(page, performance.now());
      responseEvents.length = 0;
      startedAt = performance.now();
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'commit', timeout: 60_000 });
    } else {
      const clickSource = route.clickSource ?? '/dashboard';
      await page.goto(`${baseUrl}${clickSource}`, { waitUntil: 'commit', timeout: 60_000 });
      await waitForInteractive(page, performance.now());
      await page.waitForTimeout(1_500);
      const sidebarLink = page.locator(`[data-app-sidebar] a[href="${route.clickPath}"]`).first();
      const link = await sidebarLink.count() > 0
        ? sidebarLink
        : page.locator(`[data-app-content] a[href="${route.clickPath}"]`).first();
      await link.waitFor({ state: 'visible', timeout: 30_000 });
      responseEvents.length = 0;
      startedAt = performance.now();
      await link.click();
      await page.waitForURL((url) => url.pathname === route.clickPath, { timeout: 60_000 });
    }

    const ui = await waitForInteractive(page, startedAt);
    const timing = await collectTiming(page, startedAt, responseEvents);
    return {
      route: route.path,
      mode,
      finalPath: new URL(page.url()).pathname,
      ...ui,
      ...timing,
      consoleEvents,
    };
  } catch (error) {
    return { route: route.path, mode, error: String(error), consoleEvents, documentEvents: responseEvents };
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const matrix = [];
  const modes = selectedModes;

  try {
    for (const route of routes) {
      if (selectedRouteKeys && !selectedRouteKeys.includes(route.key)) continue;
      for (const mode of modes) {
        if (mode === 'prefetched-click' && !route.clickPath) {
          matrix.push({ route: route.path, mode, status: 'not-applicable', reason: 'No UI control navigates to the root entry route.' });
          continue;
        }
        if (mode === 'prefetched-click' && route.clickPath === '/dashboard') {
          matrix.push({ route: route.path, mode, status: 'not-applicable', reason: 'The current page already is /dashboard.' });
          continue;
        }
        const samples = [];
        for (let index = 0; index < samplesPerCondition; index += 1) {
          const context = await browser.newContext({ storageState });
          samples.push(await runNavigation(context, route, mode));
          await context.close();
        }
        matrix.push({ route: route.path, mode, status: 'complete', samples, summary: summarize(samples) });
      }
    }
  } finally {
    await browser.close();
  }

  const result = {
    baseUrl,
    samplesPerCondition,
    generatedAt: new Date().toISOString(),
    matrix,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, matrix: matrix.map(({ route, mode, status, summary }) => ({ route, mode, status, summary })) }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
