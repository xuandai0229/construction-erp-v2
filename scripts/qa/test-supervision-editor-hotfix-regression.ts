import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

config({ path: ".env" });

const baseUrl = process.env.SUPERVISION_QA_BASE_URL || "http://localhost:3000";
const artifactDir = path.resolve("docs/qa/artifacts/supervision-hotfix");

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });

  const [{ default: prisma }, { createSessionToken }] = await Promise.all([
    import("../../src/lib/prisma"),
    import("../../src/lib/session-token"),
  ]);

  const actor = await prisma.user.findFirst({
    where: { role: { in: ["SUPERVISION_HEAD", "ADMIN"] }, isActive: true, deletedAt: null },
    select: { id: true, role: true, email: true },
  });

  if (!actor) {
    throw new Error("No active SUPERVISION_HEAD or ADMIN user found for test.");
  }

  // Find or create draft dossier
  let dossier = await prisma.supervisionWeeklyDossier.findFirst({
    where: { createdById: actor.id, deletedAt: null, status: "DRAFT" },
    select: { id: true },
  });

  if (!dossier) {
    // Create new dossier
    const weekStart = new Date(2099, 5, 1);
    const dossierCreated = await prisma.supervisionWeeklyDossier.create({
      data: {
        weekStart,
        weekEnd: new Date(2099, 5, 7),
        nextWeekStart: new Date(2099, 5, 8),
        nextWeekEnd: new Date(2099, 5, 14),
        createdById: actor.id,
        version: 1,
      },
    });
    dossier = { id: dossierCreated.id };
  }

  const token = await createSessionToken(actor.id);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addCookies([
    {
      name: "auth_session",
      value: token,
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (err) => {
    console.error("PAGE ERROR:", err.message);
    pageErrors.push(err.message);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error("CONSOLE ERROR:", msg.text());
      consoleErrors.push(msg.text());
    }
  });

  const editUrl = `${baseUrl}/supervision/weekly/${dossier.id}/edit`;
  console.log(`Navigating to ${editUrl}...`);
  await page.goto(editUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Take initial desktop screenshot
  await page.screenshot({ path: path.join(artifactDir, "desktop_initial.png"), fullPage: false });

  // 1. Check layout overflow
  const hasHorizontalScrollbar = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  console.log(`Horizontal overflow check: ${hasHorizontalScrollbar ? "FAILED" : "PASSED"}`);

  // 2. Scroll down to trigger sticky toolbar
  await page.evaluate(() => {
    const sec4 = document.querySelector('[data-section="IV"]');
    if (sec4) sec4.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 1200, behavior: "instant" });
  });
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(artifactDir, "desktop_sticky_toolbar.png"), fullPage: false });

  // 3. Inspect sticky toolbar bounds relative to sidebar and app header
  const layoutCheck = await page.evaluate(() => {
    const sidebar = document.querySelector("aside") || document.querySelector('[data-sidebar="sidebar"]');
    const appHeader = document.querySelector("[data-app-header]") || document.querySelector("header");
    const stickyToolbar = document.querySelector(".sticky.top-\\[var\\(--app-header-h\\,56px\\)\\]");

    const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
    const headerRect = appHeader ? appHeader.getBoundingClientRect() : null;
    const toolbarRect = stickyToolbar ? stickyToolbar.getBoundingClientRect() : null;

    return {
      sidebarRect: sidebarRect ? { left: sidebarRect.left, right: sidebarRect.right, width: sidebarRect.width } : null,
      headerRect: headerRect ? { top: headerRect.top, bottom: headerRect.bottom, height: headerRect.height } : null,
      toolbarRect: toolbarRect ? { left: toolbarRect.left, right: toolbarRect.right, top: toolbarRect.top, width: toolbarRect.width } : null,
    };
  });

  console.log("Layout Geometry Check:", JSON.stringify(layoutCheck, null, 2));

  if (layoutCheck.toolbarRect && layoutCheck.sidebarRect) {
    if (layoutCheck.toolbarRect.left < layoutCheck.sidebarRect.right - 1) {
      console.error(`REGRESSION FAIL: Sticky toolbar overlaps sidebar! Toolbar Left: ${layoutCheck.toolbarRect.left}, Sidebar Right: ${layoutCheck.sidebarRect.right}`);
    } else {
      console.log("SUCCESS: Sticky toolbar is contained inside main layout and does NOT overlap sidebar!");
    }
  }

  // 4. Test Mobile view
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, "mobile_initial.png"), fullPage: false });

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, "mobile_scrolled.png"), fullPage: false });

  await browser.close();

  console.log(`Page errors: ${pageErrors.length}, Console errors: ${consoleErrors.length}`);
  if (pageErrors.length > 0) {
    throw new Error(`Runtime page errors detected: ${pageErrors.join("; ")}`);
  }
}

main().catch((err) => {
  console.error("Regression test failed:", err);
  process.exit(1);
});
