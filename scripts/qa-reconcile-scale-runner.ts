import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const AUTH_FILE = path.join(process.cwd(), "playwright", ".auth", "admin.json");

export interface ReconcileResult {
  conditionLabel: string;
  concurrency: number;
  route: string;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  max: number;
  ttfbP95: number;
  throughput: number;
  errorRate: number;
}

function calcStats(values: number[]) {
  if (values.length === 0) return { p50: 0, p75: 0, p90: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return {
    p50: Math.round(sorted[Math.min(Math.floor(0.5 * n), n - 1)]),
    p75: Math.round(sorted[Math.min(Math.floor(0.75 * n), n - 1)]),
    p90: Math.round(sorted[Math.min(Math.floor(0.9 * n), n - 1)]),
    p95: Math.round(sorted[Math.min(Math.floor(0.95 * n), n - 1)]),
    max: Math.round(sorted[n - 1]),
  };
}

export async function runConditionBenchmark(
  conditionLabel: string,
  concurrencyLevels: number[] = [1, 5, 10, 25],
  routePath: string = "/dashboard"
): Promise<ReconcileResult[]> {
  console.log(`\n--- BENCHMARK CONDITION: [${conditionLabel}] on '${routePath}' ---`);

  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error(`Missing auth storage file at ${AUTH_FILE}`);
  }

  const browser = await chromium.launch({ headless: true });
  const results: ReconcileResult[] = [];

  try {
    for (const concurrency of concurrencyLevels) {
      const timings: number[] = [];
      const ttfbTimings: number[] = [];
      let errorCount = 0;
      const totalRequests = concurrency * 4;

      const startTime = Date.now();

      const workerTasks = Array.from({ length: concurrency }).map(async () => {
        for (let iter = 0; iter < 4; iter++) {
          const context = await browser.newContext({ storageState: AUTH_FILE });
          const page = await context.newPage();

          try {
            const t0 = Date.now();
            const responsePromise = page.waitForResponse((res) => res.url().includes(routePath), { timeout: 15000 }).catch(() => null);

            await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "domcontentloaded", timeout: 15000 });
            const res = await responsePromise;

            if (res) {
              ttfbTimings.push(Date.now() - t0);
              if (res.status() >= 400 && res.status() !== 403 && res.status() !== 404) {
                errorCount++;
              }
            }

            await page.waitForSelector("h1, h2, main, .app-page", { state: "visible", timeout: 15000 });
            timings.push(Date.now() - t0);
          } catch {
            errorCount++;
          } finally {
            await context.close();
          }
        }
      });

      await Promise.all(workerTasks);
      const durationSec = (Date.now() - startTime) / 1000;

      const t3Stats = calcStats(timings);
      const ttfbStats = calcStats(ttfbTimings);
      const errorRate = Math.round((errorCount / totalRequests) * 100);
      const throughput = Math.round((totalRequests / Math.max(durationSec, 0.1)) * 10) / 10;

      results.push({
        conditionLabel,
        concurrency,
        route: routePath,
        p50: t3Stats.p50,
        p75: t3Stats.p75,
        p90: t3Stats.p90,
        p95: t3Stats.p95,
        max: t3Stats.max,
        ttfbP95: ttfbStats.p95,
        throughput,
        errorRate,
      });

      console.log(
        `  Conc ${String(concurrency).padStart(2)}: T3 p50=${String(t3Stats.p50).padStart(4)}ms, p95=${String(t3Stats.p95).padStart(4)}ms, TTFB p95=${String(ttfbStats.p95).padStart(4)}ms | Req/s=${throughput} | Errors=${errorRate}%`
      );
    }
  } finally {
    await browser.close();
  }

  return results;
}

async function main() {
  const label = process.env.CONDITION_LABEL || "DEFAULT";
  const results = await runConditionBenchmark(label);
  console.log("\nJSON_RESULT_START");
  console.log(JSON.stringify(results, null, 2));
  console.log("JSON_RESULT_END");
}

if (require.main === module) {
  main().catch((e) => {
    console.error("Condition benchmark failed:", e);
    process.exit(1);
  });
}
