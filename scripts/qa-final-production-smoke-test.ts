import { chromium } from "playwright";
import { requireQaEnv } from "./qa-env";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const adminEmail = process.env.QA_ADMIN_EMAIL || "admin@construction.local";
const adminPassword = requireQaEnv("QA_ADMIN_PASSWORD");

const viewports = [
  { width: 390, height: 844, label: "390x844" },
  { width: 430, height: 932, label: "430x932" },
  { width: 768, height: 1024, label: "768x1024" },
  { width: 1366, height: 768, label: "1366x768" },
];

async function main() {
  console.log("=== QA FINAL PRODUCTION SMOKE TEST ===");
  const browser = await chromium.launch({ headless: true });
  const results: Array<{
    viewport: string;
    route: string;
    finalPath: string;
    overflow: number;
    smallTargets: Array<{ text: string; width: number; height: number }>;
  }> = [];

  try {
    const context = await browser.newContext({ viewport: viewports[0] });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
    console.log("PASS: Login production-like.");

    await page.goto(`${baseUrl}/projects`, { waitUntil: "networkidle" });
    const projectHref = await page.locator('a[href^="/projects/"]').evaluateAll((els) => {
      const hrefs = els.map((a) => a.getAttribute("href")).filter(Boolean);
      return hrefs.find((href) => /^\/projects\/[^/]+$/.test(href || "")) || null;
    });
    if (!projectHref) throw new Error("Không tìm thấy project detail link để smoke test.");
    const projectId = projectHref.split("/")[2];

    const routes = [
      "/login",
      "/users",
      "/projects",
      `/projects/${projectId}`,
      `/projects/${projectId}/field-progress`,
      `/projects/${projectId}/field-progress/daily`,
      `/projects/${projectId}/field-progress/summary`,
      `/projects/${projectId}/material-requests`,
      "/documents",
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of routes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        const check = await page.evaluate(() => {
          const overflow =
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
            window.innerWidth;
          const smallTargets = Array.from(
            document.querySelectorAll("button, a, input, select, textarea")
          )
            .map((el) => {
              const rect = el.getBoundingClientRect();
              return {
                text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              };
            })
            .filter((target) => target.width > 0 && target.height > 0 && (target.width < 24 || target.height < 24))
            .slice(0, 3);
          return { finalPath: location.pathname, overflow, smallTargets };
        });

        results.push({ viewport: viewport.label, route, ...check });
      }
    }
  } finally {
    await browser.close();
  }

  const badOverflow = results.filter((result) => result.overflow > 2);
  if (badOverflow.length > 0) {
    console.error("FAIL: Horizontal overflow detected", badOverflow);
    process.exitCode = 1;
    return;
  }

  const smallTargetFindings = results.filter((result) => result.smallTargets.length > 0);
  console.log(`PASS: Checked ${results.length} route/viewport combinations without horizontal overflow.`);
  if (smallTargetFindings.length > 0) {
    console.log(`NOTE: ${smallTargetFindings.length} route/viewport combinations have <24px minor targets/icons.`);
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
