const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3001';
const storageState = process.env.PERF_STORAGE_STATE ?? 'playwright/.auth/admin.json';
const samplesPerRoute = Number(process.env.PERF_SAMPLES ?? '20');
const outputPath = process.env.PERF_OUTPUT ?? path.join(process.cwd(), 'docs/performance/.phase2b-visual.json');

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function summarize(samples) {
  const metrics = ['ttfbMs', 'primaryVisibleMs', 'interactiveMs', 'skeletonVisibleMs', 'cls'];
  const summary = { sampleCount: samples.length };
  for (const metric of metrics) {
    const values = samples.map((sample) => sample[metric]).filter(Number.isFinite);
    summary[metric] = values.length === 0 ? null : Object.fromEntries(['min', 'p50', 'p95', 'max'].map((label, index) => [
      `${label}Ms`,
      Math.round((index === 0 ? Math.min(...values) : index === 1 ? percentile(values, 0.5) : index === 2 ? percentile(values, 0.95) : Math.max(...values)) * 100) / 100,
    ]));
  }
  summary.consoleEventCount = samples.reduce((total, sample) => total + sample.consoleEvents.length, 0);
  summary.shellRemountSignals = samples.filter((sample) => sample.shellRemovedAfterPresent).length;
  return summary;
}

async function installObserver(page) {
  await page.addInitScript(() => {
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    window.__phase2bVisual = { changes: [], cls: 0, shellSeen: false, shellRemovedAfterPresent: false };
    const observe = () => {
      const content = document.querySelector('[data-app-content]');
      const dashboardLoading = content?.querySelector('[data-dashboard-loading]');
      const skeleton = Boolean(dashboardLoading && isVisible(dashboardLoading))
        || [...(content?.querySelectorAll('.animate-pulse') ?? [])].some(isVisible);
      const shell = Boolean(document.querySelector('[data-app-shell]'));
      const state = window.__phase2bVisual;
      if (shell) state.shellSeen = true;
      if (state.shellSeen && !shell) state.shellRemovedAfterPresent = true;
      const previous = state.changes.at(-1);
      if (!previous || previous.skeleton !== skeleton || previous.shell !== shell) state.changes.push({ at: performance.now(), skeleton, shell });
    };
    const observer = new MutationObserver(observe);
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__phase2bVisual.cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
    window.addEventListener('DOMContentLoaded', observe, { once: true });
  });
}

async function runSample(browser, route) {
  const context = await browser.newContext({ storageState, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleEvents = [];
  let startedAt = 0;
  let ttfbMs = null;
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') consoleEvents.push({ type: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: String(error) }));
  page.on('response', (response) => {
    if (response.request().resourceType() === 'document' && ttfbMs === null) ttfbMs = performance.now() - startedAt;
  });
  await installObserver(page);
  try {
    startedAt = performance.now();
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'commit', timeout: 60_000 });
    const primary = page.locator('[data-app-content] h1').first();
    await primary.waitFor({ state: 'visible', timeout: 60_000 });
    const primaryVisibleMs = performance.now() - startedAt;
    await page.waitForFunction(() => {
      const content = document.querySelector('[data-app-content]');
      if (content?.querySelector('[data-dashboard-loading]')) return false;
      return ![...(content?.querySelectorAll('.animate-pulse') ?? [])].some((element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      });
    }, undefined, { timeout: 60_000 });
    const interactiveMs = performance.now() - startedAt;
    const observed = await page.evaluate(() => window.__phase2bVisual);
    const skeletonStart = observed.changes.find((change) => change.skeleton)?.at;
    const skeletonEnd = skeletonStart === undefined ? undefined : observed.changes.find((change) => change.at > skeletonStart && !change.skeleton)?.at;
    return {
      route,
      ttfbMs,
      primaryVisibleMs,
      interactiveMs,
      skeletonVisibleMs: skeletonStart !== undefined && skeletonEnd !== undefined ? skeletonEnd - skeletonStart : 0,
      cls: observed.cls,
      shellRemovedAfterPresent: observed.shellRemovedAfterPresent,
      changes: observed.changes,
      consoleEvents,
    };
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const routes = ['/', '/dashboard'];
    const matrix = [];
    for (const route of routes) {
      const samples = [];
      for (let index = 0; index < samplesPerRoute; index += 1) samples.push(await runSample(browser, route));
      matrix.push({ route, samples, summary: summarize(samples) });
    }
    const result = { baseUrl, samplesPerRoute, generatedAt: new Date().toISOString(), matrix };
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ outputPath, matrix: matrix.map(({ route, summary }) => ({ route, summary })) }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
