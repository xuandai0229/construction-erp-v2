import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Generate a thread-safe/run-safe unique runId
const runId = `run_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
const baseOutputDir = path.join(process.cwd(), 'test-results/ui-ux-phase-3', runId);
const reportPath = path.join(baseOutputDir, 'FULL_SYSTEM_UI_UX_VISUAL_RUNTIME_VERIFICATION.md');

// Load dynamic project ID from QA manifest if exists
let dynamicProjectId = '';
try {
  const manifestPath = path.join(process.cwd(), 'test-results/ui-ux-phase-3/qa-fixture-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    dynamicProjectId = manifest.project?.id || '';
  }
} catch (e) {
  console.warn('Could not read qa-fixture-manifest.json', e);
}

const routes = [
  "/dashboard",
  "/projects",
  ...(dynamicProjectId ? [`/projects/${dynamicProjectId}`] : []),
  "/reports",
  "/materials",
  "/documents",
  "/approvals",
  "/users",
  "/settings",
];

const viewports = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
  tablet1: { width: 768, height: 1024 },
  tablet2: { width: 1024, height: 768 },
  laptop: { width: 1366, height: 768 },
  desktopLg: { width: 1920, height: 1080 }
};

interface AllowlistItem {
  pattern: RegExp;
  reason: string;
  route: string;
  owner: string;
  legacy: boolean;
}

// Strict allowlist: empty by default
const ALLOWLIST: AllowlistItem[] = [];

function isAllowed(text: string, route: string): boolean {
  return ALLOWLIST.some(item => item.pattern.test(text) && (item.route === '*' || item.route === route));
}

interface TestResult {
  route: string;
  viewport: string;
  runtime: 'PASS' | 'FAIL' | 'BLOCKED';
  overflow: 'PASS' | 'FAIL' | 'N/A';
  consoleErrorsCount: number;
  pageErrorsCount: number;
  screenshotPath: string;
}

const collectedResults: TestResult[] = [];

const ROUTE_HEADING_PATTERNS: Record<string, RegExp> = {
  "/dashboard": /tổng quan|bảng điều khiển/i,
  "/projects": /công trình|dự án/i,
  "/reports": /báo cáo/i,
  "/materials": /vật tư|kho/i,
  "/documents": /tài liệu|hồ sơ/i,
  "/approvals": /phê duyệt|yêu cầu/i,
  "/users": /thành viên|người dùng|nhân sự/i,
  "/settings": /cấu hình|cài đặt|thiết lập/i,
};

// Helper function to setup listeners and diagnose errors
function setupDiagnostics(
  page: any,
  route: string,
  consoleErrors: string[],
  pageErrors: string[],
  failedRequests: string[],
  unexpectedBadResponses: string[]
) {
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!isAllowed(text, route)) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err: any) => {
    if (!isAllowed(err.message, route)) {
      pageErrors.push(err.message);
    }
  });

  page.on('requestfailed', (request: any) => {
    const errText = request.failure()?.errorText || '';
    const url = request.url();
    if (!isAllowed(`${url} ${errText}`, route)) {
      failedRequests.push(`${url} ${errText}`);
    }
  });

  page.on('response', (response: any) => {
    const status = response.status();
    const url = response.url();
    // Do not skip Fetch/XHR errors: collect all responses with status >= 400
    if (status >= 400) {
      if (!isAllowed(`${url} ${status}`, route)) {
        unexpectedBadResponses.push(`${url} ${status}`);
      }
    }
  });
}

async function verifyPageHeading(page: any, route: string) {
  // Check if we are on a project details subroute
  let targetPattern = ROUTE_HEADING_PATTERNS[route];
  if (!targetPattern && route.startsWith('/projects/')) {
    targetPattern = /chi tiết|thông tin|công trình|dự án/i;
  }
  
  if (targetPattern) {
    const headings = page.locator('h1, h2, [role="heading"]');
    const count = await headings.count();
    let foundMatch = false;
    for (let i = 0; i < count; i++) {
      const text = await headings.nth(i).innerText();
      if (targetPattern.test(text)) {
        foundMatch = true;
        break;
      }
    }
    expect(foundMatch).toBe(true);
  }
}

test.beforeAll(() => {
  if (!fs.existsSync(baseOutputDir)) {
    fs.mkdirSync(baseOutputDir, { recursive: true });
  }
});

test.afterAll(() => {
  let reportContent = `# Báo cáo Runtime & Visual Verification (Phase 3)
