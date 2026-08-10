const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3001';
const storageState = process.env.PERF_STORAGE_STATE ?? 'playwright/.auth/admin.json';
const outputDir = process.env.PERF_OUTPUT_DIR ?? path.join(process.cwd(), 'docs/performance/.phase2a1-flicker');
const framesDir = path.join(outputDir, 'frames');
const videoDir = path.join(outputDir, 'video');

fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState,
    recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const startedAt = performance.now();
  const documentEvents = [];
  const frameNavigations = [];
  const consoleEvents = [];

  await page.addInitScript(() => {
    window.__flickerTimeline = [];
    const started = performance.now();
    const snapshot = () => {
      const shell = document.querySelector('[data-app-shell]');
      const main = document.querySelector('[data-app-content]');
      const heading = main?.querySelector('h1');
      const visible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      window.__flickerTimeline.push({
        atMs: Math.round((performance.now() - started) * 10) / 10,
        shell: visible(shell),
        heading: visible(heading),
        skeleton: Boolean(main?.querySelector('[data-dashboard-loading]'))
          || [...(main?.querySelectorAll('.animate-pulse') ?? [])].some(visible),
        location: location.pathname,
      });
    };
    new MutationObserver(snapshot).observe(document, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', snapshot, { once: true });
  });

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) frameNavigations.push({ atMs: Math.round((performance.now() - startedAt) * 10) / 10, url: frame.url() });
  });
  page.on('response', (response) => {
    if (response.request().resourceType() !== 'document') return;
    documentEvents.push({
      atMs: Math.round((performance.now() - startedAt) * 10) / 10,
      url: response.url(),
      status: response.status(),
      requestId: response.headers()['x-perf-request-id'] ?? null,
    });
  });
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') consoleEvents.push({ type: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => consoleEvents.push({ type: 'pageerror', text: String(error) }));

  let recording = true;
  const frameTimes = [];
  const captureFrames = (async () => {
    let index = 0;
    while (recording && index < 40) {
      const atMs = Math.round((performance.now() - startedAt) * 10) / 10;
      const framePath = path.join(framesDir, `frame-${String(index).padStart(2, '0')}-${Math.round(atMs)}ms.png`);
      await page.screenshot({ path: framePath });
      frameTimes.push({ index, atMs, framePath });
      index += 1;
      await page.waitForTimeout(50);
    }
  })();

  await page.goto(`${baseUrl}/`, { waitUntil: 'commit', timeout: 60_000 });
  await page.locator('[data-app-content] h1').first().waitFor({ state: 'visible', timeout: 60_000 });
  await page.waitForFunction(() => {
    const content = document.querySelector('[data-app-content]');
    return Boolean(content?.querySelector('h1'))
      && !content?.querySelector('[data-dashboard-loading]')
      && ![...(content?.querySelectorAll('.animate-pulse') ?? [])].some((element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
  }, undefined, { timeout: 60_000 });
  const stableAtMs = Math.round((performance.now() - startedAt) * 10) / 10;
  await page.waitForTimeout(300);
  recording = false;
  await captureFrames;
  const domTimeline = await page.evaluate(() => window.__flickerTimeline ?? []);
  const videoPath = await page.video().path();

  await context.close();
  await browser.close();

  const result = { baseUrl, stableAtMs, frameNavigations, documentEvents, domTimeline, frameTimes, videoPath, consoleEvents };
  fs.writeFileSync(path.join(outputDir, 'timeline.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
