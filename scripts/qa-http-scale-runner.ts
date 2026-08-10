import "dotenv/config";
import http from "http";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const AUTH_FILE = path.join(process.cwd(), "playwright", ".auth", "admin.json");

export interface HttpConcurrencyResult {
  conditionLabel: string;
  concurrency: number;
  route: string;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  max: number;
  throughput: number;
  errorRate: number;
}

function calcPercentiles(values: number[]) {
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

import { Pool } from "pg";
import { createSessionToken } from "../src/lib/session-token";

async function getAuthCookie(): Promise<string> {
  if (fs.existsSync(AUTH_FILE)) {
    try {
      const raw = fs.readFileSync(AUTH_FILE, "utf-8");
      const json = JSON.parse(raw);
      const cookieObj = json.cookies?.find((c: any) => c.name === "auth_session");
      if (cookieObj && cookieObj.value) {
        return `auth_session=${cookieObj.value}`;
      }
    } catch {
      // Fallback
    }
  }

  const dbUrl = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("No database URL set");
  const pool = new Pool({ connectionString: dbUrl });
  try {
    const res = await pool.query(`SELECT id, "updatedAt" FROM "User" WHERE role = 'ADMIN' LIMIT 1`);
    if (res.rows.length === 0) throw new Error("No admin user found in database");
    const user = res.rows[0];
    const token = createSessionToken(user.id, Math.floor(Date.now() / 1000), new Date(user.updatedAt).toISOString());
    return `auth_session=${token}`;
  } finally {
    await pool.end();
  }
}

function makeHttpRequest(urlStr: string, cookie: string): Promise<{ duration: number; statusCode: number }> {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const start = Date.now();
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: "GET",
        headers: {
          Cookie: cookie,
          "User-Agent": "QA-HTTP-Benchmark-Runner/1.0",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ duration: Date.now() - start, statusCode: res.statusCode || 500 });
        });
      }
    );
    req.on("error", () => {
      resolve({ duration: Date.now() - start, statusCode: 500 });
    });
    req.end();
  });
}

export async function runHttpBenchmark(
  conditionLabel: string,
  concurrencyLevels: number[] = [1, 5, 10, 25, 50],
  routePath: string = "/dashboard",
  requestsPerWorker: number = 10
): Promise<HttpConcurrencyResult[]> {
  console.log(`\n================================================================`);
  console.log(`HTTP SERVER LOAD BENCHMARK: [${conditionLabel}] on '${routePath}'`);
  console.log(`================================================================`);

  const cookie = await getAuthCookie();
  const urlStr = `${BASE_URL}${routePath}`;
  const results: HttpConcurrencyResult[] = [];

  // Warmup request
  await makeHttpRequest(urlStr, cookie);

  for (const concurrency of concurrencyLevels) {
    const timings: number[] = [];
    let errorCount = 0;
    const totalRequests = concurrency * requestsPerWorker;

    const startTime = Date.now();

    const workerTasks = Array.from({ length: concurrency }).map(async () => {
      for (let i = 0; i < requestsPerWorker; i++) {
        const { duration, statusCode } = await makeHttpRequest(urlStr, cookie);
        timings.push(duration);
        if (statusCode >= 400 && statusCode !== 403 && statusCode !== 404) {
          errorCount++;
        }
      }
    });

    await Promise.all(workerTasks);
    const durationSec = (Date.now() - startTime) / 1000;

    const stats = calcPercentiles(timings);
    const errorRate = Math.round((errorCount / totalRequests) * 100);
    const throughput = Math.round((totalRequests / Math.max(durationSec, 0.01)) * 10) / 10;

    results.push({
      conditionLabel,
      concurrency,
      route: routePath,
      p50: stats.p50,
      p75: stats.p75,
      p90: stats.p90,
      p95: stats.p95,
      max: stats.max,
      throughput,
      errorRate,
    });

    console.log(
      `  [Conc ${String(concurrency).padStart(2)}] p50=${String(stats.p50).padStart(4)}ms | p75=${String(stats.p75).padStart(4)}ms | p90=${String(stats.p90).padStart(4)}ms | p95=${String(stats.p95).padStart(4)}ms | Max=${String(stats.max).padStart(4)}ms | Throughput=${throughput} req/s | Errors=${errorRate}%`
    );
  }

  return results;
}

async function main() {
  const label = process.env.CONDITION_LABEL || "DEFAULT";
  const results = await runHttpBenchmark(label);
  console.log("\nHTTP_JSON_RESULT_START");
  console.log(JSON.stringify(results, null, 2));
  console.log("HTTP_JSON_RESULT_END");
}

if (require.main === module) {
  main().catch((e) => {
    console.error("HTTP benchmark failed:", e);
    process.exit(1);
  });
}
