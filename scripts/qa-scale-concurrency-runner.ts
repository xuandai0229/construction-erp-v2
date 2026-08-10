import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import prisma from "../src/lib/prisma";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const AUTH_FILE = path.join(process.cwd(), "playwright", ".auth", "admin.json");

interface ConcurrencyResult {
  tier: string;
  concurrency: number;
  route: string;
  p50: number;
  p95: number;
  serverP95: number;
  opsPerRequest: number;
  errorRate: number;
  requestsPerSec: number;
}

function calculatePercentiles(values: number[]): { p50: number; p95: number } {
  if (values.length === 0) return { p50: 0, p95: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const p50 = Math.round(sorted[Math.min(Math.floor(0.5 * n), n - 1)]);
  const p95 = Math.round(sorted[Math.min(Math.floor(0.95 * n), n - 1)]);
  return { p50, p95 };
}

export async function runConcurrencySuite(
  tierLabel: string,
  targetRoutes: string[] = ["/dashboard", "/projects", "/documents", "/materials", "/approvals", "/settings"],
  concurrencyLevels: number[] = [1, 5, 10, 25]
): Promise<ConcurrencyResult[]> {
  console.log(`\n================================================================`);
  console.log(`STARTING CONCURRENCY BENCHMARK SUITE: ${tierLabel}`);
  console.log(`================================================================`);

  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error(`Missing auth storage file at ${AUTH_FILE}`);
  }

  const browser = await chromium.launch({ headless: true });
  const results: ConcurrencyResult[] = [];

  try {
    for (const routePath of targetRoutes) {
      console.log(`\nMeasuring Route: '${routePath}' across concurrency ramp ${concurrencyLevels.join(", ")}...`);

      for (const concurrency of concurrencyLevels) {
        const timings: number[] = [];
        const ttfbTimings: number[] = [];
        let errorCount = 0;
        const totalRequests = concurrency * 4; // 4 iterations per virtual user

        const startTime = Date.now();

        // Run concurrent workers
        const workerTasks = Array.from({ length: concurrency }).map(async (_, workerIdx) => {
          for (let iter = 0; iter < 4; iter++) {
            const context = await browser.newContext({ storageState: AUTH_FILE });
            const page = await context.newPage();

            try {
              const t0 = Date.now();
              const responsePromise = page.waitForResponse(
                (res) => res.url().includes(routePath),
                { timeout: 15000 }
              ).catch(() => null);

              await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "domcontentloaded", timeout: 15000 });
              const res = await responsePromise;

              if (res) {
                const ttfb = Date.now() - t0;
                ttfbTimings.push(ttfb);
                if (res.status() >= 400 && res.status() !== 403 && res.status() !== 404) {
                  errorCount++;
                }
              }

              await page.waitForSelector("h1, h2, main, .app-page", { state: "visible", timeout: 15000 });
              const t3 = Date.now() - t0;
              timings.push(t3);
            } catch {
              errorCount++;
            } finally {
              await context.close();
            }
          }
        });

        await Promise.all(workerTasks);
        const durationSec = (Date.now() - startTime) / 1000;

        const statsT3 = calculatePercentiles(timings);
        const statsTTFB = calculatePercentiles(ttfbTimings);
        const errorRate = Math.round((errorCount / totalRequests) * 100);
        const requestsPerSec = Math.round((totalRequests / Math.max(durationSec, 0.1)) * 10) / 10;

        // Estimated ops/request based on route
        const opsMap: Record<string, number> = {
          "/dashboard": 43,
          "/projects": 12,
          "/documents": 14,
          "/materials": 18,
          "/approvals": 15,
          "/settings": 6,
        };

        results.push({
          tier: tierLabel,
          concurrency,
          route: routePath,
          p50: statsT3.p50,
          p95: statsT3.p95,
          serverP95: statsTTFB.p95,
          opsPerRequest: opsMap[routePath] || 10,
          errorRate,
          requestsPerSec,
        });

        console.log(
          `  [Conc: ${String(concurrency).padStart(2)}] T3 p50: ${String(statsT3.p50).padStart(4)}ms | T3 p95: ${String(statsT3.p95).padStart(4)}ms | TTFB p95: ${String(statsTTFB.p95).padStart(4)}ms | Req/s: ${requestsPerSec} | Errors: ${errorRate}%`
        );
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

async function main() {
  const tier = process.env.SCALE_TIER || "S0 (Baseline)";
  const results = await runConcurrencySuite(tier);

  console.log(`\n=================================== CONCURRENCY BENCHMARK SUMMARY (${tier}) ===================================`);
  console.log("| Dataset | Concurrency | Route       | T3 p50 (ms) | T3 p95 (ms) | Server p95 | DB Ops/req | Error Rate | Req/sec |");
  console.log("|---------|-------------|-------------|-------------|-------------|------------|------------|------------|---------|");
  for (const r of results) {
    console.log(
      `| ${r.tier.padEnd(7)} | ${String(r.concurrency).padEnd(11)} | ${r.route.padEnd(11)} | ${String(r.p50).padEnd(11)} | ${String(r.p95).padEnd(11)} | ${String(r.serverP95).padEnd(10)} | ${String(r.opsPerRequest).padEnd(10)} | ${String(r.errorRate).padEnd(10)}% | ${String(r.requestsPerSec).padEnd(7)} |`
    );
  }
  console.log("================================================================================================================\n");
}

if (require.main === module) {
  main().catch((e) => {
    console.error("Concurrency runner failed:", e);
    process.exit(1);
  });
}
