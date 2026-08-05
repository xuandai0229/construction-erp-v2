import "dotenv/config";
import { chromium, type Browser, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import prisma from "../../src/lib/prisma";

const artifactsDir = "C:/Users/admin/.gemini/antigravity/brain/0dbf49d4-0752-45d9-a912-f1c31cea75a0";

export interface RoutePerformanceMetric {
  route: string;
  role: string;
  viewport: "Desktop" | "Tablet" | "Mobile";
  navigationTimeMs: number;
  domContentLoadedMs: number;
  lcpMs: number;
  requestCount: number;
  totalTransferredKb: number;
  apiDurationsMs: Array<{ url: string; duration: number }>;
  jsHeapSizeMb: number;
  overflowDetected: boolean;
  hasConsoleErrors: boolean;
  errors: string[];
}

const VIEWPORTS = {
  Desktop: { width: 1536, height: 864 },
  Tablet: { width: 768, height: 1024 },
  Mobile: { width: 390, height: 844 },
} as const;

async function measureRoutePerformance(
  page: Page,
  routeUrl: string,
  routeName: string,
  role: string,
  viewportName: "Desktop" | "Tablet" | "Mobile"
): Promise<RoutePerformanceMetric> {
  const errors: string[] = [];
  let requestCount = 0;
  let totalTransferredBytes = 0;
  const apiDurationsMs: Array<{ url: string; duration: number }> = [];

  const handleConsole = (msg: any) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore routine favicon or expected 404s
      if (!text.includes("favicon") && !text.includes("404")) {
        errors.push(`[Console Error] ${text}`);
      }
    }
  };

  const handlePageError = (err: Error) => {
    errors.push(`[Page Error] ${err.message}`);
  };

  page.on("console", handleConsole);
  page.on("pageerror", handlePageError);

  page.on("request", () => {
    requestCount++;
  });

  page.on("response", async (res) => {
    try {
      const headers = res.headers();
      const length = parseInt(headers["content-length"] || "0", 10);
      totalTransferredBytes += length;

      const url = res.url();
      if (url.includes("/api/") || url.includes("/_next/data/")) {
        const timing = res.request().timing();
        if (timing && timing.responseEnd > 0) {
          apiDurationsMs.push({
            url: new URL(url).pathname,
            duration: Math.round(timing.responseEnd),
          });
        }
      }
    } catch {}
  });

  const startTime = Date.now();
  await page.goto(routeUrl, { waitUntil: "networkidle", timeout: 15000 }).catch((e) => {
    errors.push(`[Navigation Timeout] ${e.message}`);
  });
  const navigationTimeMs = Date.now() - startTime;

  // Measure Web Vitals & Performance Timings inside browser
  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const domContentLoadedMs = perf ? Math.round(perf.domContentLoadedEventEnd - perf.startTime) : 0;

    let lcpMs = 0;
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    if (lcpEntries.length > 0) {
      lcpMs = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
    } else {
      lcpMs = domContentLoadedMs;
    }

    const memory = (performance as any).memory;
    const jsHeapSizeMb = memory ? Math.round((memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100 : 0;

    // Horizontal overflow check
    const docElem = document.documentElement;
    const overflowDetected = docElem.scrollWidth > window.innerWidth + 5;

    return { domContentLoadedMs, lcpMs, jsHeapSizeMb, overflowDetected };
  });

  page.off("console", handleConsole);
  page.off("pageerror", handlePageError);

  return {
    route: routeName,
    role,
    viewport: viewportName,
    navigationTimeMs,
    domContentLoadedMs: metrics.domContentLoadedMs,
    lcpMs: metrics.lcpMs,
    requestCount,
    totalTransferredKb: Math.round((totalTransferredBytes / 1024) * 10) / 10,
    apiDurationsMs,
    jsHeapSizeMb: metrics.jsHeapSizeMb,
    overflowDetected: metrics.overflowDetected,
    hasConsoleErrors: errors.length > 0,
    errors,
  };
}

export async function runSystemPerformanceAudit() {
  console.log("=== STARTING FULL SYSTEM PERFORMANCE AUDIT ===");

  const project = await prisma.project.findFirst({ where: { deletedAt: null } });
  const sampleProjectId = project?.id || "demo-project-id";

  const routesToAudit = [
    { name: "/dashboard", url: "http://localhost:3000/dashboard" },
    { name: "/projects", url: "http://localhost:3000/projects" },
    { name: `/projects/${sampleProjectId}`, url: `http://localhost:3000/projects/${sampleProjectId}` },
    { name: "/documents", url: "http://localhost:3000/documents" },
    { name: "/reports", url: "http://localhost:3000/reports" },
    { name: "/reports/field", url: "http://localhost:3000/reports/field" },
    { name: "/reports/weekly-inspection", url: "http://localhost:3000/reports/weekly-inspection" },
    { name: "/reports/safety/plan", url: "http://localhost:3000/reports/safety/plan" },
    { name: "/reports/safety/assessment", url: "http://localhost:3000/reports/safety/assessment" },
    { name: "/reports/safety/weekly", url: "http://localhost:3000/reports/safety/weekly" },
    { name: "/materials", url: "http://localhost:3000/materials" },
    { name: "/approvals", url: "http://localhost:3000/approvals" },
    { name: "/tasks", url: "http://localhost:3000/tasks" },
    { name: "/users", url: "http://localhost:3000/users" },
    { name: "/settings", url: "http://localhost:3000/settings" },
    { name: "/audit", url: "http://localhost:3000/audit" },
  ];

  const browser = await chromium.launch({ headless: true });
  const allResults: RoutePerformanceMetric[] = [];

  // Audit ADMIN role across viewports
  const role = "ADMIN";
  const userEmail = "daicongtu2910@gmail.com";

  for (const [vpName, vpSize] of Object.entries(VIEWPORTS) as Array<["Desktop" | "Tablet" | "Mobile", { width: number; height: number }]>) {
    console.log(`\n--- Auditing Role: ${role} | Viewport: ${vpName} (${vpSize.width}x${vpSize.height}) ---`);
    const context = await browser.newContext({ viewport: vpSize });
    const page = await context.newPage();

    // Login
    await page.goto("http://localhost:3000/login", { waitUntil: "load" });
    await page.fill('input[name="email"]', userEmail);
    await page.fill('input[name="password"]', "123456");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {});

    for (const routeObj of routesToAudit) {
      console.log(`Measuring ${routeObj.name}...`);
      const metric = await measureRoutePerformance(page, routeObj.url, routeObj.name, role, vpName);
      allResults.push(metric);
    }

    await context.close();
  }

  await browser.close();

  // Save audit data artifact
  const auditJsonPath = path.join(artifactsDir, "system_performance_audit_results.json");
  fs.writeFileSync(auditJsonPath, JSON.stringify(allResults, null, 2));
  console.log(`\nSaved raw performance audit data to: ${auditJsonPath}`);

  // Format summary report
  console.log("\n=== PERFORMANCE AUDIT SUMMARY TABLE ===");
  console.table(
    allResults.map((r) => ({
      Route: r.route,
      Viewport: r.viewport,
      NavMs: r.navigationTimeMs,
      DomLoadedMs: r.domContentLoadedMs,
      LcpMs: r.lcpMs,
      Requests: r.requestCount,
      HeapMb: r.jsHeapSizeMb,
      Overflow: r.overflowDetected ? "FAIL" : "PASS",
      Errors: r.hasConsoleErrors ? r.errors.length : 0,
    }))
  );

  return allResults;
}

if (require.main === module) {
  runSystemPerformanceAudit().catch(console.error).finally(() => prisma.$disconnect());
}
