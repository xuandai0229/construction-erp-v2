import fs from "fs";
import path from "path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
const screenshotDir = path.join(process.cwd(), "docs", "qa", "screenshots", "field-material-full-uat");
const a11yReportPath = path.join(process.cwd(), "docs", "qa", "FIELD_MATERIAL_FULL_A11Y_AUDIT.txt");
const responsiveReportPath = path.join(process.cwd(), "docs", "qa", "FIELD_MATERIAL_FULL_RESPONSIVE_AUDIT.json");

type Viewport = {
  width: number;
  height: number;
};

type A11yIssue = {
  route: string;
  viewport: string;
  issue: string;
};

type ResponsiveCheck = {
  route: string;
  viewport: string;
  url: string;
  bodyScrollWidth: number;
  clientWidth: number;
  hasPageHorizontalScroll: boolean;
  darkInputs: number;
  whiteTextOnLightBackground: number;
};

type BrowserStorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

const viewports: Record<string, Viewport> = {
  "mobile-360": { width: 360, height: 740 },
  "mobile-375": { width: 375, height: 812 },
  "mobile-390": { width: 390, height: 844 },
  "mobile-414": { width: 414, height: 896 },
  "mobile-430": { width: 430, height: 932 },
  "desktop-1366": { width: 1366, height: 768 },
  "desktop-1440": { width: 1440, height: 900 },
  "desktop-1536": { width: 1536, height: 864 },
  "desktop-1920": { width: 1920, height: 1080 },
};

const requiredScreenshots = [
  { file: "master-mobile-360.png", route: "master", viewport: "mobile-360" },
  { file: "master-mobile-390.png", route: "master", viewport: "mobile-390" },
  { file: "daily-mobile-360.png", route: "daily", viewport: "mobile-360" },
  { file: "daily-mobile-390.png", route: "daily", viewport: "mobile-390" },
  { file: "summary-mobile-360.png", route: "summary", viewport: "mobile-360" },
  { file: "summary-mobile-390.png", route: "summary", viewport: "mobile-390" },
  { file: "material-mobile-list-360.png", route: "material", viewport: "mobile-360" },
  { file: "material-mobile-form-390.png", route: "material-form", viewport: "mobile-390" },
  { file: "material-mobile-detail-390.png", route: "material-detail", viewport: "mobile-390" },
  { file: "master-desktop-1366.png", route: "master", viewport: "desktop-1366" },
  { file: "daily-desktop-1366.png", route: "daily", viewport: "desktop-1366" },
  { file: "summary-desktop-1366.png", route: "summary", viewport: "desktop-1366" },
  { file: "material-desktop-list-1366.png", route: "material", viewport: "desktop-1366" },
  { file: "material-desktop-form-1366.png", route: "material-form", viewport: "desktop-1366" },
  { file: "material-desktop-detail-1366.png", route: "material-detail", viewport: "desktop-1366" },
  { file: "field-material-desktop-1440.png", route: "material", viewport: "desktop-1440" },
  { file: "field-material-desktop-1536.png", route: "summary", viewport: "desktop-1536" },
  { file: "field-material-desktop-1920.png", route: "master", viewport: "desktop-1920" },
  { file: "field-material-mobile-375.png", route: "material", viewport: "mobile-375" },
  { file: "field-material-mobile-414.png", route: "daily", viewport: "mobile-414" },
  { file: "field-material-mobile-430.png", route: "summary", viewport: "mobile-430" },
];

function routeUrl(projectId: string, route: string) {
  const root = `${baseUrl}/projects/${projectId}`;
  if (route.startsWith("material")) return `${root}/material-requests`;
  if (route === "daily") return `${root}/field-progress/daily`;
  if (route === "summary") return `${root}/field-progress/summary`;
  return `${root}/field-progress`;
}

async function loginAndResolveProject(browser: Browser): Promise<{ storageState: BrowserStorageState; projectId: string }> {
  const context = await browser.newContext({ viewport: viewports["desktop-1366"] });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').fill(process.env.QA_EMAIL || "admin@construction.local");
  await page.locator('input[name="password"]').fill(process.env.QA_PASSWORD || "123456");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard|\/projects/, { timeout: 15000 }).catch(() => undefined);
  await page.goto(`${baseUrl}/projects`, { waitUntil: "networkidle" });

  const projectId = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/projects/"]'));
    for (const link of links) {
      const id = link.getAttribute("href")?.split("/")[2];
      if (id && id !== "new") return id;
    }
    return "";
  });

  if (!projectId) {
    throw new Error("Cannot resolve a project id from /projects.");
  }

  const storageState = await context.storageState();
  await context.close();
  return { storageState, projectId };
}

async function createContext(browser: Browser, storageState: BrowserStorageState, viewportName: string): Promise<BrowserContext> {
  return browser.newContext({
    storageState,
    viewport: viewports[viewportName],
    deviceScaleFactor: 1,
  });
}

async function waitForSettledPage(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(700);
}

async function openMaterialForm(page: Page) {
  await page.getByRole("button", { name: /Tạo đề xuất|Tạo/i }).first().click();
  await waitForSettledPage(page);
}

async function openMaterialDetail(page: Page) {
  const detailButton = page.getByRole("button", { name: /Chi tiết/i }).first();
  if ((await detailButton.count()) === 0) return false;
  await detailButton.click();
  await waitForSettledPage(page);
  return true;
}

