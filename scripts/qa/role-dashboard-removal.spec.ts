import { expect, test, type Browser, type Page } from "@playwright/test";
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import type { UserRole } from "@prisma/client";

type FixtureManifest = {
  users: Record<string, { email: string; role: UserRole }>;
  projects: { A: string; B: string };
};

const manifest = JSON.parse(
  fs.readFileSync(
    path.resolve("artifacts/construction-supervisor-final/fixture-manifest-20260727.json"),
    "utf8",
  ),
) as FixtureManifest;

const password = process.env.QA_SUPERVISION_E2E_PASSWORD;
if (!password) throw new Error("QA_SUPERVISION_E2E_PASSWORD is required");

const cases = [
  { key: "ADMIN", role: "ADMIN", expected: "/dashboard", dashboard: true },
  { key: "REVIEWER", role: "DIRECTOR", expected: "/dashboard", dashboard: true },
  { key: "DEPUTY_DIRECTOR", role: "DEPUTY_DIRECTOR", expected: "/dashboard", dashboard: true },
  { key: "SUPERVISION_HEAD", role: "SUPERVISION_HEAD", expected: "/reports/weekly-inspection", dashboard: false },
  { key: "OFFICER_A", role: "CONSTRUCTION_SUPERVISOR", expected: "/reports/weekly-inspection", dashboard: false },
  { key: "CHIEF_COMMANDER", role: "CHIEF_COMMANDER", expected: "/projects", dashboard: false },
  { key: "MANAGER", role: "MANAGER", expected: "/projects", dashboard: false },
  { key: "ENGINEER", role: "ENGINEER", expected: "/tasks?mine=1", dashboard: false },
  { key: "STAFF", role: "STAFF", expected: "/tasks?mine=1", dashboard: false },
] as const;

async function authenticatedPage(browser: Browser, userKey: string) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const response = await context.request.post("/api/auth/login", {
    data: { email: manifest.users[userKey].email, password },
  });
  expect(response.status()).toBe(200);
  return { context, page: await context.newPage(), payload: await response.json() as { redirectTo: string } };
}

function watchRuntimeIssues(page: Page) {
  const issues: string[] = [];
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`console: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) issues.push(`http-${response.status()}: ${response.url()}`);
  });
  return issues;
}

test.describe("role-based dashboard removal", () => {
  for (const item of cases) {
    test(`${item.role}: login and /dashboard dispatch`, async ({ browser }) => {
      const { context, page, payload } = await authenticatedPage(browser, item.key);
      const runtimeIssues = watchRuntimeIssues(page);
      try {
        expect(payload.redirectTo).toBe(item.expected);
        await page.goto("/dashboard");
        await expect(page).toHaveURL(new RegExp(`${item.expected.replace(/[?]/g, "\\?")}$`));

        const dashboardLinks = page.locator('a[href="/dashboard"]');
        if (item.dashboard) {
          await expect(dashboardLinks).not.toHaveCount(0);
          await expect(page.locator('[data-app-sidebar] nav a[href="/dashboard"]')).toBeVisible();
        } else {
          await expect(dashboardLinks).toHaveCount(0);
          await expect(page.locator('[data-app-sidebar] nav a').first()).toHaveAttribute(
            "href",
            item.expected.split("?")[0] === "/reports/weekly-inspection" ? "/reports" : item.expected.split("?")[0],
          );
          await expect(page.locator('[data-app-bottom-nav] a').first()).toHaveAttribute(
            "href",
            item.expected.split("?")[0] === "/reports/weekly-inspection" ? "/reports" : item.expected.split("?")[0],
          );
        }

        await page.goto("/");
        await expect(page).toHaveURL(new RegExp(`${item.expected.replace(/[?]/g, "\\?")}$`));
        expect(runtimeIssues).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }

  test("STAFF ignores an unauthorized projectId without leaking project A", async ({ browser }) => {
    const { context, page } = await authenticatedPage(browser, "STAFF");
    const runtimeIssues = watchRuntimeIssues(page);
    try {
      await page.goto(`/tasks?mine=1&projectId=${manifest.projects.A}`);
      await expect(page.getByText("QA-CONSTRUCTION-SUPERVISOR-FINAL-PROJECT-A", { exact: true })).toHaveCount(0);
      await expect(page.locator("[data-app-content]")).toContainText("QA-CONSTRUCTION-SUPERVISOR-FINAL-PROJECT-B");
      expect(runtimeIssues).toEqual([]);
    } finally {
      await context.close();
    }
  });
});
