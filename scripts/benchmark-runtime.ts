import dotenv from "dotenv";
import path from "path";
import { Client } from "pg";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const BASE_URL = process.env.BENCH_URL || "http://127.0.0.1:3000";

const ROUTES = [
  { path: "/", name: "Root Redirect (/)" },
  { path: "/login", name: "Login Page (/login)" },
  { path: "/dashboard", name: "Dashboard (/dashboard)" },
  { path: "/projects", name: "Projects (/projects)" },
  { path: "/hr", name: "HR (/hr)" },
  { path: "/materials", name: "Materials (/materials)" },
  { path: "/reports", name: "Reports (/reports)" },
  { path: "/approvals", name: "Approvals (/approvals)" },
  { path: "/settings", name: "Settings (/settings)" },
  { path: "/reports/field", name: "Field Reports (/reports/field)" },
  { path: "/documents", name: "Documents (/documents)" },
];

async function getAdminCookie(): Promise<string> {
  const dbClient = new Client({ connectionString: process.env.DATABASE_URL });
  await dbClient.connect();

  const userRes = await dbClient.query(
    `SELECT email FROM "User" WHERE role = 'ADMIN' AND "deletedAt" IS NULL LIMIT 1`
  );

  if (userRes.rows.length === 0) {
    throw new Error("No admin user found in database");
  }

  const adminEmail = userRes.rows[0].email;
  await dbClient.end();

  const password = process.env.SEED_DEV_ADMIN_PASSWORD || "123456";

  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password }),
  });

  if (!loginRes.ok) {
    const text = await loginRes.text();
    throw new Error(`Login failed (${loginRes.status}): ${text}`);
  }

  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("No set-cookie header received from login");
  }

  const cookieMatch = setCookie.match(/auth_session=[^;]+/);
  if (!cookieMatch) {
    throw new Error("auth_session cookie not found in response");
  }

  return cookieMatch[0];
}

async function measureRoute(pathName: string, cookie: string) {
  const url = `${BASE_URL}${pathName}`;
  const start = performance.now();
  const res = await fetch(url, {
    headers: {
      Cookie: cookie,
      "User-Agent": "PerfBenchmark/1.0",
    },
    redirect: "manual",
  });
  const duration = performance.now() - start;
  await res.text();
  return { status: res.status, duration: Math.round(duration) };
}

async function runBenchmark() {
  console.log(`Starting performance benchmark against ${BASE_URL}...`);

  const authCookie = await getAdminCookie();
  console.log(`Successfully authenticated via API v1.\n`);

  console.log("| Route | Cold Request (ms) | Warm Avg (ms) | Status |");
  console.log("| ----- | ----------------: | ------------: | ------ |");

  for (const route of ROUTES) {
    const testCookie = route.path === "/login" ? "" : authCookie;
    
    // Cold run
    const coldResult = await measureRoute(route.path, testCookie);

    // Warm runs (5 consecutive requests)
    let warmTotal = 0;
    const warmCount = 5;
    for (let i = 0; i < warmCount; i++) {
      const warmRes = await measureRoute(route.path, testCookie);
      warmTotal += warmRes.duration;
    }
    const warmAvg = Math.round(warmTotal / warmCount);

    console.log(
      `| ${route.name.padEnd(30)} | ${String(coldResult.duration).padStart(17)} | ${String(warmAvg).padStart(13)} | ${coldResult.status} |`
    );
  }

  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