Run ID: ${runId}
Generated at: ${new Date().toISOString()}
Command: npx playwright test scripts/qa/visual-qa.spec.ts --config=playwright.ui-ux.config.ts
Base URL: ${process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100'}

| Route | Viewport | Runtime | Overflow | Console Errors | Page Errors | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  for (const r of collectedResults) {
    const screenshotMd = r.screenshotPath ? `[Screenshot](./${path.basename(r.screenshotPath)})` : 'N/A';
    reportContent += `| \`${r.route}\` | ${r.viewport} | ${r.runtime} | ${r.overflow} | ${r.consoleErrorsCount} | ${r.pageErrorsCount} | ${screenshotMd} |\n`;
  }

  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`Saved execution report to ${reportPath}`);
  
  // Copy latest report to docs/qa directory as well for easy access
  const publicReportPath = path.join(process.cwd(), 'docs/qa/FULL_SYSTEM_UI_UX_VISUAL_RUNTIME_VERIFICATION.md');
  fs.mkdirSync(path.dirname(publicReportPath), { recursive: true });
  fs.copyFileSync(reportPath, publicReportPath);
});

test.describe('Group A - Route Smoke Matrix', () => {
  for (const route of routes) {
    for (const [vpName, vpSize] of [['mobile', viewports.mobile], ['desktop', viewports.desktop]] as const) {
      test(`Smoke test ${route} on ${vpName}`, async ({ page }) => {
        const authPath = path.join(process.cwd(), 'playwright', '.auth', 'admin.json');
        if (!fs.existsSync(authPath)) {
          collectedResults.push({
            route,
            viewport: vpName,
            runtime: 'BLOCKED',
            overflow: 'N/A',
            consoleErrorsCount: 0,
            pageErrorsCount: 0,
            screenshotPath: ''
          });
          test.skip(true, "Authentication storage state 'admin.json' is missing. QA environment is not ready.");
        }

        await page.setViewportSize(vpSize);
        
        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];
        const failedRequests: string[] = [];
        const unexpectedBadResponses: string[] = [];
        
        setupDiagnostics(page, route, consoleErrors, pageErrors, failedRequests, unexpectedBadResponses);

        try {
          const response = await page.goto(route, { waitUntil: 'load', timeout: 20000 });
          expect(response?.status()).toBeLessThan(400);

          // Assert no redirect to login
          await expect(page).not.toHaveURL(/\/login/);
          
          // Wait for potential animations or hydration
          await page.waitForTimeout(1000);
          
          // Verify Page Heading matches route metadata target regexes
          await verifyPageHeading(page, route);
          
          // Check overflow
          const pageOverflow = await page.evaluate(() => {
            const root = document.documentElement;
            return root.scrollWidth > root.clientWidth + 1;
          });
          
          // Take screenshot
          const routeClean = route.replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'home';
          const screenshotName = `${routeClean}-${vpName}.png`;
          const screenshotPath = path.join(baseOutputDir, screenshotName);
          
          await page.screenshot({ path: screenshotPath, fullPage: vpName === 'desktop' });
          
          const stat = fs.statSync(screenshotPath);
          expect(stat.size).toBeGreaterThan(0);

          // Strict assertions
          expect(consoleErrors).toEqual([]);
          expect(pageErrors).toEqual([]);
          expect(failedRequests).toEqual([]);
          expect(unexpectedBadResponses).toEqual([]);
          expect(pageOverflow).toBe(false);

          collectedResults.push({
            route,
            viewport: vpName,
            runtime: 'PASS',
            overflow: pageOverflow ? 'FAIL' : 'PASS',
            consoleErrorsCount: consoleErrors.length,
            pageErrorsCount: pageErrors.length,
            screenshotPath
          });
        } catch (err: any) {
          collectedResults.push({
            route,
            viewport: vpName,
            runtime: 'FAIL',
            overflow: 'FAIL',
            consoleErrorsCount: consoleErrors.length,
            pageErrorsCount: pageErrors.length,
            screenshotPath: ''
          });
          throw err;
        }
      });
    }
  }
});

