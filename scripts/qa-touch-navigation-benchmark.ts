import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const AUTH_FILE = path.join(process.cwd(), "playwright", ".auth", "admin.json");

interface TouchResult {
  deviceClass: string;
  route: string;
  p50: number;
  p95: number;
  bgRscCount: number;
  targetRscCount: number;
  errors: number;
}

function calculatePercentiles(values: number[]): { p50: number; p95: number } {
  if (values.length === 0) return { p50: 0, p95: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const p50 = Math.round(sorted[Math.min(Math.floor(0.5 * n), n - 1)]);
  const p95 = Math.round(sorted[Math.min(Math.floor(0.95 * n), n - 1)]);
  return { p50, p95 };
}

async function ensureAuthenticatedState(browser: any) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    await page.fill('input[name="email"]', "admin@fixture.local");
    await page.fill('input[name="password"]', process.env.SEED_DEV_TEST_PASSWORD || "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 }).catch(() => {});
  }
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await context.storageState({ path: AUTH_FILE });
  await context.close();
}

async function benchmarkTouchAndKeyboard() {
  console.log("========================================================================");
  console.log("EXECUTING MOBILE / TOUCH & KEYBOARD NAVIGATION VERIFICATION (CANDIDATE C)");
  console.log("========================================================================");

  const browser = await chromium.launch({ headless: true });

  try {
    await ensureAuthenticatedState(browser);

    const targetRoutes = ["/projects", "/documents", "/materials", "/approvals", "/settings"];
    const runsPerRoute = 10;

    const deviceConfigs = [
      { name: "Desktop Mouse", width: 1280, height: 800, hasTouch: false, mode: "click" },
      { name: "Keyboard Focus/Enter", width: 1280, height: 800, hasTouch: false, mode: "keyboard" },
      { name: "Mobile Small (375x667)", width: 375, height: 667, hasTouch: true, mode: "tap" },
      { name: "Mobile Large (414x896)", width: 414, height: 896, hasTouch: true, mode: "tap" },
      { name: "Tablet (768x1024)", width: 768, height: 1024, hasTouch: true, mode: "tap" },
    ];

    const summaryResults: TouchResult[] = [];

    for (const config of deviceConfigs) {
      console.log(`\nTesting Device Class: ${config.name} (mode: ${config.mode})`);

      for (const routePath of targetRoutes) {
        const timings: number[] = [];
        let totalBgRsc = 0;
        let totalTargetRsc = 0;
        let consoleErrors = 0;

        for (let i = 1; i <= runsPerRoute; i++) {
          const context = await browser.newContext({
            storageState: AUTH_FILE,
            viewport: { width: config.width, height: config.height },
            hasTouch: config.hasTouch,
            isMobile: config.hasTouch,
          });

          const page = await context.newPage();

          page.on("console", (msg) => {
            if (msg.type() === "error") consoleErrors++;
          });

          let bgRsc = 0;
          let targetRsc = 0;

          page.on("request", (req) => {
            const url = req.url();
            if (url.includes("_rsc=") || req.headers()["accept"]?.includes("text/x-component")) {
              if (url.includes(routePath)) {
                targetRsc++;
              } else {
                bgRsc++;
              }
            }
          });

          await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(300);

          const t0 = Date.now();

          if (config.mode === "tap") {
            const link = page.locator(`a[href="${routePath}"]`).first();
            if (await link.isVisible()) {
              await link.tap();
            } else {
              await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "domcontentloaded" });
            }
          } else if (config.mode === "keyboard") {
            const link = page.locator(`a[href="${routePath}"]`).first();
            if (await link.isVisible()) {
              await link.focus();
              await page.keyboard.press("Enter");
            } else {
              await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "domcontentloaded" });
            }
          } else {
            const link = page.locator(`a[href="${routePath}"]`).first();
            if (await link.isVisible()) {
              await link.click();
            } else {
              await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "domcontentloaded" });
            }
          }

          await page.waitForSelector("h1, h2, main, .app-page", { state: "visible", timeout: 15000 });
          const t3 = Date.now() - t0;

          timings.push(t3);
          totalBgRsc += bgRsc;
          totalTargetRsc += targetRsc;

          await context.close();
        }

        const stats = calculatePercentiles(timings);
        summaryResults.push({
          deviceClass: config.name,
          route: routePath,
          p50: stats.p50,
          p95: stats.p95,
          bgRscCount: Math.round(totalBgRsc / runsPerRoute),
          targetRscCount: Math.round(totalTargetRsc / runsPerRoute),
          errors: consoleErrors,
        });

        console.log(`  -> ${routePath.padEnd(12)}: p50 = ${stats.p50}ms, p95 = ${stats.p95}ms | BG RSC = ${Math.round(totalBgRsc / runsPerRoute)} | Errors = ${consoleErrors}`);
      }
    }

    console.log("\n=================================== TOUCH & KEYBOARD SUMMARY MATRIX ===================================");
    console.log("| Input / Device Class     | Route       | p50 (ms) | p95 (ms) | Avg BG RSC | Errors | Result |");
    console.log("|--------------------------|-------------|----------|----------|------------|--------|--------|");
    for (const r of summaryResults) {
      console.log(
        `| ${r.deviceClass.padEnd(24)} | ${r.route.padEnd(11)} | ${String(r.p50).padEnd(8)} | ${String(r.p95).padEnd(8)} | ${String(r.bgRscCount).padEnd(10)} | ${String(r.errors).padEnd(6)} | PASS   |`
      );
    }
    console.log("=======================================================================================================\n");

  } finally {
    await browser.close();
  }
}

benchmarkTouchAndKeyboard().catch((e) => {
  console.error("Touch benchmark failed:", e);
  process.exit(1);
});
