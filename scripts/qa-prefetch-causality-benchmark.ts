import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const AUTH_FILE = path.join(process.cwd(), "playwright", ".auth", "admin.json");

interface Measurement {
  run: number;
  route: string;
  t1: number; // TTFB (ms)
  t3: number; // Interactive completion (ms)
  totalRscCount: number;
  bgRscCount: number;
  targetRscCount: number;
  slowSample: boolean; // >500ms
}

interface DistributionResult {
  route: string;
  condition: string;
  runs: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  max: number;
  slowCount: number;
  avgBgRsc: number;
  avgTotalRsc: number;
}

function calculatePercentiles(values: number[]): { p50: number; p75: number; p90: number; p95: number; max: number } {
  if (values.length === 0) return { p50: 0, p75: 0, p90: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const getNearest = (p: number) => {
    const idx = Math.min(Math.floor((p / 100) * n), n - 1);
    return sorted[idx];
  };
  return {
    p50: Math.round(getNearest(50)),
    p75: Math.round(getNearest(75)),
    p90: Math.round(getNearest(90)),
    p95: Math.round(getNearest(95)),
    max: Math.round(sorted[n - 1]),
  };
}

export async function runRouteBenchmark(
  conditionName: string,
  routes: string[],
  samplesPerRoute: number = 50
): Promise<DistributionResult[]> {
  console.log(`\n================================================================`);
  console.log(`STARTING BENCHMARK: ${conditionName} (${samplesPerRoute} runs/route)`);
  console.log(`================================================================`);

  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error(`Missing auth storage file at ${AUTH_FILE}`);
  }

  const browser = await chromium.launch({ headless: true });
  const results: DistributionResult[] = [];

  try {
    for (const routePath of routes) {
      console.log(`Measuring route '${routePath}'...`);
      const measurements: Measurement[] = [];

      for (let i = 1; i <= samplesPerRoute; i++) {
        const context = await browser.newContext({ storageState: AUTH_FILE });
        const page = await context.newPage();

        let rscRequests = 0;
        let bgRscRequests = 0;
        let targetRscRequests = 0;
        let t1Time = 0;

        page.on("request", (req) => {
          const url = req.url();
          if (url.includes("_rsc=") || req.headers()["accept"]?.includes("text/x-component")) {
            rscRequests++;
            if (url.includes(routePath)) {
              targetRscRequests++;
            } else {
              bgRscRequests++;
            }
          }
        });

        // 1. Initial entry to Dashboard (Source page)
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1000); // Allow sidebar links & prefetch to trigger

        // 2. Perform navigation to target route
        const t0 = Date.now();

        // Listen for target response first byte
        const responsePromise = page.waitForResponse(
          (res) => res.url().includes(routePath),
          { timeout: 10000 }
        ).catch(() => null);

        // Click target link in sidebar
        const targetLink = page.locator(`a[href="${routePath}"]`).first();
        if (await targetLink.isVisible()) {
          await targetLink.click();
        } else {
          await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "domcontentloaded" });
        }

        const res = await responsePromise;
        if (res) {
          t1Time = Date.now() - t0;
        }

        // Wait for page interactive state (Heading or main content container)
        await page.waitForSelector("h1, h2, main, .app-page", { state: "visible", timeout: 20000 });
        await page.waitForSelector(".animate-pulse", { state: "detached", timeout: 5000 }).catch(() => {});

        const t3Time = Date.now() - t0;
        if (t1Time === 0) t1Time = Math.min(t3Time, 30);

        measurements.push({
          run: i,
          route: routePath,
          t1: t1Time,
          t3: t3Time,
          totalRscCount: rscRequests,
          bgRscCount: bgRscRequests,
          targetRscCount: targetRscRequests,
          slowSample: t3Time > 500,
        });

        await context.close();
      }

      const t3Values = measurements.map((m) => m.t3);
      const stats = calculatePercentiles(t3Values);
      const slowCount = measurements.filter((m) => m.slowSample).length;
      const avgBgRsc = Math.round(
        measurements.reduce((acc, m) => acc + m.bgRscCount, 0) / samplesPerRoute
      );
      const avgTotalRsc = Math.round(
        measurements.reduce((acc, m) => acc + m.totalRscCount, 0) / samplesPerRoute
      );

      results.push({
        route: routePath,
        condition: conditionName,
        runs: samplesPerRoute,
        p50: stats.p50,
        p75: stats.p75,
        p90: stats.p90,
        p95: stats.p95,
        max: stats.max,
        slowCount,
        avgBgRsc,
        avgTotalRsc,
      });

      console.log(
        `  -> ${routePath} [${conditionName}]: p50=${stats.p50}ms, p95=${stats.p95}ms, max=${stats.max}ms | >500ms: ${slowCount}/${samplesPerRoute} | Avg BG RSC: ${avgBgRsc}`
      );
    }
  } finally {
    await browser.close();
  }

  return results;
}

async function main() {
  const routesToTest = ["/settings", "/materials", "/approvals", "/hr", "/projects"];
  const runs = process.env.BENCHMARK_RUNS ? parseInt(process.env.BENCHMARK_RUNS, 10) : 50;
  const condition = process.env.BENCHMARK_CONDITION || "Candidate A - Current Default";

  const results = await runRouteBenchmark(condition, routesToTest, runs);

  console.log(`\n=================================== BENCHMARK SUMMARY (${condition}) ===================================`);
  console.log("| Route       | Runs | p50 (ms) | p75 (ms) | p90 (ms) | p95 (ms) | Max (ms) | >500ms Count | Avg BG RSC |");
  console.log("|-------------|------|----------|----------|----------|----------|----------|--------------|------------|");
  for (const r of results) {
    console.log(
      `| ${r.route.padEnd(11)} | ${String(r.runs).padEnd(4)} | ${String(r.p50).padEnd(8)} | ${String(r.p75).padEnd(8)} | ${String(r.p90).padEnd(8)} | ${String(r.p95).padEnd(8)} | ${String(r.max).padEnd(8)} | ${String(r.slowCount).padEnd(12)} | ${String(r.avgBgRsc).padEnd(10)} |`
    );
  }
  console.log("========================================================================================================\n");
}

if (require.main === module) {
  main().catch((e) => {
    console.error("Benchmark failed:", e);
    process.exit(1);
  });
}
