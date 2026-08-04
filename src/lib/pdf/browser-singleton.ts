import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

interface GlobalPlaywrightStore {
  browserInstance: Browser | null;
  launchPromise: Promise<Browser> | null;
  activeRenderCount: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __playwrightGlobalStore: GlobalPlaywrightStore | undefined;
}

const store: GlobalPlaywrightStore = globalThis.__playwrightGlobalStore || {
  browserInstance: null,
  launchPromise: null,
  activeRenderCount: 0,
};

if (process.env.NODE_ENV !== "production") {
  globalThis.__playwrightGlobalStore = store;
}

const MAX_CONCURRENT_PDF_RENDERS = 3;
const ACQUIRE_TIMEOUT_MS = 15000;

class RenderQueue {
  private queue: (() => void)[] = [];

  async acquire(): Promise<void> {
    if (store.activeRenderCount < MAX_CONCURRENT_PDF_RENDERS) {
      store.activeRenderCount++;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.queue.indexOf(grant);
        if (idx !== -1) this.queue.splice(idx, 1);
        reject(new Error("Hết thời gian hàng chờ tạo PDF (Acquire Timeout)."));
      }, ACQUIRE_TIMEOUT_MS);

      const grant = () => {
        clearTimeout(timeout);
        store.activeRenderCount++;
        resolve();
      };

      this.queue.push(grant);
    });
  }

  release(): void {
    store.activeRenderCount = Math.max(0, store.activeRenderCount - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

export const pdfRenderQueue = new RenderQueue();

export async function getSharedBrowser(): Promise<Browser> {
  if (store.browserInstance && store.browserInstance.isConnected()) {
    return store.browserInstance;
  }

  if (store.launchPromise) {
    return store.launchPromise;
  }

  store.launchPromise = (async () => {
    try {
      console.log("[Playwright Singleton] Launching persistent Chromium instance...");
      const browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--font-render-hinting=medium",
        ],
      });

      store.browserInstance = browser;

      browser.once("disconnected", () => {
        console.warn("[Playwright Singleton] Shared Chromium instance disconnected. Resetting instance.");
        store.browserInstance = null;
        store.launchPromise = null;
      });

      return browser;
    } finally {
      store.launchPromise = null;
    }
  })();

  return store.launchPromise;
}

export async function executeInPdfPage<T>(
  task: (page: Page, context: BrowserContext) => Promise<T>
): Promise<T> {
  await pdfRenderQueue.acquire();

  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const browser = await getSharedBrowser();
    context = await browser.newContext({
      viewport: { width: 1600, height: 1200 },
      deviceScaleFactor: 1,
    });

    page = await context.newPage();
    return await task(page, context);
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    pdfRenderQueue.release();
  }
}

export function getBrowserMetrics() {
  return {
    isConnected: store.browserInstance?.isConnected() ?? false,
    activeRenderCount: store.activeRenderCount,
  };
}