test.describe('Group B - Responsive Representative Matrix', () => {
  const reps = [
    { path: "/dashboard", vpName: 'tablet1', vpSize: viewports.tablet1 },
    { path: "/materials", vpName: 'tablet2', vpSize: viewports.tablet2 },
    { path: "/documents", vpName: 'laptop', vpSize: viewports.laptop },
    { path: "/projects", vpName: 'desktopLg', vpSize: viewports.desktopLg }
  ];

  for (const rep of reps) {
    test(`Responsive check ${rep.path} on ${rep.vpName}`, async ({ page }) => {
      const authPath = path.join(process.cwd(), 'playwright', '.auth', 'admin.json');
      if (!fs.existsSync(authPath)) {
        collectedResults.push({
          route: rep.path,
          viewport: rep.vpName,
          runtime: 'BLOCKED',
          overflow: 'N/A',
          consoleErrorsCount: 0,
          pageErrorsCount: 0,
          screenshotPath: ''
        });
        test.skip(true, "Authentication storage state 'admin.json' is missing. QA environment is not ready.");
      }

      await page.setViewportSize(rep.vpSize);
      
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const failedRequests: string[] = [];
      const unexpectedBadResponses: string[] = [];
      
      // Shared diagnostics listener helper
      setupDiagnostics(page, rep.path, consoleErrors, pageErrors, failedRequests, unexpectedBadResponses);

      try {
        const response = await page.goto(rep.path, { waitUntil: 'load', timeout: 20000 });
        expect(response?.status()).toBeLessThan(400);
        
        await expect(page).not.toHaveURL(/\/login/);
        await page.waitForTimeout(1000);
        
        // Verify heading
        await verifyPageHeading(page, rep.path);
        
        const pageOverflow = await page.evaluate(() => {
          const root = document.documentElement;
          return root.scrollWidth > root.clientWidth + 1;
        });
        
        const routeClean = rep.path.replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'home';
        const screenshotName = `${routeClean}-${rep.vpName}.png`;
        const screenshotPath = path.join(baseOutputDir, screenshotName);
        await page.screenshot({ path: screenshotPath });
        
        const stat = fs.statSync(screenshotPath);
        expect(stat.size).toBeGreaterThan(0);
        
        expect(consoleErrors).toEqual([]);
        expect(pageErrors).toEqual([]);
        expect(failedRequests).toEqual([]);
        expect(unexpectedBadResponses).toEqual([]);
        expect(pageOverflow).toBe(false);

        collectedResults.push({
          route: rep.path,
          viewport: rep.vpName,
          runtime: 'PASS',
          overflow: pageOverflow ? 'FAIL' : 'PASS',
          consoleErrorsCount: consoleErrors.length,
          pageErrorsCount: pageErrors.length,
          screenshotPath
        });
      } catch (err: any) {
        collectedResults.push({
          route: rep.path,
          viewport: rep.vpName,
          runtime: 'FAIL',
          overflow: 'FAIL',
          consoleErrorsCount: consoleErrors.length,
          pageErrorsCount: pageErrors.length,
          screenshotPath: ''
        });
        throw err;
      }
    });
  }
});