async function scanA11y(page: Page, route: string, viewport: string): Promise<A11yIssue[]> {
  return page.evaluate(`(() => {
      const routeName = ${JSON.stringify(route)};
      const viewportName = ${JSON.stringify(viewport)};
      const isVisible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };

      const issues = [];
      const fields = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea')).filter(isVisible);

      fields.forEach((el, index) => {
        const tag = el.tagName.toLowerCase();
        const id = el.getAttribute("id");
        const name = el.getAttribute("name");
        const ariaLabel = el.getAttribute("aria-label");
        const ariaLabelledBy = el.getAttribute("aria-labelledby");
        const wrappedByLabel = Boolean(el.closest("label"));
        const hasForLabel = id ? Boolean(document.querySelector('label[for="' + CSS.escape(id) + '"]')) : false;

        if (!id && !name) {
          issues.push({ route: routeName, viewport: viewportName, issue: tag + '[' + index + '] missing id or name' });
        }

        if (!ariaLabel && !ariaLabelledBy && !wrappedByLabel && !hasForLabel) {
          issues.push({ route: routeName, viewport: viewportName, issue: tag + '[' + index + '] has no associated label' });
        }
      });

      Array.from(document.querySelectorAll("button"))
        .filter(isVisible)
        .forEach((button, index) => {
          const accessibleName =
            button.getAttribute("aria-label") ||
            button.getAttribute("title") ||
            button.textContent?.trim();

          if (!accessibleName) {
            issues.push({ route: routeName, viewport: viewportName, issue: 'button[' + index + '] has no accessible name' });
          }
        });

      return issues;
    })()`);
}

async function scanResponsive(page: Page, route: string, viewport: string): Promise<ResponsiveCheck> {
  return page.evaluate(`(() => {
      const routeName = ${JSON.stringify(route)};
      const viewportName = ${JSON.stringify(viewport)};
      const body = document.body;
      const documentElement = document.documentElement;
      const clientWidth = documentElement.clientWidth;
      const bodyScrollWidth = Math.max(body.scrollWidth, documentElement.scrollWidth);

      const darkInputs = Array.from(document.querySelectorAll("input, select, textarea")).filter((el) => {
        const style = window.getComputedStyle(el);
        const rgb = style.backgroundColor.match(/\d+/g)?.map(Number) || [255, 255, 255];
        const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
        return brightness < 96;
      }).length;

      const whiteTextOnLightBackground = Array.from(document.querySelectorAll("body *")).filter((el) => {
        const style = window.getComputedStyle(el);
        const fg = style.color.match(/\d+/g)?.map(Number) || [0, 0, 0];
        const bg = style.backgroundColor.match(/\d+/g)?.map(Number) || [255, 255, 255];
        const fgBrightness = (fg[0] * 299 + fg[1] * 587 + fg[2] * 114) / 1000;
        const bgBrightness = (bg[0] * 299 + bg[1] * 587 + bg[2] * 114) / 1000;
        return fgBrightness > 245 && bgBrightness > 220;
      }).length;

      return {
        route: routeName,
        viewport: viewportName,
        url: window.location.href,
        bodyScrollWidth,
        clientWidth,
        hasPageHorizontalScroll: bodyScrollWidth > clientWidth + 2,
        darkInputs,
        whiteTextOnLightBackground,
      };
    })()`);
}

async function prepareRouteState(page: Page, route: string) {
  if (route === "material-form") {
    await openMaterialForm(page);
    return;
  }

  if (route === "material-detail") {
    const opened = await openMaterialDetail(page);
    if (!opened) {
      await openMaterialForm(page);
    }
  }
}

async function captureRequiredScreenshots(browser: Browser, storageState: BrowserStorageState, projectId: string) {
  const a11yIssues: A11yIssue[] = [];
  const responsiveChecks: ResponsiveCheck[] = [];

  fs.mkdirSync(screenshotDir, { recursive: true });

  for (const shot of requiredScreenshots) {
    const context = await createContext(browser, storageState, shot.viewport);
    const page = await context.newPage();
    const normalizedRoute = shot.route.replace("-form", "").replace("-detail", "");
    await page.goto(routeUrl(projectId, normalizedRoute), { waitUntil: "networkidle" });
    await waitForSettledPage(page);
    await prepareRouteState(page, shot.route);

    const filepath = path.join(screenshotDir, shot.file);
    await page.screenshot({ path: filepath, fullPage: true });
    a11yIssues.push(...(await scanA11y(page, shot.route, shot.viewport)));
    responsiveChecks.push(await scanResponsive(page, shot.route, shot.viewport));
    console.log(`Captured ${shot.file}`);
    await context.close();
  }

  const a11yText = [
    "FIELD MATERIAL FULL A11Y AUDIT",
    `Base URL: ${baseUrl}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    a11yIssues.length === 0
      ? "PASS: No visible field id/name/label or button accessible-name issues found in audited screens."
      : "FAIL: Visible accessibility issues found:",
    ...a11yIssues.map((issue) => `- [${issue.viewport}] ${issue.route}: ${issue.issue}`),
    "",
  ].join("\n");

  fs.writeFileSync(a11yReportPath, a11yText, "utf8");
  fs.writeFileSync(
    responsiveReportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        checks: responsiveChecks,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`A11y report saved: ${a11yReportPath}`);
  console.log(`Responsive report saved: ${responsiveReportPath}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const { storageState, projectId } = await loginAndResolveProject(browser);
    console.log(`Using project ${projectId}`);
    await captureRequiredScreenshots(browser, storageState, projectId);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("Screenshot UAT failed:", error);
  process.exit(1);
});
